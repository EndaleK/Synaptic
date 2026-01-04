/**
 * API Route: Chat with RAG (Retrieval-Augmented Generation)
 *
 * For large documents (500MB+ textbooks):
 * 1. Use document ID to load from vector store
 * 2. Retrieve relevant chunks for the user's question
 * 3. Provide context-aware answers without loading entire document
 * 4. Memory-efficient for massive PDFs
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { searchDocumentWithRerank, getDocumentStats } from '@/lib/vector-store'
import { getUserProfile, getUserLearningProfile } from '@/lib/supabase/user-profile'
import { personalizePrompt, createLearningProfile, type LearningProfile } from '@/lib/personalization/personalization-engine'
import type { LearningStyle, TeachingStylePreference } from '@/lib/supabase/types'
import { getProviderForFeature } from '@/lib/ai'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { estimateRequestCost, trackUsage } from '@/lib/cost-estimator'
import { ChatMessageSchema } from '@/lib/validation'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-limits'
import { routeQuery, type QueryBackend } from '@/lib/query-router'
import { getIndexingStatus } from '@/lib/progressive-indexer'
import { logRetrievalEvent, createRetrievalEvent } from '@/lib/retrieval-monitor'

interface ChatRAGRequest {
  message: string
  documentId: string
  teachingMode?: 'socratic' | 'direct' | 'mixed'
}

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes - needed for on-demand document indexing

/**
 * POST /api/chat-rag
 *
 * Body:
 * - message: string (user's question)
 * - documentId: string (ID of uploaded document)
 * - teachingMode: 'socratic' | 'direct' | 'mixed' (optional)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated RAG chat request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for RAG chat', { userId })
      return rateLimitResponse
    }

    // 2.5. Check chat message usage limit (NEW - Nov 14, 2025: 50 messages/month for free tier)
    const usageCheck = await checkUsageLimit(userId, 'chat_messages')
    if (!usageCheck.allowed) {
      logger.warn("RAG chat message limit exceeded", {
        userId,
        used: usageCheck.used,
        limit: usageCheck.limit
      })
      return NextResponse.json(
        {
          error: usageCheck.message || 'Monthly chat limit reached',
          used: usageCheck.used,
          limit: usageCheck.limit,
          upgradeUrl: '/pricing'
        },
        { status: 403 }
      )
    }

    // 3. Validate input
    const body: ChatRAGRequest = await request.json()

    try {
      ChatMessageSchema.parse({
        message: body.message,
        mode: body.teachingMode,
      })
    } catch (validationError: any) {
      logger.warn('RAG chat validation failed', { userId, error: validationError })
      return NextResponse.json(
        { error: `Validation failed: ${validationError.message}` },
        { status: 400 }
      )
    }

    const { message, documentId, teachingMode } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // 4. Verify document ownership
    const supabase = await createClient()

    // First get user profile to get the internal user_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      logger.warn('User profile not found', { userId })
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Then query document using profile.id
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

    // 5. Use query router to determine optimal backend (Gemini vs Pinecone)
    const { determineRAGStrategy } = await import('@/lib/document-indexer')
    const { isGeminiRAGAvailable, queryDocumentWithGemini } = await import('@/lib/gemini-rag')

    const documentText = document.extracted_text || ''

    // Get routing decision based on query intent and document state
    const routingDecision = await routeQuery(documentId, message, userId)

    // Check progressive indexing status
    const indexingStatus = await getIndexingStatus(documentId)
    const canChat = indexingStatus?.canChat || false
    const isFullyIndexed = indexingStatus?.phase === 'completed' || document.rag_indexed === true

    logger.info('RAG strategy selected via query router', {
      userId,
      documentId,
      backend: routingDecision.backend,
      intent: routingDecision.intent,
      confidence: routingDecision.confidence,
      textLength: documentText.length,
      geminiAvailable: isGeminiRAGAvailable(),
      canChat,
      isFullyIndexed,
      indexingProgress: indexingStatus?.percentComplete,
    })

    // 5a. If Gemini backend selected, use direct context window (no vector search)
    if (routingDecision.backend === 'gemini' && isGeminiRAGAvailable()) {
      logger.info('Using Gemini RAG with 2M token context window', {
        userId,
        documentId,
        intent: routingDecision.intent,
        reason: routingDecision.reason,
      })

      try {
        // Map teaching mode to Gemini format
        const geminiTeachingMode = teachingMode === 'socratic'
          ? 'socratic'
          : teachingMode === 'direct'
          ? 'direct'
          : 'guided'

        const aiResponse = await queryDocumentWithGemini(
          documentId,
          userId,
          message,
          [], // No conversation history support yet
          geminiTeachingMode
        )

        const duration = Date.now() - startTime

        logger.api('POST', '/api/chat-rag', 200, duration, {
          userId,
          documentId,
          strategy: 'gemini',
          messageLength: message.length,
          responseLength: aiResponse.length,
        })

        return NextResponse.json({
          response: aiResponse,
          timestamp: new Date().toISOString(),
          strategy: 'gemini',
          documentName: document.file_name,
        })
      } catch (geminiError: any) {
        logger.error('Gemini RAG failed', geminiError, {
          userId,
          documentId,
          errorMessage: geminiError.message,
        })

        // If Gemini returned an empty response or was blocked, return a helpful message
        if (geminiError.message?.includes('empty response') || geminiError.message?.includes('blocked')) {
          return NextResponse.json({
            response: "I'm having trouble generating a response for this request. This might be due to content restrictions or the complexity of the request. Please try rephrasing your question or asking something more specific.",
            timestamp: new Date().toISOString(),
            strategy: 'gemini',
            documentName: document.file_name,
            error: 'generation_failed',
          })
        }

        // Fall through to ChromaDB path below
        // Don't return error - try ChromaDB as fallback
      }
    }

    // 5b. Pinecone/hybrid strategy: Check indexing status and handle progressive indexing
    const docStats = await getDocumentStats(documentId)

    // Check if we need to start indexing
    if (!docStats.exists || docStats.chunkCount === 0) {
      // Check if indexing is already in progress
      if (indexingStatus && ['priority_indexing', 'full_indexing'].includes(indexingStatus.phase)) {
        // Indexing is in progress - inform user about progress
        logger.info('Document indexing in progress', {
          documentId,
          phase: indexingStatus.phase,
          progress: indexingStatus.percentComplete,
        })

        if (canChat) {
          // Priority chunks are ready - allow chat with partial index
          logger.info('Using partial index for chat (priority chunks ready)', { documentId })
        } else {
          // Not ready yet - show progress
          return NextResponse.json({
            response: `Your document is being indexed... ${indexingStatus.percentComplete}% complete. Chat will be available shortly once priority sections are indexed.`,
            timestamp: new Date().toISOString(),
            indexingInProgress: true,
            indexingProgress: indexingStatus.percentComplete,
            estimatedTimeRemaining: indexingStatus.estimatedTimeRemaining,
          })
        }
      } else {
        // No indexing started - trigger V2 progressive indexing for large documents
        logger.info('Document not indexed, triggering on-demand indexing', { documentId })

        // Import V2 indexing functions
        const { startV2Indexing, indexDocumentForRAG } = await import('@/lib/document-indexer')

        // First, quickly check document size to decide between V2 workers or direct indexing
        // For large files (>1MB), use V2 progressive indexing to avoid timeouts
        const fileSizeBytes = document.file_size || 0
        const useV2 = fileSizeBytes > 1 * 1024 * 1024 // 1MB threshold for V2

        if (useV2) {
          // Use V2 split workers for large documents
          logger.info('Using V2 progressive indexing for large document', {
            documentId,
            fileSizeMB: (fileSizeBytes / 1024 / 1024).toFixed(2),
          })

          const v2Result = await startV2Indexing(documentId, userId)

          if (!v2Result.success) {
            logger.error('V2 indexing failed to start', {
              documentId,
              error: v2Result.error,
            })

            // Provide helpful error message
            const errorMessage = v2Result.error?.includes('too large')
              ? `This PDF is too large for text extraction. ${v2Result.error}`
              : v2Result.error?.includes('scanned') || v2Result.error?.includes('OCR')
              ? `This appears to be a scanned PDF. ${v2Result.error}`
              : `Failed to prepare document for chat: ${v2Result.error || 'Unknown error'}. Please try re-uploading.`

            return NextResponse.json(
              {
                response: errorMessage,
                timestamp: new Date().toISOString(),
                error: true,
              },
              { status: 200 }
            )
          }

          // V2 indexing dispatched - inform user that progressive indexing has started
          return NextResponse.json({
            response: `I'm indexing your document now. This large document is being processed in the background with priority indexing - you'll be able to start chatting in about 1-2 minutes once the first section is ready. Please try your question again shortly!`,
            timestamp: new Date().toISOString(),
            indexingInProgress: true,
            indexingProgress: 5,
            dispatchedV2: true,
          })
        }

        // For smaller documents, use direct indexing (faster, no worker overhead)
        const indexResult = await indexDocumentForRAG(documentId, userId)

        if (!indexResult.success) {
          logger.error('Document indexing failed', {
            documentId,
            error: indexResult.error,
          })

          // Provide helpful error message
          const errorMessage = indexResult.error?.includes('too large')
            ? `This PDF is too large for automatic text extraction. ${indexResult.error}`
            : indexResult.error?.includes('scanned') || indexResult.error?.includes('OCR')
            ? `This appears to be a scanned PDF. ${indexResult.error}`
            : `Failed to prepare document for chat: ${indexResult.error || 'Unknown error'}. Please try re-uploading the document.`

          return NextResponse.json(
            {
              response: errorMessage,
              timestamp: new Date().toISOString(),
              error: true,
            },
            { status: 200 }
          )
        }

        logger.info('Document indexed successfully for RAG', {
          documentId,
          chunks: indexResult.chunks,
        })

        // Return success message indicating document is ready
        return NextResponse.json({
          response: `I've indexed your document and it's now ready for chat! It has been split into ${indexResult.chunks} chunks for efficient retrieval. Please send your question again to continue.`,
          timestamp: new Date().toISOString(),
          indexed: true,
          chunks: indexResult.chunks,
        })
      }
    }

    logger.info('RAG chat started', {
      userId,
      documentId,
      chunkCount: docStats.chunkCount,
      question: message.substring(0, 100),
    })

    // 6. Retrieve relevant chunks using semantic search with Cohere reranking
    // Detect comprehensive questions that need more context (overview, list all, etc.)
    const isComprehensiveQuery = /how many|list all|all the|complete list|entire|everything|overview|summary|what (topics|chapters|sections|specialties)/i.test(message)

    // For comprehensive queries, retrieve more results to cover more ground
    // For focused queries, use standard retrieval to keep context focused
    const initialTopK = isComprehensiveQuery ? 50 : 25
    const finalTopK = isComprehensiveQuery ? 15 : 7

    logger.debug('RAG retrieval config', {
      isComprehensiveQuery,
      initialTopK,
      finalTopK,
      query: message.substring(0, 50),
    })

    // Retrieves results from Pinecone, reranks with Cohere
    // Reranking filters out semantically similar but irrelevant chunks
    const relevantChunks = await searchDocumentWithRerank(documentId, message, {
      initialTopK,
      finalTopK,
      userId,           // For ownership verification
    })

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        response: `I couldn't find relevant information in the document to answer your question: "${message}". Try rephrasing your question or asking about a different topic covered in the document.`,
        timestamp: new Date().toISOString(),
        chunksUsed: 0,
      })
    }

    const wasReranked = relevantChunks[0]?.wasReranked || false

    logger.debug('Retrieved relevant chunks', {
      userId,
      documentId,
      chunksRetrieved: relevantChunks.length,
      topPineconeScore: relevantChunks[0].score,
      topRelevanceScore: relevantChunks[0].relevanceScore,
      wasReranked,
    })

    // 6.5. Log retrieval event for quality monitoring (async, non-blocking)
    const retrievalEvent = createRetrievalEvent(
      documentId,
      profile.id,
      message,
      relevantChunks,
      {
        queryIntent: routingDecision.intent,
        responseStrategy: 'pinecone',
        wasReranked,
      }
    )
    // Don't await - logging shouldn't slow down the response
    logRetrievalEvent(retrievalEvent).catch(() => {
      // Silently ignore logging errors
    })

    // 7. Combine relevant chunks into context
    const context = relevantChunks.map((chunk) => chunk.text).join('\n\n')

    // 8. Get AI provider
    const provider = getProviderForFeature('chat')

    if (!provider.isConfigured()) {
      return NextResponse.json({
        response: `I notice you haven't configured an AI provider yet. To enable RAG chat functionality, please add an AI provider API key (DEEPSEEK_API_KEY or OPENAI_API_KEY) to your .env.local file.`,
        timestamp: new Date().toISOString(),
      })
    }

    logger.info('Selected AI provider for RAG chat', {
      userId,
      provider: provider.name,
    })

    // 9. Fetch user learning profile for personalization
    let learningProfile: LearningProfile | null = null

    try {
      const { profile } = await getUserProfile(userId)

      if (profile?.id) {
        const { learningProfile: dbLearningProfile } = await getUserLearningProfile(profile.id)

        if (dbLearningProfile && profile.learning_style) {
          const effectiveTeachingMode =
            teachingMode ||
            (dbLearningProfile.teaching_style_preference || 'mixed') as TeachingStylePreference

          learningProfile = createLearningProfile(
            profile.learning_style as LearningStyle,
            effectiveTeachingMode as TeachingStylePreference,
            {
              visual: dbLearningProfile.visual_score,
              auditory: dbLearningProfile.auditory_score,
              kinesthetic: dbLearningProfile.kinesthetic_score,
              reading_writing: dbLearningProfile.reading_writing_score,
            },
            dbLearningProfile.socratic_percentage
          )

          logger.debug('Using personalized RAG chat', {
            userId,
            learningStyle: profile.learning_style,
            teachingMode: effectiveTeachingMode,
          })
        }
      }
    } catch (profileError) {
      logger.warn('Could not fetch user profile for RAG chat personalization', {
        userId,
        error: profileError,
      })
    }

    // 10. Determine effective teaching mode
    const effectiveTeachingMode =
      (teachingMode || learningProfile?.teachingStylePreference || 'mixed') as TeachingStylePreference

    // 11. Create teaching-mode-specific system prompt
    let baseSystemPrompt: string

    const commonInstructions = `
🔍 HOW TO HELP THE USER:
- You have access to relevant excerpts retrieved from the document using semantic search
- Each question retrieves the most relevant sections (up to 25 chunks for broad questions)
- For large documents like textbooks, encourage users to ask about specific topics for best results
- NEVER say "I don't have full access" - instead, focus on what information IS available in the excerpts
- If the excerpts don't fully answer the question, say "Based on the excerpts I have, [answer what you can]... For more details on [specific topic], please ask a follow-up question about that topic."
- For structural questions (chapters, sections, table of contents), look carefully in the excerpts for numbered lists, headings, or content outlines
- Never make up information that isn't in the excerpts

💡 WHEN ASKED ABOUT DOCUMENT COVERAGE:
Instead of listing limitations, be helpful:
- "I can help you explore this document! What specific topic would you like to learn about?"
- "This document covers [topics visible in excerpts]. What area interests you most?"
- "For the best answers, ask me about a specific concept, condition, or chapter."

## 📊 VISUAL CONTENT - MAKE LEARNING VISUAL!
Use diagrams, tables, and charts proactively to enhance understanding:

### When to Use Each Visual:
- **Flowcharts**: Processes, decisions, cause-effect, algorithms, diagnostic pathways
- **Sequence Diagrams**: Interactions, timelines of events, procedures
- **Mind Maps**: Topic overviews, concept relationships
- **Pie Charts**: Distributions, percentages, proportions
- **Tables**: Comparisons, features, pros/cons, differential diagnosis
- **Timelines**: Historical events, disease progression, sequences
- **Class/ER Diagrams**: Relationships, hierarchies, structures

### Mermaid Diagram Examples (use generously!)
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Outcome 1]
    B -->|No| D[Outcome 2]
\`\`\`

\`\`\`mermaid
pie title Distribution
    "Category A" : 40
    "Category B" : 35
    "Category C" : 25
\`\`\`

\`\`\`mermaid
mindmap
    root((Main Topic))
        Subtopic 1
            Detail A
            Detail B
        Subtopic 2
            Detail C
\`\`\`

### ⚠️ CRITICAL Mermaid Rules (diagrams break if violated!)
- ❌ NO emojis in node text
- ❌ NO ampersands (&) — write "and"
- ❌ NO parentheses () in labels — use brackets []
- ❌ NO forward slashes (/) — write "or" or hyphenate
- ✅ Keep node labels short (2-4 words)

### Tables for Comparisons
| Feature | Option A | Option B |
|---------|----------|----------|
| Speed   | Fast     | Slow     |
| Cost    | High     | Low      |

### LaTeX for Math
Inline: $E = mc^2$
Block: $$\\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$$

### Formatting Best Practices
- Use **bold** for key terms
- Use headers (##, ###) to organize sections
- Use bullet points for lists
- Use numbered lists for sequences/steps
- **Include at least one visual (diagram, table, or chart) in most responses**`

    if (effectiveTeachingMode === 'socratic') {
      baseSystemPrompt = `You are a Socratic tutor using the classical Socratic method. NEVER give direct answers. ALWAYS respond with guiding questions that lead students to discover answers themselves.

Based on relevant excerpts from the document, ask thoughtful questions that help students explore and understand the content.
${commonInstructions}`
    } else if (effectiveTeachingMode === 'direct') {
      baseSystemPrompt = `You are a helpful AI assistant that provides clear, direct answers based on the document content.

Provide comprehensive answers using the relevant excerpts provided. Be specific and cite the information when appropriate.
${commonInstructions}`
    } else {
      baseSystemPrompt = `You are an adaptive AI tutor that balances providing information with encouraging exploration.

Start with a brief, direct answer based on the document excerpts, then ask follow-up questions to encourage deeper thinking.
${commonInstructions}`
    }

    // Apply personalization if profile exists
    const systemPrompt = learningProfile
      ? personalizePrompt({ profile: learningProfile, mode: 'chat' }, baseSystemPrompt)
      : baseSystemPrompt

    const userPrompt = `Document: "${document.file_name}"

Relevant excerpts from the document:
${context}

---

User Question: ${message}

Please answer this question based on the relevant excerpts provided above. The excerpts were retrieved using semantic search to find the most relevant information for this question.`

    // 12. Estimate cost
    let modelName: string
    if (provider.name === 'deepseek') {
      modelName = 'deepseek-chat'
    } else if (provider.name === 'anthropic') {
      modelName = 'claude-sonnet-4'
    } else {
      modelName = 'gpt-3.5-turbo'
    }
    const promptText = systemPrompt + userPrompt
    const costEstimate = estimateRequestCost(modelName as any, promptText, 1000)
    logger.debug('Cost estimate for RAG chat', {
      userId,
      provider: provider.name,
      model: modelName,
      ...costEstimate,
    })

    // 13. Generate response
    const completion = await provider.complete(
      [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      {
        temperature: 0.1,
        maxTokens: 2000, // Increased for detailed responses with equations and diagrams
      }
    )

    const aiResponse =
      completion.content ||
      "I apologize, but I'm having trouble processing your question at the moment. Please try again."

    // 14. Track usage
    if (completion.usage) {
      trackUsage(
        userId,
        modelName as any,
        completion.usage.promptTokens,
        completion.usage.completionTokens
      )
    } else {
      trackUsage(userId, modelName as any, costEstimate.inputTokens, costEstimate.outputTokens)
    }

    // 14.5. Increment chat message usage count (NEW - Nov 14, 2025)
    await incrementUsage(userId, 'chat_messages')

    const duration = Date.now() - startTime

    logger.api('POST', '/api/chat-rag', 200, duration, {
      userId,
      documentId,
      messageLength: message.length,
      chunksUsed: relevantChunks.length,
      responseLength: aiResponse.length,
    })

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
      strategy: 'pinecone',
      backend: routingDecision.backend,
      queryIntent: routingDecision.intent,
      chunksUsed: relevantChunks.length,
      totalChunks: docStats.chunkCount,
      documentName: document.file_name,
      // Include reranking info
      wasReranked,
      topRelevanceScore: relevantChunks[0]?.relevanceScore,
      // Include indexing progress info if partially indexed
      ...(indexingStatus && !isFullyIndexed && {
        indexingProgress: indexingStatus.percentComplete,
        indexingPhase: indexingStatus.phase,
      }),
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime

    let errorUserId = 'unknown'
    try {
      const { userId: authUserId } = await auth()
      errorUserId = authUserId || 'unknown'
    } catch {}

    logger.error('RAG chat API error', error, {
      userId: errorUserId,
      duration: `${duration}ms`,
    })

    logger.api('POST', '/api/chat-rag', 500, duration, {
      userId: errorUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
