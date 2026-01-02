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
import { extractTextFromPages } from '@/lib/text-extraction'

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
      tags = [],
      selection
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
      .select('id, file_name, extracted_text, user_id, storage_path, metadata')
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

    // 8. Validate document has extracted text - or try to extract it on-demand
    let documentText = document.extracted_text

    if (!documentText || documentText.length === 0) {
      // Check if this is a PDF that might need on-demand extraction
      const isPDF = document.metadata?.file_type === 'application/pdf' ||
                    (document.file_name && document.file_name.toLowerCase().endsWith('.pdf'))

      if (isPDF && document.storage_path) {
        logger.info('Attempting on-demand PDF text extraction', { userId, documentId: document_id })

        try {
          // Download and extract text on-demand
          const { data: fileBlob, error: downloadError } = await supabase
            .storage
            .from('documents')
            .download(document.storage_path)

          if (!downloadError && fileBlob) {
            const arrayBuffer = await fileBlob.arrayBuffer()
            const pdfFile = new File([arrayBuffer], document.file_name, { type: 'application/pdf' })

            const { parseServerPDF } = await import('@/lib/server-pdf-parser')
            const result = await parseServerPDF(pdfFile)

            if (result.text && result.text.length > 0) {
              documentText = result.text

              // Update the document with the extracted text for future use
              await supabase
                .from('documents')
                .update({
                  extracted_text: result.text,
                  metadata: {
                    ...document.metadata,
                    has_extracted_text: true,
                    extraction_method: result.method || 'pdf-parse',
                    text_length: result.text.length,
                    page_count: result.pageCount,
                    on_demand_extraction: true,
                    extraction_timestamp: new Date().toISOString()
                  }
                })
                .eq('id', document_id)

              logger.info('On-demand PDF extraction successful', {
                userId,
                documentId: document_id,
                textLength: result.text.length,
                method: result.method
              })
            }
          }
        } catch (extractError) {
          logger.error('On-demand PDF extraction failed', extractError, { userId, documentId: document_id })
        }
      }

      // If still no text after extraction attempt
      if (!documentText || documentText.length === 0) {
        const isLargePdf = isPDF && document.metadata?.text_extraction_queued === true

        if (isLargePdf) {
          return NextResponse.json(
            {
              error: 'Document is still being processed',
              details: 'This large PDF is being processed in the background. Please try again in a few minutes.',
              suggestion: 'Large documents may take 1-2 minutes to process. You can check back shortly.'
            },
            { status: 202 } // 202 Accepted - processing in progress
          )
        }

        return NextResponse.json(
          {
            error: 'Document has no readable text content',
            details: 'This document appears to be a scanned PDF or image-based file that cannot be processed.',
            suggestion: 'Please upload a text-based document or use OCR software to convert scanned documents.'
          },
          { status: 400 }
        )
      }
    }

    // Update document reference to use the extracted text
    const extractedTextContent = documentText

    // 9. Determine selection mode and extract relevant text
    let contentText = ''
    let selectionDescription = 'full document'

    if (selection && selection.type === 'pages' && selection.pageRange) {
      // PAGE RANGE MODE: Extract text from specific pages
      const { start, end } = selection.pageRange
      selectionDescription = `pages ${start}-${end}`

      logger.info('Exam generation with page range', {
        userId,
        documentId: document_id,
        pageStart: start,
        pageEnd: end,
      })

      try {
        contentText = await extractTextFromPages(
          document_id,
          [{ start, end }],
          { maxLength: 48000 }
        )

        if (!contentText || contentText.trim().length === 0) {
          return NextResponse.json(
            {
              error: 'No content found in selected page range',
              suggestion: 'Try selecting "Full Document" or a different page range'
            },
            { status: 400 }
          )
        }

        logger.info('Page range extraction successful', {
          userId,
          documentId: document_id,
          pageRange: `${start}-${end}`,
          extractedLength: contentText.length,
        })
      } catch (error) {
        logger.error('Page range extraction failed', error, {
          userId,
          documentId: document_id,
          pageRange: `${start}-${end}`,
        })
        return NextResponse.json(
          {
            error: 'Failed to extract content from page range',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }

    } else if (selection && selection.type === 'chapters' && selection.chapterIds) {
      // CHAPTER MODE: Extract text from selected chapters
      const { chapterIds, chapters } = selection
      selectionDescription = `${chapterIds.length} selected chapters`

      logger.info('Exam generation with chapter selection', {
        userId,
        documentId: document_id,
        chapterCount: chapterIds.length,
      })

      try {
        const { extractChapterText } = await import('@/lib/chapter-extractor')
        const fullText = extractedTextContent || ''

        if (!fullText || fullText.trim().length === 0) {
          return NextResponse.json(
            { error: 'No text content available for chapter extraction' },
            { status: 400 }
          )
        }

        contentText = extractChapterText(fullText, chapters, chapterIds)

        if (!contentText || contentText.trim().length === 0) {
          return NextResponse.json(
            { error: 'No content found in selected chapters' },
            { status: 400 }
          )
        }

        // Truncate to token limit
        contentText = contentText.substring(0, 48000)

        logger.info('Chapter-based extraction successful', {
          userId,
          documentId: document_id,
          chapterIds,
          extractedLength: contentText.length,
        })
      } catch (error) {
        logger.error('Chapter extraction failed', error, {
          userId,
          documentId: document_id,
        })
        return NextResponse.json(
          {
            error: 'Failed to extract content from selected chapters',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }

    } else if (selection && selection.type === 'topic' && selection.topic) {
      // TOPIC MODE: Use the topic title and description as context
      const topicTitle = selection.topic.title
      const topicDescription = selection.topic.description || ''
      selectionDescription = `topic: ${topicTitle}`

      logger.info('Exam generation with topic selection', {
        userId,
        documentId: document_id,
        topic: topicTitle,
      })

      // For topics, we'll use page range from the topic if available
      if (selection.topic.pageRange) {
        const { start, end } = selection.topic.pageRange
        try {
          contentText = await extractTextFromPages(
            document_id,
            [{ start, end }],
            { maxLength: 48000 }
          )

          logger.info('Topic page range extraction successful', {
            userId,
            documentId: document_id,
            topic: topicTitle,
            pageRange: `${start}-${end}`,
            extractedLength: contentText.length,
          })
        } catch (error) {
          logger.warn('Topic page range extraction failed, using full text', error, {
            userId,
            documentId: document_id,
          })
          contentText = extractedTextContent.substring(0, 48000)
        }
      } else {
        // No page range, use full document
        contentText = extractedTextContent.substring(0, 48000)
      }

    } else {
      // FULL DOCUMENT MODE: Use full text
      selectionDescription = 'full document'
      contentText = extractedTextContent.substring(0, 48000)

      logger.info('Exam generation for full document', {
        userId,
        documentId: document_id,
      })
    }

    logger.info('Starting exam generation', {
      userId,
      documentId: document_id,
      fileName: document.file_name,
      questionCount: question_count,
      difficulty,
      selectionType: selection?.type || 'full',
      selectionDescription,
      textLength: contentText.length
    })

    // 10. Generate exam questions using AI
    const generationOptions: ExamGenerationOptions = {
      questionCount: question_count,
      difficulty: difficulty as ExamDifficulty,
      questionTypes: question_types as QuestionType[] | undefined,
      topics: topics as string[] | undefined,
      includeExplanations: include_explanations
    }

    const result = await generateExamQuestions(contentText, generationOptions)

    logger.info('Exam questions generated successfully', {
      userId,
      documentId: document_id,
      provider: result.provider,
      questionCount: result.questions.length
    })

    // 10b. Generate a unique, descriptive exam title based on topics
    const extractedTopics = result.questions
      .map(q => q.topic)
      .filter((topic): topic is string => !!topic && topic.trim() !== '')

    // Get unique topics and limit to top 3 for title
    const uniqueTopics = [...new Set(extractedTopics)]
    const topTopics = uniqueTopics.slice(0, 3)

    // Create a descriptive title
    let generatedTitle = title // Use user-provided title as fallback
    if (topTopics.length > 0) {
      const topicsString = topTopics.join(', ')
      // If user provided a generic title (contains "Practice Exam"), replace with descriptive one
      if (title.includes('Practice Exam') || title.includes('Mock Exam') || title.includes('Exam')) {
        const docName = document?.file_name?.replace(/\.[^/.]+$/, '') || 'Study'
        generatedTitle = `${docName}: ${topicsString}`
      }
    } else {
      // If no topics extracted, add timestamp for uniqueness
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (title.includes('Practice Exam') || title.includes('Mock Exam')) {
        generatedTitle = `${title} (${timestamp})`
      }
    }

    // 11. Track usage and cost
    const modelMap: Record<string, 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-pro' | 'deepseek-chat'> = {
      'deepseek': 'deepseek-chat',
      'openai': 'gpt-3.5-turbo',
      'claude': 'claude-3-5-sonnet',
      'gemini': 'gemini-1.5-pro'
    }

    const modelForCost = modelMap[result.provider] || 'gpt-3.5-turbo'
    const costEstimate = estimateRequestCost(modelForCost as any, contentText, 4000)
    trackUsage(userId, modelForCost as any, costEstimate.inputTokens, costEstimate.outputTokens)

    // 12. Create exam record in database
    const examData: ExamInsert = {
      user_id: profile.id,
      title: generatedTitle,
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
      logger.error('Failed to create exam record', examError, { userId, title: generatedTitle })
      return NextResponse.json(
        { error: 'Failed to create exam record' },
        { status: 500 }
      )
    }

    logger.info('Exam record created', { userId, examId: exam.id, title: generatedTitle })

    // 13. Save all questions to database
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
      selectionType: selection?.type || 'full',
      selectionDescription,
      textLength: contentText.length,
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
