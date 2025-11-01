/**
 * DeepSeek API Integration
 *
 * Provides integration with DeepSeek for cost-effective AI operations.
 * DeepSeek offers OpenAI-compatible API at significantly lower costs.
 *
 * Features:
 * - 10x cheaper than OpenAI GPT-3.5
 * - OpenAI-compatible API
 * - Good quality for flashcard generation
 *
 * Pricing (approximate):
 * - Input: $0.14 per million tokens
 * - Output: $0.28 per million tokens
 * (vs OpenAI GPT-3.5: $0.50/$1.50 per million)
 */

import OpenAI from 'openai'
import { logger } from './logger'

export interface DeepSeekCompletionOptions {
  temperature?: number
  maxTokens?: number
}

export interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface DeepSeekUsageStats {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Initialize DeepSeek client
 */
function getDeepSeekClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  })
}

/**
 * Generate completion using DeepSeek
 *
 * Best for: Small to medium documents, cost-sensitive operations
 * Cost: ~10x cheaper than OpenAI GPT-3.5
 */
export async function generateDeepSeekCompletion(
  messages: DeepSeekMessage[],
  options: DeepSeekCompletionOptions = {}
): Promise<{ content: string; usage: DeepSeekUsageStats }> {
  try {
    const client = getDeepSeekClient()

    logger.debug('Sending request to DeepSeek', {
      messageCount: messages.length,
      lastMessageLength: messages[messages.length - 1]?.content.length,
    })

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
    })

    const choice = completion.choices[0]
    if (!choice || !choice.message) {
      throw new Error('No response from DeepSeek API')
    }

    const usage: DeepSeekUsageStats = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    }

    logger.debug('DeepSeek response received', {
      contentLength: choice.message.content?.length || 0,
      usage,
    })

    return {
      content: choice.message.content || '',
      usage,
    }
  } catch (error) {
    logger.error('DeepSeek API request failed', error)
    throw error
  }
}

/**
 * Generate flashcards using DeepSeek
 *
 * This is the most cost-effective option for flashcard generation.
 * Uses the same prompt structure as Gemini for consistency.
 *
 * @param text - Document text to extract flashcards from
 * @param targetCards - Number of flashcards to generate (default: 30)
 * @returns Array of flashcard objects with front/back properties
 */
export async function generateFlashcardsWithDeepSeek(
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

  const result = await generateDeepSeekCompletion([
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

    logger.info('DeepSeek flashcards generated successfully', {
      count: parsedFlashcards.length,
      usage: result.usage,
    })

    return parsedFlashcards
  } catch (parseError) {
    logger.error('Failed to parse DeepSeek flashcard response', parseError, {
      responseLength: result.content.length,
      responseSample: result.content.substring(0, 200),
    })
    throw new Error('Failed to parse flashcard response from DeepSeek')
  }
}

/**
 * Chat with document using DeepSeek
 *
 * Cost-effective alternative to OpenAI for document-based Q&A
 */
export async function chatWithDeepSeek(
  documentText: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  teachingMode: 'direct' | 'socratic' | 'guided' = 'direct'
): Promise<string> {
  // Build teaching mode instructions
  const teachingModeInstructions = {
    direct: 'Provide clear, direct answers to questions based on the document.',
    socratic: 'Guide the user to discover answers through thoughtful questions. Never give direct answers.',
    guided: 'Balance between direct answers and guiding questions. Provide hints and ask clarifying questions.',
  }

  const systemPrompt = `You are an AI teaching assistant helping students learn from documents. ${teachingModeInstructions[teachingMode]}

Use the following document as your knowledge base. Only answer based on information in the document. If the answer isn't in the document, say so.

Document:
${documentText.substring(0, 50000)} // Limit to ~12K tokens

Stay focused on the document content and help the user understand it deeply.`

  // Convert history to DeepSeek format
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const result = await generateDeepSeekCompletion(messages, {
    temperature: 0.1,
    maxTokens: 1000,
  })

  logger.info('DeepSeek chat response generated', {
    teachingMode,
    responseLength: result.content.length,
    usage: result.usage,
  })

  return result.content
}
