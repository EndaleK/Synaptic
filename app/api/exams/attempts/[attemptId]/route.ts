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
    // For adaptive exams started from documentId, exam_id may be null
    let exam = null

    if (attempt.exam_id) {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          exam_questions (*)
        `)
        .eq('id', attempt.exam_id)
        .single()

      if (examError || !examData) {
        logger.error('Exam not found for attempt', examError, { userId, attemptId, examId: attempt.exam_id })
        return NextResponse.json(
          { error: 'Associated exam not found' },
          { status: 404 }
        )
      }

      exam = examData
    } else if (attempt.is_adaptive && attempt.adaptive_questions) {
      // For adaptive exams without a parent exam, fetch questions directly
      const questionIds = attempt.adaptive_questions

      const { data: questions } = await supabase
        .from('exam_questions')
        .select('*')
        .in('id', questionIds)

      // Extract unique topics from questions for a descriptive title
      const extractedTopics = (questions || [])
        .map(q => q.topic)
        .filter((topic): topic is string => !!topic && topic.trim() !== '')
      const uniqueTopics = [...new Set(extractedTopics)].slice(0, 3)

      // Try to get document name if questions have source_document_id
      let docName = 'Study Material'
      const sourceDocId = questions?.[0]?.source_document_id
      if (sourceDocId) {
        const { data: doc } = await supabase
          .from('documents')
          .select('file_name')
          .eq('id', sourceDocId)
          .single()
        if (doc?.file_name) {
          docName = doc.file_name.replace(/\.[^/.]+$/, '')
        }
      }

      // Create descriptive title
      const adaptiveTitle = uniqueTopics.length > 0
        ? `${docName}: ${uniqueTopics.join(', ')}`
        : `${docName} - Adaptive Exam`

      // Create a virtual exam object for the review mode
      exam = {
        id: null,
        title: adaptiveTitle,
        description: 'Adaptive difficulty exam that adjusts to your performance',
        difficulty: 'adaptive',
        question_count: questionIds.length,
        exam_questions: questions || [],
        created_at: attempt.started_at,
        updated_at: attempt.completed_at || attempt.started_at
      }
    }

    if (!exam) {
      logger.error('No exam data found for attempt', null, { userId, attemptId })
      return NextResponse.json(
        { error: 'No exam data found for this attempt' },
        { status: 404 }
      )
    }

    // 5. Fetch previous attempts for this exam (for comparison)
    // Only fetch if there's an associated exam_id
    let previousAttempts: any[] = []

    if (attempt.exam_id) {
      const { data: prevAttempts } = await supabase
        .from('exam_attempts')
        .select('id, score, correct_answers, total_questions, completed_at, time_taken_seconds')
        .eq('user_id', profile.id)
        .eq('exam_id', attempt.exam_id)
        .eq('status', 'completed')
        .neq('id', attemptId)
        .order('completed_at', { ascending: false })
        .limit(5)

      previousAttempts = prevAttempts || []
    }

    const duration = Date.now() - startTime

    logger.api('GET', `/api/exams/attempts/${attemptId}`, 200, duration, {
      userId,
      attemptId,
      examId: exam.id,
      questionCount: exam.exam_questions?.length || 0,
      previousAttemptsCount: previousAttempts?.length || 0
    })

    return NextResponse.json({
      attempt,
      exam,
      previousAttempts,
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
