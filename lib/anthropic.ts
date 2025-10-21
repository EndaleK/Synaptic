/**
 * Anthropic Claude API Integration
 *
 * Provides integration with Claude 3.5 Sonnet for high-quality text generation
 * with good context window (200K tokens). Best for medium-large documents.
 *
 * Features:
 * - 200K token context window
 * - Superior quality vs GPT-3.5
 * - Good balance of cost and performance
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from './logger'

export interface ClaudeCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeUsageStats {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Initialize Claude client
 */
function getClaudeClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

/**
 * Generate completion using Claude 3.5 Sonnet
 *
 * Best for: Documents 100K-800K characters (25K-200K tokens)
 * Cost: ~$3 per million input tokens, ~$15 per million output tokens
 */
export async function generateClaudeCompletion(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options: ClaudeCompletionOptions = {}
): Promise<{ content: string; usage: ClaudeUsageStats }> {
  try {
    const client = getClaudeClient()

    logger.debug('Sending request to Claude 3.5 Sonnet', {
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
    })

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.3,
      top_p: options.topP ?? 0.95,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : ''

    logger.debug('Claude completion generated', {
      responseLength: content.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  } catch (error: any) {
    logger.error('Claude API error', error, {
      errorMessage: error.message,
      errorType: error.constructor.name,
    })

    if (error.message?.includes('API key')) {
      throw new Error('Claude API key is invalid or missing')
    }

    if (error.message?.includes('overloaded')) {
      throw new Error('Claude API is overloaded. Please try again in a moment.')
    }

    if (error.message?.includes('rate_limit')) {
      throw new Error('Claude API rate limit exceeded. Please try again later.')
    }

    throw new Error(`Claude API error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate flashcards using Claude for medium-large documents
 */
export async function generateFlashcardsWithClaude(
  text: string,
  targetCards: number = 30
): Promise<any[]> {
  const systemPrompt = `You are an expert educator who creates concise, clear flashcards from educational content.`

  const userPrompt = `You are tasked with extracting flashcard content from a given text chunk. Your goal is to identify key terms and their corresponding definitions or explanations that would be suitable for creating flashcards.

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

  const result = await generateClaudeCompletion(systemPrompt, [
    {
      role: 'user',
      content: userPrompt,
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
    logger.error('Failed to parse Claude flashcard response', parseError, {
      responseLength: result.content.length,
    })
    throw new Error('Failed to parse flashcard data from Claude response')
  }
}

/**
 * Generate chat response using Claude for document Q&A
 */
export async function chatWithClaude(
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

  // Convert conversation history to Claude format and add current message
  const messages: ClaudeMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ]

  const result = await generateClaudeCompletion(systemPrompt, messages, {
    temperature: 0.7,
    maxTokens: 1500,
  })

  return result.content
}

/**
 * Generate mind map using Claude
 */
export async function generateMindMapWithClaude(text: string, maxNodes: number = 25, maxDepth: number = 3): Promise<any> {
  const systemPrompt = `You are an expert at extracting hierarchical concept maps from text.`

  const userPrompt = `Analyze the following text and create a hierarchical mind map structure:

<text>
${text}
</text>

Create a mind map with up to ${maxNodes} nodes and a maximum depth of ${maxDepth} levels. Include:
1. A central concept (root node at level 0)
2. Main branches (level 1 nodes)
3. Sub-branches (continuing to level ${maxDepth - 1})
4. Each node should have a concise label and brief description

IMPORTANT: Ensure the mind map has exactly ${maxDepth} levels of depth (0 through ${maxDepth - 1}).

Respond with a JSON object in this exact format:
{
  "title": "Central Concept",
  "nodes": [
    {
      "id": "node-1",
      "label": "Node label",
      "description": "Brief description",
      "level": 0
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2"
    }
  ],
  "metadata": {
    "totalNodes": 10,
    "maxDepth": ${maxDepth}
  }
}

DO NOT include any text outside the JSON object.`

  const result = await generateClaudeCompletion(systemPrompt, [
    {
      role: 'user',
      content: userPrompt,
    },
  ], {
    maxTokens: 8000, // Allow larger responses for complex mind maps (up to 55 nodes)
    temperature: 0.5
  })

  try {
    // Remove markdown code blocks if present
    let responseText = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const mindMapData = JSON.parse(responseText)

    return mindMapData
  } catch (parseError) {
    logger.error('Failed to parse Claude mind map response', parseError, {
      responseLength: result.content.length,
    })
    throw new Error('Failed to parse mind map data from Claude response')
  }
}
