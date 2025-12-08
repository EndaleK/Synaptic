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
import { generateStudyBuddyPrompt, type PersonalityMode, type ExplainLevel, type TeachingStyle } from '@/lib/study-buddy/personalities'
import { logger } from '@/lib/logger'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-limits'
import { searchDocument } from '@/lib/vector-store'
import { getUserDocuments } from '@/lib/supabase/documents-server'
import { detectPromptInjection, validateMessageLength } from '@/lib/security/prompt-injection-detector'
import { moderateContent } from '@/lib/security/content-moderator'
import { searchWeb, formatSearchResultsForAI, shouldSearchWeb, extractCitations } from '@/lib/web-search'

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
  teachingStyle?: TeachingStyle // 'socratic' = true Socratic, 'mixed' = explain + questions
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
    const { messages, personalityMode, explainLevel, topic, teachingStyle } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!personalityMode || !['tutor', 'buddy', 'comedy'].includes(personalityMode)) {
      return NextResponse.json(
        { error: 'Valid personality mode is required (tutor, buddy, or comedy)' },
        { status: 400 }
      )
    }

    // SECURITY: Validate message length (prevent abuse)
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const lengthValidation = validateMessageLength(lastUserMessage, 5000)
    if (!lengthValidation.isValid) {
      logger.warn('Study Buddy message too long', {
        userId,
        length: lastUserMessage.length,
        reason: lengthValidation.reason
      })
      return NextResponse.json(
        { error: lengthValidation.reason || 'Message too long' },
        { status: 400 }
      )
    }

    // SECURITY: Detect prompt injection attempts
    const injectionCheck = detectPromptInjection(lastUserMessage)
    if (!injectionCheck.isSafe) {
      logger.warn('Study Buddy prompt injection detected', {
        userId,
        severity: injectionCheck.severity,
        reason: injectionCheck.reason,
        patterns: injectionCheck.patterns
      })
      return NextResponse.json(
        {
          error: 'Your message contains patterns that violate our usage policy. Please rephrase your question.',
          details: process.env.NODE_ENV === 'development' ? injectionCheck.reason : undefined
        },
        { status: 400 }
      )
    }

    // SECURITY: Content moderation (async, don't block on this)
    moderateContent(lastUserMessage)
      .then(moderation => {
        if (!moderation.isSafe) {
          logger.warn('Study Buddy content moderation flagged', {
            userId,
            reason: moderation.reason,
            categories: moderation.categories
          })
          // Note: We log but don't block since moderation happens async
          // Consider blocking if needed for stricter policy
        }
      })
      .catch(err => {
        logger.error('Study Buddy moderation error', err, { userId })
      })

    // Check usage limits (free tier: 100 messages/month, premium: unlimited)
    const usageCheck = await checkUsageLimit(userId, 'study_buddy')
    if (!usageCheck.allowed) {
      logger.warn('Study Buddy blocked - usage limit reached', {
        userId,
        tier: usageCheck.tier,
        used: usageCheck.used,
        limit: usageCheck.limit
      })
      return NextResponse.json(
        {
          error: usageCheck.message,
          tier: usageCheck.tier,
          used: usageCheck.used,
          limit: usageCheck.limit,
          upgradeUrl: '/pricing'
        },
        { status: 403 }
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
    // Teaching style only applies to tutor mode
    let systemPrompt = generateStudyBuddyPrompt({
      mode: personalityMode,
      explainLevel,
      learningStyle: learningProfile?.dominant_style,
      topic,
      teachingStyle: personalityMode === 'tutor' ? (teachingStyle || 'mixed') : undefined
    })

    // FEATURE FLAG: Date/Time Awareness
    // Set STUDY_BUDDY_DATE_TIME_AWARE=true in environment to enable
    logger.info('Study Buddy Feature Flag Check', {
      DATE_TIME_AWARE: process.env.STUDY_BUDDY_DATE_TIME_AWARE,
      DOCUMENT_ACCESS: process.env.STUDY_BUDDY_DOCUMENT_ACCESS
    })
    if (process.env.STUDY_BUDDY_DATE_TIME_AWARE === 'true') {
      const now = new Date()
      const currentDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const currentTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })

      systemPrompt += `\n\n📅 Current Date & Time Awareness:
- Today is ${currentDate}
- Current time: ${currentTime}
- Day of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

You are aware of the current date and time. Use this information when relevant:
- Reference "today", "this week", "tomorrow" accurately
- Help plan study schedules for upcoming dates
- Be mindful of typical study times (late night vs morning)
- Acknowledge time-sensitive queries ("due tomorrow", "exam next Monday")

Note: Users may be in different timezones, so be flexible with time references.`
    }

    // FEATURE FLAG: Document Access via RAG
    // Set STUDY_BUDDY_DOCUMENT_ACCESS=true in environment to enable
    if (process.env.STUDY_BUDDY_DOCUMENT_ACCESS === 'true') {
      logger.info('Study Buddy DOCUMENT_ACCESS flag is true, entering block')
      try {
        // Get user's most recent documents using the same helper function as GET /api/documents
        const { documents: userDocuments, error: documentsError } = await getUserDocuments(userId, 5, 0)

        if (documentsError) {
          logger.warn('Failed to fetch documents for Study Buddy', { error: documentsError, userId })
          // Graceful degradation - continue without documents
        }

        logger.info('Study Buddy fetched documents', {
          count: userDocuments?.length || 0,
          hasDocuments: userDocuments && userDocuments.length > 0,
          documentNames: userDocuments?.map(d => d.file_name).join(', ')
        })

        if (userDocuments && userDocuments.length > 0) {
          const documentList = userDocuments
            .map((doc, idx) => `${idx + 1}. "${doc.file_name}" (uploaded ${new Date(doc.created_at).toLocaleDateString()})`)
            .join('\n')

          systemPrompt += `\n\n📚 Document Access:
You have access to the user's uploaded study documents. Here are their recent documents:

${documentList}

IMPORTANT GUIDELINES:
- You can reference content from these documents when relevant to the conversation
- If the user asks about a specific topic, you can search their documents for related information
- When referencing document content, cite the document name
- If information is not in the documents, say so and provide general knowledge instead
- Don't assume what's in documents - only reference actual retrieved content

How to use documents:
- When user asks about topics that might be in their study materials, try to connect to their documents
- Example: "Based on your uploaded notes from [Document Name], ..."
- Example: "I don't see that topic in your current documents, but here's what I know..."`

          // RAG Search: Check if latest user message needs document search
          const lastUserMessage = messages[messages.length - 1]?.content
          if (lastUserMessage && shouldSearchDocuments(lastUserMessage)) {
            logger.info('Study Buddy attempting RAG search', {
              userId,
              query: lastUserMessage.substring(0, 100)
            })

            // Search across user's documents for relevant content
            const searchResults = await searchMultipleDocuments(
              userDocuments,
              lastUserMessage,
              3, // Top 3 results per document
              userId  // SECURITY: Pass userId for ownership verification
            )

            if (searchResults.length > 0) {
              // Format search results for context injection
              const formattedResults = searchResults
                .map(result =>
                  `📄 From "${result.documentName}":\n${result.text}\n(Relevance: ${(result.score * 100).toFixed(0)}%)`
                )
                .join('\n\n')

              systemPrompt += `\n\n📖 Relevant Content from User's Documents:

${formattedResults}

Use this content to answer the user's question. Cite the document names when referencing this information.`

              logger.info('Study Buddy RAG search successful', {
                userId,
                resultsCount: searchResults.length,
                documents: searchResults.map(r => r.documentName)
              })
            } else {
              logger.info('Study Buddy RAG search returned no results', { userId })
            }
          }

          logger.info('Study Buddy document awareness enabled', {
            userId,
            documentCount: userDocuments.length
          })
        }
      } catch (error) {
        // Graceful degradation - if document fetch fails, continue without it
        logger.warn('Failed to fetch documents for Study Buddy', { error, userId })
        // Don't add document context, but don't fail the request
      }
    }

    // WEB SEARCH: Check if user message needs web search
    // Enabled when TAVILY_API_KEY is set in environment
    let searchCitations: string[] | null = null
    if (process.env.TAVILY_API_KEY && shouldSearchWeb(lastUserMessage)) {
      try {
        logger.info('Study Buddy performing web search', {
          userId,
          query: lastUserMessage.substring(0, 100)
        })

        const searchResponse = await searchWeb(lastUserMessage, 5)

        if (searchResponse.results.length > 0) {
          // Format and add search results to system prompt
          const formattedResults = formatSearchResultsForAI(searchResponse)
          systemPrompt += `\n\n🌐 Web Search Results:\n\n${formattedResults}`

          // Extract citations for later use (will be shown in UI)
          searchCitations = extractCitations(searchResponse.results)

          logger.info('Study Buddy web search successful', {
            userId,
            resultsCount: searchResponse.results.length,
            searchTime: searchResponse.searchTime,
            citations: searchCitations.length
          })
        } else {
          logger.info('Study Buddy web search returned no results', { userId })
        }
      } catch (error) {
        // Graceful degradation - if web search fails, continue without it
        logger.warn('Study Buddy web search failed', { error, userId })
        // Don't fail the request, just log and continue
      }
    }

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
      teachingStyle: personalityMode === 'tutor' ? (teachingStyle || 'mixed') : undefined,
      messageCount: messages.length,
      provider: provider.constructor.name
    })

    // Call AI provider (streaming response)
    if (!provider.streamComplete) {
      // Fallback to non-streaming if provider doesn't support it
      const completion = await provider.complete(conversationMessages, {
        temperature: personalityMode === 'buddy' ? 0.8 : 0.6,
        maxTokens: 2500
      })

      // Append citations if web search was used
      let responseContent = completion.content
      if (searchCitations && searchCitations.length > 0) {
        responseContent += '\n\n---\n\n**Sources:**\n' + searchCitations.join('\n')
      }

      // Track usage
      await incrementUsage(userId, 'study_buddy')

      const duration = Date.now() - startTime
      logger.api('POST', '/api/study-buddy/chat', 200, duration, {
        userId,
        personalityMode,
        messageCount: messages.length
      })

      return NextResponse.json({
        content: responseContent,
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
            maxTokens: 2500
          })

          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
            controller.enqueue(encoder.encode(data))
          }

          // Append citations if web search was used
          if (searchCitations && searchCitations.length > 0) {
            const citationsText = '\n\n---\n\n**Sources:**\n' + searchCitations.join('\n')
            const citationData = `data: ${JSON.stringify({ content: citationsText })}\n\n`
            controller.enqueue(encoder.encode(citationData))
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: {"done":true}\n\n'))
          controller.close()

          // Track usage (asynchronously)
          incrementUsage(userId, 'study_buddy').catch(
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

  } catch (error: unknown) {
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

/**
 * Determine if a user message should trigger document search
 * Uses heuristics to detect questions about specific topics
 */
function shouldSearchDocuments(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  // Question indicators
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'explain', 'tell me', 'can you']
  const hasQuestion = questionWords.some(word => lowerMessage.includes(word)) || lowerMessage.includes('?')

  // Topic-specific indicators (suggests user wants info from their materials)
  const topicIndicators = [
    'about',
    'chapter',
    'section',
    'topic',
    'lecture',
    'notes',
    'material',
    'document',
    'book',
    'textbook',
    'study guide',
    'in my',
    'from my',
    'according to',
  ]
  const hasTopic = topicIndicators.some(phrase => lowerMessage.includes(phrase))

  // Don't search for greetings or meta questions
  const greetings = ['hello', 'hi ', 'hey', 'good morning', 'good afternoon', 'good evening']
  const isGreeting = greetings.some(greeting => lowerMessage.startsWith(greeting))

  const metaQuestions = [
    'how are you',
    'who are you',
    'what can you do',
    'help me',
    'can you help',
  ]
  const isMeta = metaQuestions.some(meta => lowerMessage.includes(meta))

  // Search if: (has question OR has topic) AND NOT (greeting OR meta)
  return (hasQuestion || hasTopic) && !isGreeting && !isMeta
}

/**
 * Search across multiple documents for relevant content
 * Returns combined results sorted by relevance score
 */
async function searchMultipleDocuments(
  documents: Array<{ id: string; file_name: string; created_at: string }>,
  query: string,
  topKPerDoc: number = 3,
  userId?: string  // Optional: Pass userId for ownership verification
): Promise<Array<{ text: string; score: number; documentName: string }>> {
  const allResults: Array<{ text: string; score: number; documentName: string }> = []

  // Search each document in parallel
  const searchPromises = documents.map(async (doc) => {
    try {
      // SECURITY: Pass userId for ownership verification (defense-in-depth)
      const results = await searchDocument(doc.id, query, topKPerDoc, userId)
      return results.map(result => ({
        text: result.text,
        score: result.score,
        documentName: doc.file_name
      }))
    } catch (error) {
      logger.warn('Failed to search document in Study Buddy', {
        documentId: doc.id,
        documentName: doc.file_name,
        error
      })
      return []
    }
  })

  const resultsPerDoc = await Promise.all(searchPromises)

  // Flatten and combine all results
  for (const results of resultsPerDoc) {
    allResults.push(...results)
  }

  // Sort by score (highest first) and return top results
  allResults.sort((a, b) => b.score - a.score)

  // Return top 5 overall results (to avoid token bloat)
  return allResults.slice(0, 5)
}
