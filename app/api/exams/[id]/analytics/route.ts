/**
 * API Route: Get Exam Analytics
 *
 * GET /api/exams/[id]/analytics
 * Fetches comprehensive analytics for a specific exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validateUUIDParam } from '@/lib/validation/uuid'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: examId } = params

    // Validate UUID format
    try {
      validateUUIDParam(examId, 'Exam ID')
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

    // 3. Verify exam ownership
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, user_id')
      .eq('id', examId)
      .eq('user_id', profile.id)
      .single()

    if (examError || !exam) {
      logger.error('Exam not found or access denied', examError, { userId, examId })
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Fetch all completed attempts for this exam
    const { data: attempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (attemptsError) {
      throw attemptsError
    }

    // 5. Fetch exam questions with analytics
    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('question_order')

    if (questionsError) {
      throw questionsError
    }

    // 6. Calculate analytics
    const analytics = calculateAnalytics(attempts || [], questions || [], exam.title)

    const duration = Date.now() - startTime

    logger.api('GET', `/api/exams/${examId}/analytics`, 200, duration, {
      userId,
      examId,
      attemptCount: attempts?.length || 0
    })

    return NextResponse.json({
      analytics,
      message: 'Analytics retrieved successfully'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`GET /api/exams/${params.id}/analytics error`, error, { userId, duration: `${duration}ms` })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.api('GET', `/api/exams/${params.id}/analytics`, 500, duration, {
      userId,
      error: errorMessage
    })

    return NextResponse.json(
      {
        error: 'Failed to retrieve analytics',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

function calculateAnalytics(attempts: any[], questions: any[], examTitle: string) {
  // Overall statistics
  const totalAttempts = attempts.length
  const averageScore = totalAttempts > 0
    ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
    : 0
  const highestScore = totalAttempts > 0
    ? Math.max(...attempts.map(a => a.score || 0))
    : 0
  const lowestScore = totalAttempts > 0
    ? Math.min(...attempts.map(a => a.score || 0))
    : 0
  const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0)
  const totalQuestions = attempts.reduce((sum, a) => sum + (a.total_questions || 0), 0)
  const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0

  // Format attempts for response
  const formattedAttempts = attempts.map(a => ({
    id: a.id,
    exam_id: a.exam_id,
    exam_title: examTitle,
    completed_at: a.completed_at,
    score: a.score || 0,
    correct_answers: a.correct_answers || 0,
    total_questions: a.total_questions || 0,
    time_taken_seconds: a.time_taken_seconds || 0
  }))

  // Calculate topic performance
  const topicStats: Record<string, { correct: number; total: number }> = {}

  attempts.forEach(attempt => {
    if (attempt.answers && Array.isArray(attempt.answers)) {
      attempt.answers.forEach((answer: any) => {
        const question = questions.find(q => q.id === answer.question_id)
        if (question && question.topic) {
          if (!topicStats[question.topic]) {
            topicStats[question.topic] = { correct: 0, total: 0 }
          }
          topicStats[question.topic].total++
          if (answer.is_correct) {
            topicStats[question.topic].correct++
          }
        }
      })
    }
  })

  const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
    topic,
    correct: stats.correct,
    total: stats.total,
    percentage: (stats.correct / stats.total) * 100
  }))

  // Calculate difficulty performance
  const difficultyStats: Record<string, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 }
  }

  attempts.forEach(attempt => {
    if (attempt.answers && Array.isArray(attempt.answers)) {
      attempt.answers.forEach((answer: any) => {
        const question = questions.find(q => q.id === answer.question_id)
        if (question && question.difficulty) {
          const difficulty = question.difficulty.toLowerCase()
          if (difficultyStats[difficulty]) {
            difficultyStats[difficulty].total++
            if (answer.is_correct) {
              difficultyStats[difficulty].correct++
            }
          }
        }
      })
    }
  })

  const difficultyPerformance = Object.entries(difficultyStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([difficulty, stats]) => ({
      difficulty,
      correct: stats.correct,
      total: stats.total,
      percentage: (stats.correct / stats.total) * 100
    }))

  // Calculate question-level analytics
  const questionStats: Record<string, { correct: number; total: number; question: any }> = {}

  attempts.forEach(attempt => {
    if (attempt.answers && Array.isArray(attempt.answers)) {
      attempt.answers.forEach((answer: any) => {
        const question = questions.find(q => q.id === answer.question_id)
        if (question) {
          if (!questionStats[question.id]) {
            questionStats[question.id] = { correct: 0, total: 0, question }
          }
          questionStats[question.id].total++
          if (answer.is_correct) {
            questionStats[question.id].correct++
          }
        }
      })
    }
  })

  const questionAnalytics = Object.values(questionStats).map(stats => ({
    question_id: stats.question.id,
    question_text: stats.question.question_text,
    topic: stats.question.topic,
    difficulty: stats.question.difficulty,
    total_attempts: stats.total,
    correct_attempts: stats.correct,
    success_rate: (stats.correct / stats.total) * 100
  }))

  return {
    attempts: formattedAttempts,
    topicPerformance,
    difficultyPerformance,
    questionAnalytics,
    overallStats: {
      totalAttempts,
      averageScore,
      highestScore,
      lowestScore,
      totalTimeSpent,
      averageTimePerQuestion
    }
  }
}
