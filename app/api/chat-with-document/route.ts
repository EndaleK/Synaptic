import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import { personalizePrompt, createLearningProfile, type LearningProfile } from "@/lib/personalization/personalization-engine"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { ChatMessageSchema, validateDocumentLength, validateContentSafety } from "@/lib/validation"
import { getProviderForFeature } from "@/lib/ai"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { withMonitoring, trackApiMetric, addApiContext, flagSlowOperation } from '@/lib/monitoring/api-monitor'
import {
  performAISafetyCheck,
  sanitizeAIOutput,
  checkResponseForLeakage,
  trackSuspiciousActivity
} from '@/lib/security/ai-safety'

interface ChatRequest {
  message: string
  fileName?: string
  documentContent?: string
  teachingMode?: 'socratic' | 'direct' | 'mixed'
}

async function handleChatWithDocument(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Authenticate user
    const authResult = await auth()
    userId = authResult.userId
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

    // Check chat message usage limit (NEW - Nov 14, 2025: 50 messages/month for free tier)
    const usageCheck = await checkUsageLimit(userId, 'chat_messages')
    if (!usageCheck.allowed) {
      logger.warn("Chat message limit exceeded", {
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

    const body: ChatRequest = await request.json()

    // Validate input
    try {
      ChatMessageSchema.parse({
        message: body.message,
        mode: body.teachingMode
      })
    } catch (validationError: any) {
      logger.warn("Chat validation failed", { userId, error: validationError, body })
      const errorMessage = validationError.errors?.[0]?.message || validationError.message || "Invalid input"
      return NextResponse.json(
        {
          error: `Validation failed: ${errorMessage}`,
          details: validationError.errors || validationError.message
        },
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

    // Track message metrics
    trackApiMetric('chat.message.length', message.length, 'none')
    if (documentContent) {
      trackApiMetric('chat.document.length', documentContent.length, 'none')
    }

    // Track teaching mode
    const effectiveMode = teachingMode || 'default'
    trackApiMetric(`chat.teaching_mode.${effectiveMode}`, 1, 'none')

    // Add context for monitoring
    addApiContext('chat_session', {
      file_name: fileName || 'unknown',
      message_length: message.length,
      document_length: documentContent?.length || 0,
      teaching_mode: effectiveMode
    })

    // Get AI provider for chat (DeepSeek primary, OpenAI fallback)
    const provider = getProviderForFeature('chat')

    // Track provider selection
    trackApiMetric(`chat.ai_provider.${provider.name}`, 1, 'none')

    if (!provider.isConfigured()) {
      return NextResponse.json({
        response: `I notice you haven't configured an AI provider yet. To enable real document chat functionality:

1. Create a .env.local file in your project root
2. Add at least one AI provider API key:
   - DEEPSEEK_API_KEY=your_key_here (recommended - 70% cheaper)
   - OR OPENAI_API_KEY=your_key_here
3. Restart the development server

For now, I can see you asked: "${message}" about "${fileName || 'your document'}", but I need an AI provider to provide intelligent responses based on the document content.`,
        timestamp: new Date().toISOString()
      })
    }

    // Log provider selection for cost monitoring
    const envProvider = process.env.CHAT_PROVIDER
    logger.info('Selected AI provider for chat', {
      userId,
      provider: provider.name,
      reason: envProvider
        ? `Using ${provider.name} (configured via CHAT_PROVIDER environment variable)`
        : `Using ${provider.name} for cost-effective chat (60-70% cheaper than OpenAI)`
    })

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

    // AI Safety Check - Prompt injection and malicious content detection
    const aiSafetyCheck = await performAISafetyCheck(message, documentContent, userId)
    if (!aiSafetyCheck.allowed) {
      logger.warn("AI safety check failed", {
        userId,
        reason: aiSafetyCheck.blockedReason
      })
      // Track suspicious activity
      const shouldBlock = trackSuspiciousActivity(userId, 'high')
      if (shouldBlock) {
        return NextResponse.json(
          { error: "Too many flagged requests. Please try again later." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: aiSafetyCheck.blockedReason },
        { status: 400 }
      )
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

    // Visual content instructions shared across all teaching modes
    const visualContentInstructions = `

## 📊 VISUAL CONTENT - MAKE LEARNING VISUAL!

### ⚠️ MANDATORY: Use diagrams in EVERY response where applicable!
You MUST include at least ONE diagram when explaining:
- Any process, workflow, or sequence of steps
- Relationships between concepts
- Hierarchies or categories
- Comparisons (use tables)
- Data distributions (use pie charts)
- Timelines or historical events

### 🔴 CRITICAL FORMAT REQUIREMENT
All diagrams MUST use this EXACT format with the word "mermaid" after the triple backticks:

\`\`\`mermaid
graph TD
    A[Step 1] --> B[Step 2]
\`\`\`

❌ WRONG (will NOT render):
\`\`\`
graph TD
    A --> B
\`\`\`

✅ CORRECT (will render as diagram):
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

### Mermaid Diagram Examples

**Flowchart (for processes):**
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Outcome 1]
    B -->|No| D[Outcome 2]
\`\`\`

**Sequence Diagram (for interactions):**
\`\`\`mermaid
sequenceDiagram
    participant A as Actor 1
    participant B as Actor 2
    A->>B: Message
    B-->>A: Response
\`\`\`

**Pie Chart (for distributions):**
\`\`\`mermaid
pie title Distribution
    "Category A" : 40
    "Category B" : 35
    "Category C" : 25
\`\`\`

**Mind Map (for concepts):**
\`\`\`mermaid
mindmap
    root((Main Topic))
        Subtopic 1
            Detail A
            Detail B
        Subtopic 2
            Detail C
\`\`\`

**Timeline (for history):**
\`\`\`mermaid
timeline
    title Historical Events
    1900 : Event A
    1950 : Event B
    2000 : Event C
\`\`\`

### ⚠️ Mermaid Syntax Rules (diagrams break if violated!)
- ❌ NO emojis in node text
- ❌ NO ampersands - write "and" instead
- ❌ NO parentheses in labels - use dashes or brackets
- ❌ NO forward slashes - write "or" instead
- ❌ NO special characters: # < > % in labels
- ✅ Keep node labels short (2-4 words max)
- ✅ Use simple IDs: A, B, C or step1, step2

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
- Include a diagram in most responses to make concepts visual`

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
- **Use visual diagrams to illustrate concepts you want them to explore**

Authentic Socratic Dialogue Example:
Student: "What is X?"
You: "Great question! Let's explore this together. What have you noticed about X as you read through the document? What patterns or key details stood out to you?"
[Include a simple diagram showing X and related concepts]
Student: "The document mentions Y"
You: "Excellent observation! Why do you think Y is significant here? How might it relate to the broader concept?"
Student: "Maybe because Z?"
You: "Interesting reasoning! What evidence in the document supports that connection? What else might be relevant?"

Guidelines:
- Base your questions on information that IS in the document
- If the document doesn't contain information about the topic, ask: "What sections of the document have you explored? What related concepts did you find?"
- Never lecture or explain - always question and guide
- Encourage critical thinking through "Why?", "How?", "What if?", "What evidence?" questions
- If you catch yourself stating facts, STOP and rephrase as a question
- **Use diagrams to prompt visual thinking — ask "What do you notice in this relationship?"**
${visualContentInstructions}`

    } else if (effectiveTeachingMode === 'direct') {
      // Direct mode: Provide clear, straightforward answers
      baseSystemPrompt = `You are a helpful AI assistant that provides clear, direct answers to questions based strictly on the provided document content.

Key guidelines:
- Provide clear, comprehensive answers based on the document
- Only use information from the provided document
- If the document doesn't contain information to answer the question, clearly state that
- Be specific and cite relevant parts of the document when possible
- Use straightforward, well-organized explanations
- If asked about topics not in the document, politely redirect to document content
- **Proactively include diagrams, charts, and tables to illustrate your explanations**
- **A picture is worth 1000 words — use visuals liberally**
${visualContentInstructions}`

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
- If asked about topics not in the document, politely redirect to document content
- **Include at least one visual (diagram, table, or chart) in most responses**
- **Use visuals to make abstract concepts concrete and memorable**
${visualContentInstructions}`
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
    logger.debug("Cost estimate for chat", {
      userId,
      provider: provider.name,
      model: modelName,
      ...costEstimate
    })

    // Use provider.complete() instead of OpenAI SDK
    const aiStartTime = Date.now()
    const completion = await provider.complete(
      [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      {
        temperature: 0.1, // Lower temperature for more focused, factual responses
        maxTokens: 2000, // Increased for detailed responses with equations and diagrams
      }
    )
    const aiDuration = Date.now() - aiStartTime

    // Track AI completion metrics
    trackApiMetric('chat.ai_completion.duration', aiDuration, 'millisecond')

    // Flag slow AI completions (>10s)
    if (aiDuration > 10000) {
      flagSlowOperation('Chat AI completion', aiDuration, 10000)
    }

    let aiResponse = completion.content ||
      "I apologize, but I'm having trouble processing your question at the moment. Please try rephrasing your question or try again."

    // Sanitize AI output to prevent data leakage
    aiResponse = sanitizeAIOutput(aiResponse)

    // Check for potential data leakage in response
    const leakageCheck = checkResponseForLeakage(aiResponse, userId)
    if (!leakageCheck.safe) {
      logger.error("Potential data leakage detected in AI response", {
        userId,
        severity: leakageCheck.severity
      })
      // Return generic response instead
      aiResponse = "I encountered an issue generating a response. Please try rephrasing your question."
    }

    // Track response length
    trackApiMetric('chat.response.length', aiResponse.length, 'none')

    // Track actual usage
    if (completion.usage) {
      trackUsage(
        userId,
        modelName as any,
        completion.usage.promptTokens,
        completion.usage.completionTokens
      )
    } else {
      // Fallback to estimate if actual usage not available
      trackUsage(userId, modelName as any, costEstimate.inputTokens, costEstimate.outputTokens)
    }

    // Increment chat message usage count (NEW - Nov 14, 2025)
    await incrementUsage(userId, 'chat_messages')

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

  } catch (error: unknown) {
    const duration = Date.now() - startTime

    // Get userId for error logging (may be undefined if auth failed)
    let errorUserId = 'unknown'
    try {
      const { userId: authUserId } = await auth()
      errorUserId = authUserId || 'unknown'
    } catch {}

    logger.error("Chat API error", error, {
      userId: errorUserId,
      duration: `${duration}ms`
    })

    // Handle AI provider errors
    if (error.response || error.message?.includes('API')) {
      logger.error("AI provider API error in chat", error, {
        userId: errorUserId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })

      logger.api('POST', '/api/chat-with-document', 500, duration, {
        userId: errorUserId,
        error: 'AI provider API error'
      })

      return NextResponse.json({
        response: `I encountered an error while processing your question. This might be due to API rate limits or configuration issues. Please try again in a moment.`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    logger.api('POST', '/api/chat-with-document', 500, duration, {
      userId: errorUserId,
      error: 'Unknown error'
    })

    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}

export const POST = withMonitoring(handleChatWithDocument, '/api/chat-with-document')