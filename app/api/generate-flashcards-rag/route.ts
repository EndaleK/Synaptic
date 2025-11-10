/**
 * API Route: Generate Flashcards with RAG (Retrieval-Augmented Generation)
 *
 * For large documents (500MB+ textbooks):
 * 1. Use document ID to load from vector store
 * 2. Retrieve relevant chunks using semantic search
 * 3. Generate flashcards from most important sections only
 * 4. Much more memory-efficient than processing entire document
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { searchDocument, getDocumentStats } from '@/lib/vector-store'
import { generateFlashcardsAuto } from '@/lib/ai-provider'
import { logger } from '@/lib/logger'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-limits'
import { estimateRequestCost, trackUsage } from '@/lib/cost-estimator'
import { extractTextFromPages } from '@/lib/text-extraction'
import { createSSEStream, createSSEHeaders, ProgressTracker } from '@/lib/sse-utils'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large document processing

/**
 * POST /api/generate-flashcards-rag
 *
 * Body:
 * - documentId: string (ID from uploaded document)
 * - selection: object (optional - content selection)
 *   - type: 'full' | 'pages' | 'topic' | 'structure' | 'suggestion'
 *   - pageRange: { start: number, end: number } (for 'pages' type)
 *   - topic: { id, title, description, pageRange } (for 'topic' type)
 *   - sectionIds: string[] (for 'structure' type - selected book sections)
 *   - suggestionId: string (for 'suggestion' type - AI-recommended section)
 * - topic: string (optional - specific topic to focus on) [DEPRECATED: use selection instead]
 * - count: number (optional - number of flashcards to generate, default 15)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for RAG flashcard generation', { userId })
      return rateLimitResponse
    }

    // 3. Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'flashcards')
    if (!usageCheck.allowed) {
      logger.warn('RAG flashcard generation blocked - usage limit reached', {
        userId,
        tier: usageCheck.tier,
      })
      return NextResponse.json(
        {
          error: usageCheck.message,
          tier: usageCheck.tier,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    // 4. Parse request body
    const body = await request.json()
    const { documentId, selection, topic: legacyTopic, count = 15 } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // 5. Verify document ownership and get user profile
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      logger.warn('Document not found or unauthorized', { userId, documentId })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 6. Determine selection mode and extract relevant text
    let combinedText = ''
    let selectionDescription = ''
    let usedVectorStore = false

    if (selection && selection.type === 'pages' && selection.pageRange) {
      // PAGE RANGE MODE: Extract text from specific pages using smart extraction
      const { start, end } = selection.pageRange
      selectionDescription = `pages ${start}-${end}`

      logger.info('Flashcard generation with page range', {
        userId,
        documentId,
        pageStart: start,
        pageEnd: end,
      })

      // Use smart extraction with auto-expansion if content is insufficient
      try {
        combinedText = await extractTextFromPages(
          documentId,
          [{ start, end }],
          { maxLength: 48000 }
        )

        if (!combinedText || combinedText.trim().length === 0) {
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
          documentId,
          pageRange: `${start}-${end}`,
          extractedLength: combinedText.length,
        })
      } catch (error) {
        logger.error('Page range extraction failed', error, {
          userId,
          documentId,
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

    } else if ((selection && selection.type === 'topic') || legacyTopic) {
      // TOPIC MODE: Use vector search for topic-specific content
      const topicQuery = selection?.topic?.title || legacyTopic
      selectionDescription = `topic: ${topicQuery}`

      logger.info('Flashcard generation with topic', {
        userId,
        documentId,
        topic: topicQuery,
      })

      // Check vector store status
      const docStats = await getDocumentStats(documentId)
      if (!docStats.exists || docStats.chunkCount === 0) {
        logger.warn('Document not indexed, falling back to full text', { documentId })
        // Fallback to full document text
        combinedText = (document.extracted_text || '').substring(0, 48000)
      } else {
        // Topic-specific retrieval
        const topicResults = await searchDocument(documentId, topicQuery, 10)
        const relevantChunks = topicResults.map((r) => r.text)
        combinedText = relevantChunks.join('\n\n').substring(0, 48000)
        usedVectorStore = true

        logger.debug('Topic-based retrieval completed', {
          userId,
          documentId,
          topic: topicQuery,
          chunksRetrieved: relevantChunks.length,
        })
      }

    } else {
      // FULL DOCUMENT MODE: Use vector search for comprehensive coverage
      selectionDescription = 'full document'

      logger.info('Flashcard generation for full document', {
        userId,
        documentId,
      })

      // Check vector store status
      const docStats = await getDocumentStats(documentId)
      if (!docStats.exists || docStats.chunkCount === 0) {
        logger.warn('Document not indexed, using full text', { documentId })
        // Fallback to full document text
        combinedText = (document.extracted_text || '').substring(0, 48000)
      } else {
        // General retrieval - get diverse sections
        const queries = [
          'main concepts and key ideas',
          'important definitions and terminology',
          'examples and applications',
          'principles and theories',
          'procedures and processes',
        ]

        const allResults = await Promise.all(
          queries.map((query) => searchDocument(documentId, query, 3))
        )

        // Combine and deduplicate chunks
        const uniqueChunks = new Map<number, string>()
        allResults.forEach((results) => {
          results.forEach((result) => {
            uniqueChunks.set(result.chunkIndex, result.text)
          })
        })

        const relevantChunks = Array.from(uniqueChunks.values())
        combinedText = relevantChunks.join('\n\n').substring(0, 48000)
        usedVectorStore = true

        logger.debug('General retrieval completed', {
          userId,
          documentId,
          chunksRetrieved: relevantChunks.length,
        })
      }
    }

    // 7. Validate we have content to work with
    if (!combinedText || combinedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No relevant content found for flashcard generation' },
        { status: 400 }
      )
    }

    logger.debug('Content prepared for flashcard generation', {
      userId,
      documentId,
      selectionType: selection?.type || 'legacy',
      contentLength: combinedText.length,
      usedVectorStore,
    })

    // 8. Generate flashcards using selected content
    const sourceFidelityInstruction = `\n\n🚨 CRITICAL - Source Fidelity:\nUse ONLY information from the content below. Do NOT add external knowledge, definitions, or context from your training. Every flashcard must be verifiable against the provided text.`

    const customOptions = {
      variation: 0,
      customPrompt: selection
        ? `Generate ${count} flashcards from ${selectionDescription}.${sourceFidelityInstruction}\n\nContent:\n\n${combinedText}`
        : legacyTopic
        ? `Generate ${count} flashcards focused specifically on: ${legacyTopic}${sourceFidelityInstruction}\n\nContext from document:\n\n${combinedText}`
        : `Generate ${count} comprehensive flashcards covering the most important concepts from this document.${sourceFidelityInstruction}\n\nContent:\n\n${combinedText}`,
    }

    const result = await generateFlashcardsAuto(combinedText, customOptions as any)
    const flashcards = result.flashcards

    logger.info('RAG flashcards generated successfully', {
      userId,
      documentId,
      provider: result.provider,
      flashcardCount: flashcards.length,
    })

    // 10. Track usage
    const modelMap: Record<string, 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-pro' | 'deepseek-chat'> = {
      'deepseek': 'deepseek-chat',
      'openai': 'gpt-3.5-turbo',
      'claude': 'claude-3-5-sonnet',
      'gemini': 'gemini-1.5-pro',
    }

    const modelForCost = modelMap[result.provider] || 'gpt-3.5-turbo'
    const costEstimate = estimateRequestCost(
      modelForCost as any,
      combinedText,
      2000
    )
    trackUsage(
      userId,
      modelForCost as any,
      costEstimate.inputTokens,
      costEstimate.outputTokens
    )

    await incrementUsage(userId, 'flashcards')

    // 11. Save flashcards to database
    let savedFlashcards = flashcards
    try {
      console.log(`🔍 Looking up user profile for userId: ${userId}`)

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError) {
        console.error('❌ Failed to fetch user profile:', profileError)
      }

      if (profile) {
        console.log(`✅ Found user profile, ID: ${profile.id}`)
        // Determine source section metadata
        let sourceSection = null
        if (selection?.type === 'structure' && selection.sectionIds) {
          sourceSection = {
            type: 'structure',
            sectionIds: selection.sectionIds,
          }
        } else if (selection?.type === 'suggestion' && selection.suggestionId) {
          sourceSection = {
            type: 'suggestion',
            suggestionId: selection.suggestionId,
          }
        } else if (selection?.type === 'topic' && selection.topic) {
          sourceSection = {
            type: 'topic',
            topicId: selection.topic.id,
            topicTitle: selection.topic.title,
          }
        } else if (selection?.type === 'pages' && selection.pageRange) {
          sourceSection = {
            type: 'pages',
            pageRange: selection.pageRange,
          }
        }

        const flashcardsToInsert = flashcards.map((card) => ({
          user_id: profile.id,
          document_id: documentId,
          front: card.front,
          back: card.back,
          mastery_level: 'learning' as const,
          confidence_score: 0,
          times_reviewed: 0,
          times_correct: 0,
          // source_section: sourceSection, // TODO: Add this column to database schema
        }))

        console.log(`💾 Attempting to save ${flashcardsToInsert.length} flashcards to database...`)

        const { data: insertedCards, error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert)
          .select()

        if (insertError) {
          console.error('❌ Failed to insert flashcards:', insertError)
        }

        if (!insertError && insertedCards) {
          console.log(`✅ Successfully inserted ${insertedCards.length} flashcards`)
          savedFlashcards = insertedCards.map((dbCard) => ({
            id: dbCard.id,
            front: dbCard.front,
            back: dbCard.back,
            createdAt: new Date(dbCard.created_at),
            masteryLevel: dbCard.mastery_level as 'learning' | 'reviewing' | 'mastered',
            confidenceScore: dbCard.confidence_score,
            timesReviewed: dbCard.times_reviewed,
            timesCorrect: dbCard.times_correct,
            lastReviewedAt: dbCard.last_reviewed_at
              ? new Date(dbCard.last_reviewed_at)
              : undefined,
            nextReviewAt: dbCard.next_review_at
              ? new Date(dbCard.next_review_at)
              : undefined,
          }))

          logger.info('RAG flashcards saved to database', {
            userId,
            flashcardCount: savedFlashcards.length,
          })
        }
      } else {
        console.warn(`⚠️ No user profile found for userId: ${userId}, flashcards won't be saved`)
      }
    } catch (dbError) {
      console.error('❌ Database save failed for RAG flashcards:', dbError)
      logger.error('Database save failed for RAG flashcards', dbError, {
        userId,
        documentId,
      })
      // Continue with non-persisted flashcards
    }

    const duration = Date.now() - startTime

    logger.api('POST', '/api/generate-flashcards-rag', 200, duration, {
      userId,
      documentId,
      flashcardCount: savedFlashcards.length,
      selectionType: selection?.type || 'legacy',
      selectionDescription,
    })

    return NextResponse.json({
      flashcards: savedFlashcards,
      documentId,
      documentName: document.file_name,
      selection: selectionDescription,
      usedVectorStore,
      aiProvider: result.provider,
      providerReason: result.providerReason,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('RAG flashcard generation failed', error, {
      userId,
      duration: `${duration}ms`,
    })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.api('POST', '/api/generate-flashcards-rag', 500, duration, {
      userId,
      error: errorMessage,
    })

    return NextResponse.json(
      { error: `Failed to generate flashcards: ${errorMessage}` },
      { status: 500 }
    )
  }
}
