/**
 * Anthropic Claude API Integration
 *
 * Provides integration with Claude Sonnet 4 for high-quality text generation
 * with excellent context window (200K tokens). Best for medium-large documents.
 *
 * Features:
 * - 200K token context window
 * - Latest Claude Sonnet 4 (May 2025)
 * - Superior quality and reasoning
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
 * Generate completion using Claude Sonnet 4
 *
 * Best for: Documents 100K-800K characters (25K-200K tokens)
 * Cost: ~$3 per million input tokens, ~$15 per million output tokens
 * Model: claude-sonnet-4-20250514 (latest as of May 2025)
 */
export async function generateClaudeCompletion(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options: ClaudeCompletionOptions = {}
): Promise<{ content: string; usage: ClaudeUsageStats }> {
  try {
    const client = getClaudeClient()

    logger.debug('Sending request to Claude Sonnet 4', {
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
      model: 'claude-sonnet-4-20250514',
    })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
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

CRITICAL - Source Fidelity Rules (MUST FOLLOW):
- Use ONLY information explicitly stated in the provided text above
- Do NOT add definitions, explanations, or context from your general knowledge
- Do NOT elaborate on concepts beyond what the text actually provides
- If a concept is mentioned but not explained in the text, do NOT create a flashcard for it
- Every word in the "back" field must be directly traceable to the source text
- When in doubt, quote directly from the text rather than paraphrasing with external knowledge
- If the text doesn't provide enough information for ${targetCards} quality flashcards, create fewer flashcards rather than adding external information

Create exactly ${targetCards} flashcards based on the content available (or fewer if insufficient information).

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
  const systemPrompt = `You are an expert at creating CONCEPT MAPS - hierarchical, networked knowledge structures with explicit labeled relationships that promote deep understanding and knowledge integration.`

  const userPrompt = `Create a CONCEPT MAP (not a traditional mind map) from the following text:

<text>
${text}
</text>

CONCEPT MAP REQUIREMENTS:
Target: ${maxNodes} nodes, ${maxDepth} levels deep
Cross-links: ${Math.ceil(maxNodes * 0.15)} connections between different branches

KEY PRINCIPLES:
1. **Hierarchical & Networked**: Top-down (general → specific) with cross-links
2. **Explicit Relationships**: EVERY edge must have a specific linking phrase
3. **Propositional Structure**: Each edge forms: Concept1 + Linking Phrase + Concept2
4. **Cross-Links**: Connect related concepts across branches for knowledge synthesis

RELATIONSHIP TYPES (use specific, meaningful phrases):
**Hierarchical**: "includes", "consists of", "is divided into", "has types"
**Causal**: "leads to", "causes", "prevents", "results in"
**Definitional**: "is a type of", "is an example of", "characterized by"
**Functional**: "requires", "depends on", "uses", "produces"
**Comparative**: "contrasts with", "similar to", "reinforces", "applies to"

STRUCTURE:
- Level 0: Most general, inclusive concept (root)
- Level 1: 4-7 major concepts (broad categories)
- Level 2-${maxDepth - 1}: Increasingly specific subconcepts
- Include ${Math.ceil(maxNodes * 0.15)} cross-links between different branches

NODE LABELS: Use concise noun phrases (1-6 words)
DESCRIPTIONS: Provide context, examples, or significance

Respond with a JSON object in this exact format:
{
  "title": "Root Concept",
  "nodes": [
    {
      "id": "snake_case_id",
      "label": "Concept Label",
      "description": "Detailed explanation with context",
      "level": 0,
      "category": "concept"
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "from": "source_node_id",
      "to": "target_node_id",
      "relationship": "specific linking phrase"
    }
  ],
  "metadata": {
    "totalNodes": ${maxNodes},
    "maxDepth": ${maxDepth}
  }
}

CRITICAL: Use "from" and "to" fields (NOT "source" and "target")
CRITICAL: Include meaningful "relationship" labels on ALL edges
CRITICAL: Add cross-links connecting concepts from different branches

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
