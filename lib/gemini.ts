/**
 * Google Gemini API Integration
 *
 * Provides integration with Gemini 1.5 Pro for handling very large documents
 * (up to 2M tokens context window). Best for college textbooks and massive PDFs.
 *
 * Features:
 * - 2M token context window (vs 128K for GPT-3.5)
 * - Long document processing
 * - Cost tracking integration
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { logger } from './logger'

export interface GeminiCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
}

export interface GeminiMessage {
  role: 'user' | 'model'
  content: string
}

export interface GeminiUsageStats {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Initialize Gemini client
 */
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

/**
 * Generate completion using Gemini 1.5 Pro
 *
 * Best for: Documents > 800K characters (200K tokens)
 * Cost: ~$7 per million input tokens, ~$21 per million output tokens
 */
export async function generateGeminiCompletion(
  messages: GeminiMessage[],
  options: GeminiCompletionOptions = {}
): Promise<{ content: string; usage: GeminiUsageStats }> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    })

    // Convert messages to Gemini format
    const chatHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    logger.debug('Sending request to Gemini 1.5 Pro', {
      messageCount: messages.length,
      lastMessageLength: lastMessage.content.length,
    })

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
    })

    // Send the final message
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response
    const text = response.text()

    // Gemini doesn't return token counts directly in the response
    // We'll estimate based on character count (rough approximation: 4 chars = 1 token)
    const estimatedPromptTokens = messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
    const estimatedCompletionTokens = Math.ceil(text.length / 4)

    logger.debug('Gemini completion generated', {
      responseLength: text.length,
      estimatedPromptTokens,
      estimatedCompletionTokens,
    })

    return {
      content: text,
      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
      },
    }
  } catch (error: any) {
    logger.error('Gemini API error', error, {
      errorMessage: error.message,
      errorType: error.constructor.name,
    })

    if (error.message?.includes('API key')) {
      throw new Error('Gemini API key is invalid or missing')
    }

    if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later.')
    }

    if (error.message?.includes('safety')) {
      throw new Error('Content was blocked by Gemini safety filters')
    }

    throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate flashcards using Gemini for very large documents
 */
export async function generateFlashcardsWithGemini(
  text: string,
  targetCards: number = 30
): Promise<any[]> {
  const prompt = `You are tasked with extracting flashcard content from a given text chunk. Your goal is to identify key terms and their corresponding definitions or explanations that would be suitable for creating flashcards.

Here's the text chunk you need to analyze:
<text_chunk>
${text}
</text_chunk>

Guidelines for extracting flashcard content:
1. Identify important terms, concepts, or phrases that are central to the text's topic.
2. For each term, find a corresponding definition, explanation, or key information from the text.
3. Ensure that the term and definition pairs are concise and clear.
4. Extract only the most relevant and significant information.
5. Aim for a balance between comprehensiveness and brevity.
6. Generate different flashcards each time by focusing on varied aspects of the content.

Create exactly ${targetCards} flashcards based on the content available.

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "front": "Term or concept (keep concise, 1-5 words ideal)",
    "back": "Definition or explanation from the text (clear and educational, under 50 words)"
  }
]

DO NOT include any text outside the JSON array.`

  const result = await generateGeminiCompletion([
    {
      role: 'user',
      content: prompt,
    },
  ])

  try {
    // Remove markdown code blocks if present
    let responseText = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const parsedFlashcards = JSON.parse(responseText)

    if (!Array.isArray(parsedFlashcards)) {
      throw new Error('Response is not an array')
    }

    return parsedFlashcards
  } catch (parseError) {
    logger.error('Failed to parse Gemini flashcard response', parseError, {
      responseLength: result.content.length,
    })
    throw new Error('Failed to parse flashcard data from Gemini response')
  }
}

/**
 * Generate chat response using Gemini for large document context
 */
export async function chatWithGemini(
  documentContext: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  teachingMode: 'direct' | 'socratic' | 'guided' = 'direct'
): Promise<string> {
  // Build system context
  let systemPrompt = `You are an AI teaching assistant. You have access to the following document:\n\n${documentContext}\n\n`

  if (teachingMode === 'socratic') {
    systemPrompt += `Use the Socratic method: Guide the student to discover answers through thoughtful questions rather than providing direct answers. Help them think critically.`
  } else if (teachingMode === 'guided') {
    systemPrompt += `Provide guided explanations with hints and examples. Break down complex topics step-by-step.`
  } else {
    systemPrompt += `Answer questions directly and clearly based on the document content. Be concise and educational.`
  }

  // Convert conversation history to Gemini format
  const messages: GeminiMessage[] = [
    { role: 'user', content: systemPrompt },
    { role: 'model', content: 'I understand. I will help you learn from this document.' },
  ]

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })

  const result = await generateGeminiCompletion(messages, {
    temperature: 0.7,
    maxTokens: 1500,
  })

  return result.content
}
