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

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large document processing

/**
 * POST /api/generate-flashcards-rag
 *
 * Body:
 * - documentId: string (ID from uploaded document)
 * - topic: string (optional - specific topic to focus on)
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
    const { documentId, topic, count = 15 } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // 5. Verify document ownership
    const supabase = await createClient()
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('clerk_user_id', userId)
      .single()

    if (docError || !document) {
      logger.warn('Document not found or unauthorized', { userId, documentId })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 6. Check vector store status
    const docStats = await getDocumentStats(documentId)
    if (!docStats.exists || docStats.chunkCount === 0) {
      logger.error('Document not indexed in vector store', { documentId })
      return NextResponse.json(
        { error: 'Document not yet indexed. Please wait for processing to complete.' },
        { status: 400 }
      )
    }

    logger.info('RAG flashcard generation started', {
      userId,
      documentId,
      chunkCount: docStats.chunkCount,
      topic: topic || 'general',
    })

    // 7. Retrieve relevant chunks using RAG
    let relevantChunks: string[]

    if (topic) {
      // Topic-specific retrieval
      const topicResults = await searchDocument(documentId, topic, 10)
      relevantChunks = topicResults.map((r) => r.text)
      logger.debug('Topic-based retrieval completed', {
        userId,
        documentId,
        topic,
        chunksRetrieved: relevantChunks.length,
      })
    } else {
      // General retrieval - get diverse sections
      // Query for different aspects to get comprehensive coverage
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

      relevantChunks = Array.from(uniqueChunks.values())
      logger.debug('General retrieval completed', {
        userId,
        documentId,
        chunksRetrieved: relevantChunks.length,
      })
    }

    if (relevantChunks.length === 0) {
      return NextResponse.json(
        { error: 'No relevant content found in document' },
        { status: 400 }
      )
    }

    // 8. Combine chunks into context (limit to reasonable size)
    const combinedText = relevantChunks.join('\n\n').substring(0, 48000) // ~12K tokens

    logger.debug('Combined context prepared', {
      userId,
      documentId,
      contextLength: combinedText.length,
    })

    // 9. Generate flashcards using RAG context
    const customOptions = {
      variation: 0,
      customPrompt: topic
        ? `Generate ${count} flashcards focused specifically on: ${topic}\n\nContext from document:\n\n${combinedText}`
        : `Generate ${count} comprehensive flashcards covering the most important concepts from this document:\n\n${combinedText}`,
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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profile) {
        const flashcardsToInsert = flashcards.map((card) => ({
          user_id: profile.id,
          document_id: documentId,
          front: card.front,
          back: card.back,
          mastery_level: 'learning' as const,
          confidence_score: 0,
          times_reviewed: 0,
          times_correct: 0,
        }))

        const { data: insertedCards, error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert)
          .select()

        if (!insertError && insertedCards) {
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
      }
    } catch (dbError) {
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
      chunksUsed: relevantChunks.length,
    })

    return NextResponse.json({
      flashcards: savedFlashcards,
      documentId,
      documentName: document.file_name,
      chunksUsed: relevantChunks.length,
      totalChunks: docStats.chunkCount,
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
