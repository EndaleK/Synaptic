/**
 * API Route: /api/exams/adaptive
 *
 * POST: Start a new adaptive exam session
 * PUT: Submit an answer and get next question
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import {
  AdaptiveQuestion,
  AdaptiveState,
  AdaptiveExamConfig,
  initializeAdaptiveState,
  processAnswer,
  selectNextQuestion,
  calculateAdaptiveResults,
  serializeAdaptiveState,
  deserializeAdaptiveState,
  DifficultyLevel
} from '@/lib/adaptive-exam-engine'

export const runtime = 'nodejs'
export const maxDuration = 30

interface StartAdaptiveExamRequest {
  examId?: string              // Existing exam to make adaptive
  documentId?: string          // Generate new questions from document
  questionCount?: number       // Default: 15
  startingDifficulty?: DifficultyLevel
  timeLimitMinutes?: number
  topics?: string[]            // Focus on specific topics
}

interface SubmitAnswerRequest {
  sessionId: string
  questionId: string
  userAnswer: string
  timeSpentSeconds: number
}

/**
 * POST /api/exams/adaptive
 * Start a new adaptive exam session
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StartAdaptiveExamRequest = await req.json()
    const {
      examId,
      documentId,
      questionCount = 15,
      startingDifficulty = 'medium',
      timeLimitMinutes,
      topics
    } = body

    if (!examId && !documentId) {
      return NextResponse.json(
        { error: 'Either examId or documentId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    let questions: AdaptiveQuestion[] = []

    if (examId) {
      // Load questions from existing exam
      const { data: examQuestions, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_order')

      if (questionsError) {
        console.error('[AdaptiveExam] Error fetching questions:', questionsError)
        return NextResponse.json(
          { error: 'Failed to load exam questions' },
          { status: 500 }
        )
      }

      questions = (examQuestions || []).map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
        sourceReference: q.source_reference
      }))

      // Filter by topics if specified
      if (topics && topics.length > 0) {
        questions = questions.filter(q =>
          topics.some(t => q.topic.toLowerCase().includes(t.toLowerCase()))
        )
      }
    } else if (documentId) {
      // Generate questions from document
      // First check if exam questions already exist for this document
      const { data: existingExam } = await supabase
        .from('exams')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (existingExam) {
        // Load existing questions
        const { data: examQuestions } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', existingExam.id)

        questions = (examQuestions || []).map(q => ({
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'medium',
          sourceReference: q.source_reference
        }))
      } else {
        // Would need to generate questions - for now return error
        return NextResponse.json(
          { error: 'No exam found for this document. Create an exam first.' },
          { status: 400 }
        )
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions available for adaptive exam' },
        { status: 400 }
      )
    }

    // Shuffle questions
    questions = questions.sort(() => Math.random() - 0.5)

    // Limit to requested count
    if (questions.length > questionCount) {
      questions = questions.slice(0, questionCount)
    }

    // Initialize adaptive state
    const config: AdaptiveExamConfig = {
      totalQuestions: questions.length,
      startingDifficulty,
      consecutiveToIncrease: 3,
      consecutiveToDecrease: 2,
      enableTopicAdaptation: true,
      timeLimitMinutes
    }

    const state = initializeAdaptiveState(config)

    // Select first question
    const firstQuestion = selectNextQuestion(questions, state, config)

    if (!firstQuestion) {
      return NextResponse.json(
        { error: 'Failed to select first question' },
        { status: 500 }
      )
    }

    // Create session in database with proper UUID
    const sessionId = randomUUID()

    const { data: sessionData, error: sessionError } = await supabase
      .from('exam_attempts')
      .insert({
        id: sessionId,
        user_id: profile.id,
        exam_id: examId || null,
        mode: 'practice',
        status: 'in_progress',
        score: 0,
        correct_answers: 0,
        total_questions: questions.length,
        answers: [],
        started_at: new Date().toISOString(),
        time_limit_seconds: timeLimitMinutes ? timeLimitMinutes * 60 : null,
        // Store adaptive data
        adaptive_state: serializeAdaptiveState(state),
        adaptive_questions: questions.map(q => q.id),
        is_adaptive: true
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error('[AdaptiveExam] Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create exam session' },
        { status: 500 }
      )
    }

    // Return first question (without correct answer)
    const questionForClient = {
      id: firstQuestion.id,
      questionText: firstQuestion.questionText,
      questionType: firstQuestion.questionType,
      options: firstQuestion.options,
      topic: firstQuestion.topic,
      difficulty: firstQuestion.difficulty
    }

    return NextResponse.json({
      sessionId,
      totalQuestions: questions.length,
      currentQuestion: 1,
      question: questionForClient,
      currentDifficulty: state.currentDifficulty,
      timeLimitMinutes,
      startedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[AdaptiveExam] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to start adaptive exam' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/exams/adaptive
 * Submit an answer and get next question or results
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SubmitAnswerRequest = await req.json()
    const { sessionId, questionId, userAnswer, timeSpentSeconds } = body

    if (!sessionId || !questionId || userAnswer === undefined) {
      return NextResponse.json(
        { error: 'sessionId, questionId, and userAnswer are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get session with adaptive state
    const { data: session, error: sessionError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Exam already completed' },
        { status: 400 }
      )
    }

    // Deserialize adaptive state
    const state = deserializeAdaptiveState(session.adaptive_state)
    if (!state) {
      return NextResponse.json(
        { error: 'Invalid session state' },
        { status: 500 }
      )
    }

    // Get all questions for this session
    const questionIds = session.adaptive_questions || []
    const { data: allQuestions } = await supabase
      .from('exam_questions')
      .select('*')
      .in('id', questionIds)

    if (!allQuestions) {
      return NextResponse.json(
        { error: 'Failed to load questions' },
        { status: 500 }
      )
    }

    const questions: AdaptiveQuestion[] = allQuestions.map(q => ({
      id: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'medium',
      sourceReference: q.source_reference
    }))

    // Find the current question
    const currentQuestion = questions.find(q => q.id === questionId)
    if (!currentQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Process the answer
    const config: AdaptiveExamConfig = {
      totalQuestions: questions.length,
      consecutiveToIncrease: 3,
      consecutiveToDecrease: 2,
      enableTopicAdaptation: true
    }

    const { newState, isCorrect } = processAnswer(
      state,
      currentQuestion,
      userAnswer,
      timeSpentSeconds,
      config
    )

    // Update answers array
    const answers = [...(session.answers || []), {
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      time_spent: timeSpentSeconds
    }]

    // Check if exam is complete
    const answeredCount = newState.answeredQuestions.length
    const isComplete = answeredCount >= questions.length

    if (isComplete) {
      // Calculate final results
      const totalTime = answers.reduce((sum, a) => sum + (a.time_spent || 0), 0)
      const results = calculateAdaptiveResults(newState, totalTime)

      // Update session as completed
      await supabase
        .from('exam_attempts')
        .update({
          status: 'completed',
          score: results.weightedScore,
          correct_answers: results.correctAnswers,
          answers,
          adaptive_state: serializeAdaptiveState(newState),
          completed_at: new Date().toISOString(),
          time_taken_seconds: totalTime,
          topic_scores: results.topicPerformance
        })
        .eq('id', sessionId)

      // Update exam analytics
      for (const answer of answers) {
        try {
          await supabase.rpc('update_exam_analytics', {
            p_user_id: profile.id,
            p_question_id: answer.question_id,
            p_is_correct: answer.is_correct,
            p_time_spent: answer.time_spent || 0
          })
        } catch {
          // RPC might not exist, ignore
        }
      }

      return NextResponse.json({
        complete: true,
        lastAnswer: {
          questionId,
          isCorrect,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation
        },
        results
      })
    }

    // Select next question
    const nextQuestion = selectNextQuestion(questions, newState, config)

    // Update session
    await supabase
      .from('exam_attempts')
      .update({
        answers,
        adaptive_state: serializeAdaptiveState(newState),
        correct_answers: newState.answeredQuestions.filter(q => q.isCorrect).length
      })
      .eq('id', sessionId)

    // Return next question (without correct answer)
    const questionForClient = nextQuestion ? {
      id: nextQuestion.id,
      questionText: nextQuestion.questionText,
      questionType: nextQuestion.questionType,
      options: nextQuestion.options,
      topic: nextQuestion.topic,
      difficulty: nextQuestion.difficulty
    } : null

    return NextResponse.json({
      complete: false,
      lastAnswer: {
        questionId,
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation
      },
      currentQuestion: answeredCount + 1,
      totalQuestions: questions.length,
      question: questionForClient,
      currentDifficulty: newState.currentDifficulty,
      difficultyChanged: newState.currentDifficulty !== state.currentDifficulty,
      progress: {
        answered: answeredCount,
        correct: newState.answeredQuestions.filter(q => q.isCorrect).length,
        currentStreak: isCorrect ? newState.consecutiveCorrect : 0
      }
    })
  } catch (error) {
    console.error('[AdaptiveExam] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to process answer' },
      { status: 500 }
    )
  }
}
