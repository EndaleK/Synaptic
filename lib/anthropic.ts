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
  } catch (error: unknown) {
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
  const systemPrompt = `You are an expert medical educator who creates comprehensive, accurate flashcards from educational content. You excel at extracting ALL important concepts and ensuring flashcards stay focused on the provided content's topic.`

  // Detect if this appears to be medical/pharmacology content
  const isMedical = /pharmacolog|toxicolog|drug|dosage|mechanism|receptor|adverse|therapeutic|antidote|overdose|medication/i.test(text)
  const topicFocus = isMedical
    ? `This appears to be medical/pharmacology content. Focus exclusively on:\n- Drug names, classes, and mechanisms of action\n- Therapeutic uses and indications\n- Dosages and administration\n- Adverse effects and contraindications\n- Drug interactions\n- Toxicology concepts (overdose symptoms, antidotes, management)\n- Pharmacokinetics (absorption, distribution, metabolism, excretion)\n`
    : ``

  const userPrompt = `You are tasked with creating flashcards from educational content. Your goal is to generate EXACTLY ${targetCards} flashcards covering ALL key concepts.

${topicFocus}
<text_content>
${text}
</text_content>

REQUIREMENTS:
1. Generate EXACTLY ${targetCards} flashcards - this count is mandatory, not a suggestion
2. Cover ALL major concepts, terms, and facts from the text
3. Each flashcard must be DIRECTLY derived from the provided text
4. For medical content: include drug names, mechanisms, side effects, dosages, interactions
5. Vary flashcard types: definitions, mechanisms, comparisons, clinical applications
6. Keep front side concise (1-8 words), back side comprehensive but under 60 words

CRITICAL - Topic & Source Rules:
- ONLY create flashcards about topics explicitly covered in the text above
- Do NOT add information from your general knowledge base
- Do NOT create flashcards about topics not mentioned in this specific text
- Every answer must be verifiable against the provided text
- If unsure whether something is in the text, don't include it

SKIP these content types - do NOT create flashcards for:
- Table of contents entries or page numbers
- Copyright, publisher, or ISBN information
- Author biographical information (education, career, affiliations)
- Acknowledgments, dedications, or thank-you sections
- Index entries or reference page listings
- Bibliography or reference list entries (unless studying citation formats)
- Generic headers, footers, or repeated navigation elements

MANDATORY OUTPUT: Generate exactly ${targetCards} flashcards as a JSON array:
[
  {
    "front": "Term, concept, or question",
    "back": "Definition, explanation, or answer from the text"
  }
]

Remember: You MUST generate ${targetCards} flashcards. Cover the material comprehensively.
DO NOT include any text outside the JSON array.`

  // Calculate required tokens: ~150 chars per card, 4 chars per token
  // For 50 cards: 50 * 150 / 4 = 1875 tokens, add buffer
  const estimatedTokens = Math.ceil(targetCards * 150 / 4) + 500
  const maxTokens = Math.max(2000, Math.min(estimatedTokens, 8000))

  logger.info('Generating flashcards with Claude', {
    targetCards,
    textLength: text.length,
    maxTokens,
    isMedical,
  })

  const result = await generateClaudeCompletion(systemPrompt, [
    {
      role: 'user',
      content: userPrompt,
    },
  ], {
    maxTokens,
    temperature: 0.3,
  })

  try {
    // Remove markdown code blocks if present
    const responseText = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const parsedFlashcards = JSON.parse(responseText)

    if (!Array.isArray(parsedFlashcards)) {
      throw new Error('Response is not an array')
    }

    logger.info('Claude flashcards generated', {
      requested: targetCards,
      generated: parsedFlashcards.length,
      percentMatch: Math.round((parsedFlashcards.length / targetCards) * 100),
    })

    return parsedFlashcards
  } catch (parseError) {
    logger.error('Failed to parse Claude flashcard response', parseError, {
      responseLength: result.content.length,
      responsePreview: result.content.substring(0, 200),
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
    const responseText = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const mindMapData = JSON.parse(responseText)

    return mindMapData
  } catch (parseError) {
    logger.error('Failed to parse Claude mind map response', parseError, {
      responseLength: result.content.length,
    })
    throw new Error('Failed to parse mind map data from Claude response')
  }
}
