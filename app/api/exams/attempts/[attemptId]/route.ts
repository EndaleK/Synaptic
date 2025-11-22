/**
 * API Route: Get Single Exam Attempt
 *
 * GET /api/exams/attempts/[attemptId]
 * Fetches a specific exam attempt with full details including exam and questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validateUUIDParam } from '@/lib/validation/uuid'

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { attemptId } = params

    // Validate UUID format
    try {
      validateUUIDParam(attemptId, 'Attempt ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // 2. Initialize Supabase client
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Fetch exam attempt with exam and questions
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', profile.id)
      .single()

    if (attemptError || !attempt) {
      logger.error('Exam attempt not found or access denied', attemptError, { userId, attemptId })
      return NextResponse.json(
        { error: 'Exam attempt not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Fetch associated exam with questions
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        exam_questions (*)
      `)
      .eq('id', attempt.exam_id)
      .single()

    if (examError || !exam) {
      logger.error('Exam not found for attempt', examError, { userId, attemptId, examId: attempt.exam_id })
      return NextResponse.json(
        { error: 'Associated exam not found' },
        { status: 404 }
      )
    }

    const duration = Date.now() - startTime

    logger.api('GET', `/api/exams/attempts/${attemptId}`, 200, duration, {
      userId,
      attemptId,
      examId: exam.id,
      questionCount: exam.exam_questions?.length || 0
    })

    return NextResponse.json({
      attempt,
      exam,
      message: 'Exam attempt retrieved successfully'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`GET /api/exams/attempts/${params.attemptId} error`, error, { userId, duration: `${duration}ms` })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.api('GET', `/api/exams/attempts/${params.attemptId}`, 500, duration, {
      userId,
      error: errorMessage
    })

    return NextResponse.json(
      {
        error: 'Failed to retrieve exam attempt',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
