/**
 * API Route: Generate Exam Questions from Document
 *
 * POST /api/generate-exam
 * Generates exam questions from a document using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateExamQuestions, type ExamGenerationOptions } from '@/lib/exam-generator'
import type { ExamInsert, ExamQuestionInsert, QuestionType, ExamDifficulty } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { estimateRequestCost, trackUsage } from '@/lib/cost-estimator'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-limits'

export const maxDuration = 300 // 5 minutes for complex exams

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined

  try {
    // 1. Authenticate user
    const authResult = await auth()
    userId = authResult.userId ?? undefined
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Apply rate limiting (AI endpoints - 10 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for exam generation', { userId })
      return rateLimitResponse
    }

    // 3. Check usage limits for exam creation
    const usageCheck = await checkUsageLimit(userId, 'exams')
    if (!usageCheck.allowed) {
      logger.warn('Exam creation limit reached', {
        userId,
        tier: usageCheck.tier,
        used: usageCheck.used,
        limit: usageCheck.limit
      })
      return NextResponse.json(
        {
          error: 'Exam creation limit reached',
          message: usageCheck.message,
          tier: usageCheck.tier,
          used: usageCheck.used,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining
        },
        { status: 403 }
      )
    }

    // 4. Parse request body
    const body = await request.json()
    const {
      document_id,
      title,
      description,
      question_count = 10,
      difficulty = 'mixed',
      question_types,
      time_limit_minutes,
      topics,
      include_explanations = true,
      tags = []
    } = body

    // 5. Validate required fields
    if (!document_id) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    if (question_count < 1 || question_count > 200) {
      return NextResponse.json(
        { error: 'question_count must be between 1 and 200' },
        { status: 400 }
      )
    }

    // 6. Initialize Supabase client
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

    // 7. Verify document ownership and get content
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', document_id)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      logger.error('Document not found or access denied', docError, { userId, document_id })
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 8. Validate document has extracted text
    if (!document.extracted_text || document.extracted_text.length === 0) {
      return NextResponse.json(
        { error: 'Document has no readable text content. Please upload a text-based document.' },
        { status: 400 }
      )
    }

    logger.info('Starting exam generation', {
      userId,
      documentId: document_id,
      fileName: document.file_name,
      questionCount: question_count,
      difficulty,
      textLength: document.extracted_text.length
    })

    // 9. Generate exam questions using AI
    const generationOptions: ExamGenerationOptions = {
      questionCount: question_count,
      difficulty: difficulty as ExamDifficulty,
      questionTypes: question_types as QuestionType[] | undefined,
      topics: topics as string[] | undefined,
      includeExplanations: include_explanations
    }

    const result = await generateExamQuestions(document.extracted_text, generationOptions)

    logger.info('Exam questions generated successfully', {
      userId,
      documentId: document_id,
      provider: result.provider,
      questionCount: result.questions.length
    })

    // 10. Track usage and cost
    const modelMap: Record<string, 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-pro' | 'deepseek-chat'> = {
      'deepseek': 'deepseek-chat',
      'openai': 'gpt-3.5-turbo',
      'claude': 'claude-3-5-sonnet',
      'gemini': 'gemini-1.5-pro'
    }

    const modelForCost = modelMap[result.provider] || 'gpt-3.5-turbo'
    const costEstimate = estimateRequestCost(modelForCost as any, document.extracted_text, 4000)
    trackUsage(userId, modelForCost as any, costEstimate.inputTokens, costEstimate.outputTokens)

    // 11. Create exam record in database
    const examData: ExamInsert = {
      user_id: profile.id,
      title,
      description: description || null,
      document_id: document_id,
      question_source: 'document',
      question_count: result.questions.length,
      difficulty: difficulty as ExamDifficulty,
      time_limit_minutes: time_limit_minutes || null,
      is_template: false,
      tags: tags || []
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single()

    if (examError || !exam) {
      logger.error('Failed to create exam record', examError, { userId, title })
      return NextResponse.json(
        { error: 'Failed to create exam record' },
        { status: 500 }
      )
    }

    logger.info('Exam record created', { userId, examId: exam.id, title })

    // 12. Save all questions to database
    const questionsToInsert: ExamQuestionInsert[] = result.questions.map((q, index) => ({
      exam_id: exam.id,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      options: q.options || null,
      explanation: q.explanation || null,
      source_reference: q.source_reference || null,
      source_document_id: document_id,
      difficulty: q.difficulty || 'medium',
      topic: q.topic || null,
      tags: [],
      question_order: index
    }))

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('exam_questions')
      .insert(questionsToInsert)
      .select()

    if (questionsError || !insertedQuestions) {
      logger.error('Failed to save exam questions', questionsError, { userId, examId: exam.id })

      // Rollback: Delete the exam since questions failed to save
      await supabase.from('exams').delete().eq('id', exam.id)

      return NextResponse.json(
        { error: 'Failed to save exam questions' },
        { status: 500 }
      )
    }

    logger.info('Exam questions saved to database', {
      userId,
      examId: exam.id,
      questionCount: insertedQuestions.length
    })

    // 13. Increment usage counter for exam creation
    await incrementUsage(userId, 'exams')

    // 14. Return complete exam with questions
    const duration = Date.now() - startTime

    logger.api('POST', '/api/generate-exam', 200, duration, {
      userId,
      examId: exam.id,
      questionCount: insertedQuestions.length,
      textLength: document.extracted_text.length,
      provider: result.provider
    })

    return NextResponse.json({
      exam: {
        ...exam,
        exam_questions: insertedQuestions
      },
      questionCount: insertedQuestions.length,
      aiProvider: result.provider,
      providerReason: result.providerReason,
      message: 'Exam generated successfully'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('POST /api/generate-exam error', error, { userId, duration: `${duration}ms` })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.api('POST', '/api/generate-exam', 500, duration, {
      userId,
      error: errorMessage
    })

    return NextResponse.json(
      {
        error: 'Failed to generate exam',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
