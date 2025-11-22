/**
 * Study Buddy Chat API Route
 *
 * Handles conversational AI requests for the Study Buddy feature.
 * - Works independently of documents (general knowledge)
 * - Supports Tutor/Buddy personality modes
 * - Adapts to user's learning style
 * - Uses DeepSeek for cost-effective conversations
 *
 * POST /api/study-buddy/chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getProviderForFeature } from '@/lib/ai'
import { generateStudyBuddyPrompt, type PersonalityMode, type ExplainLevel } from '@/lib/study-buddy/personalities'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  personalityMode: PersonalityMode
  explainLevel?: ExplainLevel
  topic?: string
}

/**
 * POST /api/study-buddy/chat
 * Send a message to Study Buddy and get a response
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated Study Buddy chat request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: ChatRequest = await req.json()
    const { messages, personalityMode, explainLevel, topic } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!personalityMode || !['tutor', 'buddy'].includes(personalityMode)) {
      return NextResponse.json(
        { error: 'Valid personality mode is required (tutor or buddy)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile for learning style
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

    // Get learning profile (optional - for personalization)
    const { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('dominant_style')
      .eq('user_id', profile.id)
      .single()

    // Generate personality-aware system prompt
    const systemPrompt = generateStudyBuddyPrompt({
      mode: personalityMode,
      explainLevel,
      learningStyle: learningProfile?.dominant_style,
      topic
    })

    // Get AI provider (prefer DeepSeek for cost efficiency)
    const provider = getProviderForFeature('chat')

    if (!provider.isConfigured()) {
      logger.error('No AI provider configured for Study Buddy')
      return NextResponse.json(
        {
          error: 'AI service temporarily unavailable',
          details: 'No AI provider configured. Please check API keys.'
        },
        { status: 503 }
      )
    }

    // Prepare conversation history
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages
    ]

    logger.info('Study Buddy chat request', {
      userId,
      personalityMode,
      explainLevel,
      messageCount: messages.length,
      provider: provider.constructor.name
    })

    // Call AI provider (streaming response)
    if (!provider.streamComplete) {
      // Fallback to non-streaming if provider doesn't support it
      const completion = await provider.complete(conversationMessages, {
        temperature: personalityMode === 'buddy' ? 0.8 : 0.6,
        maxTokens: 1500
      })

      // Track usage
      await trackStudyBuddyUsage(profile.id, messages[messages.length - 1].content.length)

      const duration = Date.now() - startTime
      logger.api('POST', '/api/study-buddy/chat', 200, duration, {
        userId,
        personalityMode,
        messageCount: messages.length
      })

      return NextResponse.json({
        content: completion.content,
        done: true
      })
    }

    // Create ReadableStream from AsyncGenerator
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = provider.streamComplete!(conversationMessages, {
            temperature: personalityMode === 'buddy' ? 0.8 : 0.6,
            maxTokens: 1500
          })

          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
            controller.enqueue(encoder.encode(data))
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: {"done":true}\n\n'))
          controller.close()

          // Track usage (asynchronously)
          trackStudyBuddyUsage(profile.id, messages[messages.length - 1].content.length).catch(
            (error) => logger.error('Failed to track Study Buddy usage', error)
          )

          const duration = Date.now() - startTime
          logger.api('POST', '/api/study-buddy/chat', 200, duration, {
            userId,
            personalityMode,
            messageCount: messages.length
          })
        } catch (error) {
          controller.error(error)
        }
      }
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Study Buddy chat error', error, {
      userId: 'unknown',
      errorMessage: error.message
    })
    logger.api('POST', '/api/study-buddy/chat', 500, duration, {
      error: error.message
    })

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Track Study Buddy usage for analytics
 */
async function trackStudyBuddyUsage(userProfileId: string, messageLength: number): Promise<void> {
  try {
    const supabase = await createClient()

    // Create a study session for Study Buddy usage
    await supabase
      .from('study_sessions')
      .insert({
        user_id: userProfileId,
        session_type: 'chat', // Reuse chat type for now
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: 1, // Minimal duration for conversation message
        completed: true
      })

    logger.info('Study Buddy usage tracked', {
      userProfileId,
      messageLength
    })
  } catch (error) {
    // Don't throw - usage tracking is non-critical
    logger.warn('Failed to track Study Buddy usage', error)
  }
}
