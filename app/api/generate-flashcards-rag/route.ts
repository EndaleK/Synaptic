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

    // 6. Determine RAG strategy based on document size
    const { determineRAGStrategy } = await import('@/lib/document-indexer')
    const { isGeminiRAGAvailable, generateFlashcardsWithGeminiRAG } = await import('@/lib/gemini-rag')

    const documentText = document.extracted_text || ''
    const ragStrategy = documentText ? determineRAGStrategy(documentText) : 'chromadb'

    logger.info('RAG strategy selected for flashcards', {
      userId,
      documentId,
      strategy: ragStrategy,
      textLength: documentText.length,
      geminiAvailable: isGeminiRAGAvailable(),
    })

    // 6a. If Gemini strategy, use direct context window (bypass vector search)
    if (ragStrategy === 'gemini' && isGeminiRAGAvailable()) {
      logger.info('Using Gemini RAG for flashcard generation', { userId, documentId })

      try {
        // Extract topics from selection if provided
        const selectedTopics: string[] | undefined = selection?.type === 'topic' && selection.topic
          ? [selection.topic.title]
          : undefined

        const flashcards = await generateFlashcardsWithGeminiRAG(
          documentId,
          userId,
          count,
          selectedTopics
        )

        // Save flashcards to database
        const insertData = flashcards.map((card: any) => ({
          user_id: profile.id,
          document_id: documentId,
          front: card.front,
          back: card.back,
        }))

        const { data: savedFlashcards, error: saveError } = await supabase
          .from('flashcards')
          .insert(insertData)
          .select('id')

        if (saveError) throw saveError

        await incrementUsage(userId, 'flashcards')

        const duration = Date.now() - startTime

        logger.api('POST', '/api/generate-flashcards-rag', 200, duration, {
          userId,
          documentId,
          strategy: 'gemini',
          flashcardsGenerated: flashcards.length,
        })

        return NextResponse.json({
          flashcards: savedFlashcards?.map((f: any) => f.id) || [],
          count: flashcards.length,
          strategy: 'gemini',
          documentName: document.file_name,
        })
      } catch (geminiError: any) {
        logger.error('Gemini flashcard generation failed, falling back to ChromaDB', geminiError, {
          userId,
          documentId,
        })

        // Fall through to ChromaDB path below
        // Don't return error - try ChromaDB as fallback
      }
    }

    // 6b. ChromaDB strategy: If no extracted text, try to extract it now (for old documents or large files)
    if (!document.extracted_text && document.storage_path) {
      logger.info('No extracted text found, extracting on-demand', { userId, documentId })

      try {
        // Download file from storage
        const { data: fileBlob, error: downloadError } = await supabase
          .storage
          .from('documents')
          .download(document.storage_path)

        if (!downloadError && fileBlob) {
          // Convert Blob to File
          const arrayBuffer = await fileBlob.arrayBuffer()
          const file = new File([arrayBuffer], document.file_name, { type: 'application/pdf' })

          // Extract text using pdf2json
          const { parseServerPDF } = await import('@/lib/server-pdf-parser')
          const parseResult = await parseServerPDF(file)

          if (parseResult.text && parseResult.text.length > 0) {
            document.extracted_text = parseResult.text
            logger.info('On-demand extraction successful', {
              userId,
              documentId,
              textLength: parseResult.text.length,
              pageCount: parseResult.pageCount
            })

            // Save the extracted text to database for future use
            await supabase
              .from('documents')
              .update({
                extracted_text: parseResult.text,
                metadata: {
                  ...document.metadata,
                  page_count: parseResult.pageCount || document.metadata?.page_count,
                  extracted_on_demand: true
                }
              })
              .eq('id', documentId)
          } else {
            logger.warn('On-demand extraction yielded no text', { userId, documentId })
          }
        }
      } catch (extractError) {
        logger.error('On-demand extraction failed', extractError, { userId, documentId })
      }
    }

    // 7. Determine selection mode and extract relevant text
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

    } else if (selection && selection.type === 'chapters' && selection.chapterIds) {
      // CHAPTER MODE: Extract text from selected chapters only (lazy RAG)
      const { chapterIds, chapters } = selection
      selectionDescription = `${chapterIds.length} selected chapters`

      logger.info('Flashcard generation with chapter selection (lazy RAG)', {
        userId,
        documentId,
        chapterCount: chapterIds.length,
        requestedCount: count,
      })

      // Extract text from selected chapters
      try {
        const { extractChapterText } = await import('@/lib/chapter-extractor')
        const fullText = document.extracted_text || ''

        if (!fullText || fullText.trim().length === 0) {
          return NextResponse.json(
            { error: 'No text content available for chapter extraction' },
            { status: 400 }
          )
        }

        const fullChapterText = extractChapterText(fullText, chapters, chapterIds)

        if (!fullChapterText || fullChapterText.trim().length === 0) {
          return NextResponse.json(
            { error: 'No content found in selected chapters' },
            { status: 400 }
          )
        }

        logger.info('Chapter-based extraction successful', {
          userId,
          documentId,
          chapterIds,
          extractedLength: fullChapterText.length,
        })

        // For large chapters with high flashcard counts (>40), use batched generation
        // Each batch can handle ~40 flashcards worth of content (~48K chars)
        const CHARS_PER_BATCH = 48000
        const MAX_CARDS_PER_BATCH = 40

        if (fullChapterText.length > CHARS_PER_BATCH && count > MAX_CARDS_PER_BATCH) {
          // Calculate number of batches needed
          const numBatches = Math.min(
            Math.ceil(fullChapterText.length / CHARS_PER_BATCH),
            Math.ceil(count / MAX_CARDS_PER_BATCH)
          )
          const cardsPerBatch = Math.ceil(count / numBatches)

          logger.info('Using batched chapter processing for large flashcard count', {
            userId,
            documentId,
            totalChars: fullChapterText.length,
            numBatches,
            cardsPerBatch,
            totalRequestedCards: count,
          })

          // Generate flashcards from each batch
          const allFlashcards: any[] = []
          const existingTerms = new Set<string>()

          for (let i = 0; i < numBatches; i++) {
            const startChar = i * CHARS_PER_BATCH
            const endChar = Math.min((i + 1) * CHARS_PER_BATCH, fullChapterText.length)
            const batchText = fullChapterText.substring(startChar, endChar)

            // Skip if batch is too small
            if (batchText.trim().length < 500) continue

            const batchNum = i + 1
            const cardsThisBatch = Math.min(cardsPerBatch, count - allFlashcards.length)

            if (cardsThisBatch <= 0) break

            logger.debug(`Processing batch ${batchNum}/${numBatches}`, {
              userId,
              documentId,
              batchChars: batchText.length,
              cardsRequested: cardsThisBatch,
            })

            // Build prompt with existing terms to avoid duplicates
            const existingTermsList = existingTerms.size > 0
              ? `\n\n⚠️ AVOID creating flashcards for these already-covered terms: ${Array.from(existingTerms).slice(0, 50).join(', ')}`
              : ''

            const batchPrompt = `Generate ${cardsThisBatch} flashcards from this content (batch ${batchNum}/${numBatches}).

🚨 CRITICAL - Source Fidelity:
Use ONLY information from the content below. Do NOT add external knowledge.${existingTermsList}

Content (Section ${batchNum}/${numBatches}):

${batchText}`

            try {
              const batchResult = await generateFlashcardsAuto(batchText, {
                variation: 0,
                count: cardsThisBatch,
                customPrompt: batchPrompt,
              } as any)

              // Add to collection and track terms to avoid duplicates
              for (const card of batchResult.flashcards) {
                allFlashcards.push(card)
                // Extract key terms from front of card for deduplication
                const terms = card.front.toLowerCase().split(/\s+/).filter((t: string) => t.length > 4)
                terms.forEach((t: string) => existingTerms.add(t))
              }

              logger.debug(`Batch ${batchNum} completed`, {
                userId,
                documentId,
                cardsGenerated: batchResult.flashcards.length,
                totalSoFar: allFlashcards.length,
              })
            } catch (batchError) {
              logger.warn(`Batch ${batchNum} failed, continuing with other batches`, {
                userId,
                documentId,
                error: batchError instanceof Error ? batchError.message : 'Unknown',
              })
            }
          }

          if (allFlashcards.length === 0) {
            return NextResponse.json(
              { error: 'Failed to generate flashcards from chapter content' },
              { status: 500 }
            )
          }

          logger.info('Batched chapter flashcard generation complete', {
            userId,
            documentId,
            totalFlashcards: allFlashcards.length,
            requestedCount: count,
          })

          // Save all flashcards to database
          try {
            const flashcardsToInsert = allFlashcards.map((card) => ({
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

            if (insertError) {
              logger.error('Failed to save batched flashcards', insertError, { userId, documentId })
            }

            const savedFlashcards = insertedCards?.map((dbCard) => ({
              id: dbCard.id,
              front: dbCard.front,
              back: dbCard.back,
              createdAt: new Date(dbCard.created_at),
              masteryLevel: dbCard.mastery_level as 'learning' | 'reviewing' | 'mastered',
              confidenceScore: dbCard.confidence_score,
              timesReviewed: dbCard.times_reviewed,
              timesCorrect: dbCard.times_correct,
            })) || allFlashcards

            await incrementUsage(userId, 'flashcards')

            const duration = Date.now() - startTime
            logger.api('POST', '/api/generate-flashcards-rag', 200, duration, {
              userId,
              documentId,
              flashcardCount: savedFlashcards.length,
              selectionType: 'chapters-batched',
            })

            return NextResponse.json({
              flashcards: savedFlashcards,
              documentId,
              documentName: document.file_name,
              selection: selectionDescription,
              strategy: 'chapters-batched',
              batchCount: numBatches,
              aiProvider: 'auto',
            })
          } catch (dbError) {
            logger.error('Database save failed for batched flashcards', dbError, { userId, documentId })
            // Return unsaved flashcards
            return NextResponse.json({
              flashcards: allFlashcards,
              documentId,
              documentName: document.file_name,
              selection: selectionDescription,
              strategy: 'chapters-batched',
              warning: 'Flashcards generated but not saved to database',
            })
          }
        }

        // For smaller chapters or lower counts, use single batch (existing behavior)
        combinedText = fullChapterText.substring(0, CHARS_PER_BATCH)

      } catch (error) {
        logger.error('Chapter extraction failed', error, {
          userId,
          documentId,
        })
        return NextResponse.json(
          {
            error: 'Failed to extract content from selected chapters',
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
      count: count, // IMPORTANT: Pass count to generateFlashcardsAuto
      variation: 0,
      customPrompt: selection
        ? `Generate ${count} flashcards from ${selectionDescription}.${sourceFidelityInstruction}\n\nContent:\n\n${combinedText}`
        : legacyTopic
        ? `Generate ${count} flashcards focused specifically on: ${legacyTopic}${sourceFidelityInstruction}\n\nContext from document:\n\n${combinedText}`
        : `Generate ${count} comprehensive flashcards covering the most important concepts from this document.${sourceFidelityInstruction}\n\nContent:\n\n${combinedText}`,
    }

    logger.info('Calling generateFlashcardsAuto', {
      userId,
      documentId,
      requestedCount: count,
      contentLength: combinedText.length,
      selectionDescription,
    })

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
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError) {
        logger.error('Failed to fetch user profile', profileError, { userId })
      }

      if (profile) {
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

        const { data: insertedCards, error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert)
          .select()

        if (insertError) {
          logger.error('Failed to insert flashcards', insertError, { userId, documentId })
        }

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
      } else {
        logger.warn('No user profile found, flashcards will not be saved', { userId })
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
      selectionType: selection?.type || 'legacy',
      selectionDescription,
    })

    return NextResponse.json({
      flashcards: savedFlashcards,
      documentId,
      documentName: document.file_name,
      selection: selectionDescription,
      strategy: 'chromadb',
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
