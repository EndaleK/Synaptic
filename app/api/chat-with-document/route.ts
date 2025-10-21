import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@clerk/nextjs/server"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import { personalizePrompt, createLearningProfile, type LearningProfile } from "@/lib/personalization/personalization-engine"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { ChatMessageSchema, validateDocumentLength, validateContentSafety } from "@/lib/validation"

interface ChatRequest {
  message: string
  fileName?: string
  documentContent?: string
  teachingMode?: 'socratic' | 'direct' | 'mixed'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn("Unauthenticated chat request")
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Apply rate limiting (10 requests per minute for AI endpoints)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn("Rate limit exceeded for chat", { userId })
      return rateLimitResponse
    }

    const body: ChatRequest = await request.json()

    // Validate input
    try {
      ChatMessageSchema.parse({
        message: body.message,
        mode: body.teachingMode
      })
    } catch (validationError) {
      logger.warn("Chat validation failed", { userId, error: validationError })
      return NextResponse.json(
        { error: "Invalid input. Message must be 1-10,000 characters." },
        { status: 400 }
      )
    }

    const { message, fileName, documentContent, teachingMode } = body

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: `I notice you haven't configured an OpenAI API key yet. To enable real document chat functionality:

1. Create a .env.local file in your project root
2. Add your OpenAI API key: OPENAI_API_KEY=your_key_here
3. Restart the development server

For now, I can see you asked: "${message}" about "${fileName || 'your document'}", but I need the API key to provide intelligent responses based on the document content.`,
        timestamp: new Date().toISOString()
      })
    }

    // Validate document content if provided
    if (documentContent) {
      const lengthValidation = validateDocumentLength(documentContent)
      if (!lengthValidation.valid) {
        logger.warn("Document content validation failed", {
          userId,
          length: documentContent.length,
          reason: lengthValidation.reason
        })
        return NextResponse.json(
          { error: lengthValidation.reason },
          { status: 400 }
        )
      }

      const safetyValidation = validateContentSafety(documentContent)
      if (!safetyValidation.safe) {
        logger.warn("Document content safety validation failed", {
          userId,
          reason: safetyValidation.reason
        })
        return NextResponse.json(
          { error: safetyValidation.reason },
          { status: 400 }
        )
      }
    }

    // If no document content, provide guidance
    if (!documentContent || documentContent.trim().length === 0) {
      logger.debug("Chat request without document content", { userId, message })
      return NextResponse.json({
        response: `I don't have access to the document content yet. This could be because:

• The document is still being processed
• The document format isn't supported for text extraction
• There was an error reading the document

Please try uploading a text-based document (TXT, DOCX) or a PDF with selectable text. Once I can access the content, I'll be able to answer your question: "${message}"`,
        timestamp: new Date().toISOString()
      })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Fetch user learning profile for personalization
    let learningProfile: LearningProfile | null = null

    try {
      // Get user profile
      const { profile } = await getUserProfile(userId)

      if (profile?.id) {
        // Get learning profile
        const { learningProfile: dbLearningProfile } = await getUserLearningProfile(profile.id)

        if (dbLearningProfile && profile.learning_style) {
          // Use override if provided, otherwise use saved preference
          const effectiveTeachingMode = teachingMode ||
            (dbLearningProfile.teaching_style_preference || 'mixed') as TeachingStylePreference

          learningProfile = createLearningProfile(
            profile.learning_style as LearningStyle,
            effectiveTeachingMode as TeachingStylePreference,
            {
              visual: dbLearningProfile.visual_score,
              auditory: dbLearningProfile.auditory_score,
              kinesthetic: dbLearningProfile.kinesthetic_score,
              reading_writing: dbLearningProfile.reading_writing_score
            },
            dbLearningProfile.socratic_percentage
          )

          logger.debug("Using personalized chat", {
            userId,
            learningStyle: profile.learning_style,
            teachingMode: effectiveTeachingMode,
            override: !!teachingMode
          })
        }
      }
    } catch (profileError) {
      // If profile fetch fails, just continue with default chat
      logger.warn("Could not fetch user profile for chat personalization", {
        userId,
        error: profileError
      })
    }

    // Determine effective teaching mode (use override if provided, otherwise use saved preference, or default to mixed)
    const effectiveTeachingMode = (teachingMode ||
      learningProfile?.teachingStylePreference ||
      'mixed') as TeachingStylePreference

    // Create teaching-mode-specific base prompt
    let baseSystemPrompt: string

    if (effectiveTeachingMode === 'socratic') {
      // Socratic mode: Focus on asking guiding questions, NOT providing answers
      baseSystemPrompt = `You are a Socratic tutor using the classical Socratic method of teaching through dialogue and questioning.

CORE PRINCIPLE: NEVER give direct answers. ALWAYS respond with thoughtful, guiding questions that lead students to discover answers themselves.

Your role:
- Ask probing questions that help students explore the document's content
- Guide students to discover answers through their own reasoning
- Follow up on student responses with deeper questions
- Help students examine their assumptions and make connections
- Only provide hints (phrased as questions) when students are genuinely stuck
- Validate the reasoning process, not just correct answers

Authentic Socratic Dialogue Example:
Student: "What is X?"
You: "Great question! Let's explore this together. What have you noticed about X as you read through the document? What patterns or key details stood out to you?"
Student: "The document mentions Y"
You: "Excellent observation! Why do you think Y is significant here? How might it relate to the broader concept?"
Student: "Maybe because Z?"
You: "Interesting reasoning! What evidence in the document supports that connection? What else might be relevant?"

Guidelines:
- Base your questions on information that IS in the document
- If the document doesn't contain information about the topic, ask: "What sections of the document have you explored? What related concepts did you find?"
- Never lecture or explain - always question and guide
- Encourage critical thinking through "Why?", "How?", "What if?", "What evidence?" questions
- If you catch yourself stating facts, STOP and rephrase as a question`

    } else if (effectiveTeachingMode === 'direct') {
      // Direct mode: Provide clear, straightforward answers
      baseSystemPrompt = `You are a helpful AI assistant that provides clear, direct answers to questions based strictly on the provided document content.

Key guidelines:
- Provide clear, comprehensive answers based on the document
- Only use information from the provided document
- If the document doesn't contain information to answer the question, clearly state that
- Be specific and cite relevant parts of the document when possible
- Use straightforward, well-organized explanations
- If asked about topics not in the document, politely redirect to document content`

    } else {
      // Mixed mode: Balance between direct answers and guided exploration
      baseSystemPrompt = `You are an adaptive AI tutor that balances providing clear information with encouraging student exploration.

Key guidelines:
- Start with a brief, direct answer to orient the student
- Then ask follow-up questions to encourage deeper thinking
- Only use information from the provided document
- If the document doesn't contain information to answer the question, clearly state that
- Example: "Based on the document, X is [brief answer]. Now, what implications do you see? How might this connect to...?"
- Balance giving information with prompting discovery
- Be specific and cite relevant parts of the document when possible
- If asked about topics not in the document, politely redirect to document content`
    }

    // Apply personalization if profile exists (this adds learning style adaptations on top of teaching mode)
    const systemPrompt = learningProfile
      ? personalizePrompt({ profile: learningProfile, mode: 'chat' }, baseSystemPrompt)
      : baseSystemPrompt

    const userPrompt = `Document: "${fileName || 'Uploaded Document'}"

Document Content:
${documentContent}

---

User Question: ${message}

Please answer this question based only on the information provided in the document above. If the document doesn't contain relevant information to answer the question, please let me know.`

    // Estimate cost before making API call
    const promptText = systemPrompt + userPrompt
    const costEstimate = estimateRequestCost('gpt-3.5-turbo', promptText, 1000)
    logger.debug("Cost estimate for chat", {
      userId,
      ...costEstimate
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.1, // Lower temperature for more focused, factual responses
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content ||
      "I apologize, but I'm having trouble processing your question at the moment. Please try rephrasing your question or try again."

    // Track actual usage
    const actualTokens = completion.usage
    if (actualTokens) {
      trackUsage(
        userId,
        'gpt-3.5-turbo',
        actualTokens.prompt_tokens,
        actualTokens.completion_tokens
      )
    } else {
      // Fallback to estimate if actual usage not available
      trackUsage(userId, 'gpt-3.5-turbo', costEstimate.inputTokens, costEstimate.outputTokens)
    }

    const duration = Date.now() - startTime

    logger.api('POST', '/api/chat-with-document', 200, duration, {
      userId,
      messageLength: message.length,
      documentLength: documentContent?.length,
      teachingMode: teachingMode || 'default',
      responseLength: aiResponse.length
    })

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error("Chat API error", error, {
      userId,
      duration: `${duration}ms`
    })

    // Handle OpenAI specific errors
    if (error.response) {
      logger.error("OpenAI API error in chat", error, {
        userId,
        status: error.response.status,
        data: error.response.data
      })

      logger.api('POST', '/api/chat-with-document', 500, duration, {
        userId,
        error: 'OpenAI API error'
      })

      return NextResponse.json({
        response: `I encountered an error while processing your question. This might be due to API rate limits or configuration issues. Please try again in a moment.`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    logger.api('POST', '/api/chat-with-document', 500, duration, {
      userId,
      error: 'Unknown error'
    })

    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}