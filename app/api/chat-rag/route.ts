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
import { searchDocument, getDocumentStats } from '@/lib/vector-store'
import { getUserProfile, getUserLearningProfile } from '@/lib/supabase/user-profile'
import { personalizePrompt, createLearningProfile, type LearningProfile } from '@/lib/personalization/personalization-engine'
import type { LearningStyle, TeachingStylePreference } from '@/lib/supabase/types'
import { getProviderForFeature } from '@/lib/ai'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { estimateRequestCost, trackUsage } from '@/lib/cost-estimator'
import { ChatMessageSchema } from '@/lib/validation'

interface ChatRAGRequest {
  message: string
  documentId: string
  teachingMode?: 'socratic' | 'direct' | 'mixed'
}

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for chat responses

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

    // 5. Check vector store status
    const docStats = await getDocumentStats(documentId)
    if (!docStats.exists || docStats.chunkCount === 0) {
      logger.error('Document not indexed in vector store', { documentId })
      return NextResponse.json(
        { error: 'Document not yet indexed. Please wait for processing to complete.' },
        { status: 400 }
      )
    }

    logger.info('RAG chat started', {
      userId,
      documentId,
      chunkCount: docStats.chunkCount,
      question: message.substring(0, 100),
    })

    // 6. Retrieve relevant chunks using semantic search
    const relevantChunks = await searchDocument(documentId, message, 5)

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        response: `I couldn't find relevant information in the document to answer your question: "${message}". Try rephrasing your question or asking about a different topic covered in the document.`,
        timestamp: new Date().toISOString(),
        chunksUsed: 0,
      })
    }

    logger.debug('Retrieved relevant chunks', {
      userId,
      documentId,
      chunksRetrieved: relevantChunks.length,
      topScore: relevantChunks[0].score,
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

    if (effectiveTeachingMode === 'socratic') {
      baseSystemPrompt = `You are a Socratic tutor using the classical Socratic method. NEVER give direct answers. ALWAYS respond with guiding questions that lead students to discover answers themselves.

Based on relevant excerpts from the document, ask thoughtful questions that help students explore and understand the content.`
    } else if (effectiveTeachingMode === 'direct') {
      baseSystemPrompt = `You are a helpful AI assistant that provides clear, direct answers based on the document content.

Provide comprehensive answers using the relevant excerpts provided. Be specific and cite the information when appropriate.`
    } else {
      baseSystemPrompt = `You are an adaptive AI tutor that balances providing information with encouraging exploration.

Start with a brief, direct answer based on the document excerpts, then ask follow-up questions to encourage deeper thinking.`
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
    const modelName = provider.name === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'
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
        maxTokens: 1000,
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
      chunksUsed: relevantChunks.length,
      totalChunks: docStats.chunkCount,
      documentName: document.file_name,
    })
  } catch (error: any) {
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
      error: error.message || 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
