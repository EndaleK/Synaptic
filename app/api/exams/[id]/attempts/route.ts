/**
 * API Route: Exam Attempt Operations
 *
 * GET /api/exams/[id]/attempts - Fetch all attempts for an exam
 * POST /api/exams/[id]/attempts - Start a new exam attempt
 * PUT /api/exams/[id]/attempts - Update an in-progress attempt (submit answers, complete exam)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { ExamAttemptInsert, ExamAnswer } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Verify exam ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('id, user_id')
      .eq('id', examId)
      .eq('user_id', profile.id)
      .single()

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Fetch all attempts for this exam
    const { data: attempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false })

    if (attemptsError) {
      logger.error('Error fetching exam attempts', attemptsError, { userId, examId })
      return NextResponse.json(
        { error: 'Failed to fetch exam attempts' },
        { status: 500 }
      )
    }

    logger.debug('Fetched exam attempts', { userId, examId, count: attempts?.length || 0 })

    return NextResponse.json({
      attempts: attempts || []
    })

  } catch (error) {
    logger.error('GET /api/exams/[id]/attempts error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attempts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Verify exam exists and get details
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        user_id,
        question_count,
        time_limit_minutes
      `)
      .eq('id', examId)
      .eq('user_id', profile.id)
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Parse request body
    const body = await request.json()
    const { mode = 'timed' } = body

    // 4. Create new exam attempt
    const attemptData: ExamAttemptInsert = {
      user_id: profile.id,
      exam_id: examId,
      mode,
      total_questions: exam.question_count,
      time_limit_seconds: exam.time_limit_minutes ? exam.time_limit_minutes * 60 : null,
      answers: [], // Empty answers array initially
      status: 'in_progress'
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert(attemptData)
      .select()
      .single()

    if (attemptError || !attempt) {
      logger.error('Failed to create exam attempt', attemptError, { userId, examId })
      return NextResponse.json(
        { error: 'Failed to start exam attempt' },
        { status: 500 }
      )
    }

    logger.info('Exam attempt started', { userId, examId, attemptId: attempt.id, mode })

    return NextResponse.json({
      attempt,
      message: 'Exam attempt started successfully'
    })

  } catch (error) {
    logger.error('POST /api/exams/[id]/attempts error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start exam attempt' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      attempt_id,
      answers,
      status,
      time_taken_seconds
    } = body

    if (!attempt_id) {
      return NextResponse.json(
        { error: 'attempt_id is required' },
        { status: 400 }
      )
    }

    // 3. Verify attempt ownership
    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, user_id, total_questions, answers')
      .eq('id', attempt_id)
      .eq('user_id', profile.id)
      .eq('exam_id', examId)
      .single()

    if (!existingAttempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Build update object
    const updateData: Record<string, any> = {}

    if (answers !== undefined) {
      updateData.answers = answers
    }

    if (status !== undefined) {
      updateData.status = status

      // If completing exam, calculate score
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()

        if (time_taken_seconds !== undefined) {
          updateData.time_taken_seconds = time_taken_seconds
        }

        // Calculate score from answers
        const examAnswers = answers || existingAttempt.answers
        const correctCount = (examAnswers as ExamAnswer[]).filter(a => a.is_correct).length
        const totalQuestions = existingAttempt.total_questions

        updateData.correct_answers = correctCount
        updateData.score = (correctCount / totalQuestions) * 100
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    // 5. Update exam attempt
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('exam_attempts')
      .update(updateData)
      .eq('id', attempt_id)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update exam attempt', updateError, { userId, examId, attemptId: attempt_id })
      return NextResponse.json({ error: 'Failed to update exam attempt' }, { status: 500 })
    }

    logger.info('Exam attempt updated', {
      userId,
      examId,
      attemptId: attempt_id,
      status: updateData.status,
      score: updateData.score
    })

    return NextResponse.json({
      attempt: updatedAttempt,
      message: status === 'completed' ? 'Exam completed successfully' : 'Exam attempt updated successfully'
    })

  } catch (error) {
    logger.error('PUT /api/exams/[id]/attempts error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update exam attempt' },
      { status: 500 }
    )
  }
}
