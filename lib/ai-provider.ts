/**
 * AI Provider Abstraction Layer
 *
 * Intelligent routing between OpenAI, Claude, and Gemini based on:
 * - Document size (context window requirements)
 * - Cost optimization
 * - Quality requirements
 * - Operation type
 *
 * Routing Strategy:
 * - Small docs (< 100K chars): GPT-3.5-turbo (fast, cheap)
 * - Medium docs (100K-800K chars): Claude 3.5 Sonnet (quality, good context)
 * - Large docs (> 800K chars): Gemini 1.5 Pro (massive context)
 */

import { logger } from './logger'
import { Flashcard } from './types'
import { generateFlashcards } from './openai'
import { generateFlashcardsWithClaude, chatWithClaude, generateMindMapWithClaude } from './anthropic'
import { generateFlashcardsWithGemini, chatWithGemini } from './gemini'
import { generateFlashcardsWithDeepSeek, chatWithDeepSeek } from './deepseek'

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek'
export type OperationType = 'flashcards' | 'chat' | 'mindmap' | 'podcast'

export interface ProviderSelection {
  provider: AIProvider
  reason: string
  estimatedCost: number
}

/**
 * Context window limits (in characters, approximate)
 * - DeepSeek: ~100K chars (similar to GPT-3.5)
 * - GPT-3.5: ~100K chars (25K tokens * 4 chars/token)
 * - Claude 3.5 Sonnet: ~800K chars (200K tokens * 4 chars/token)
 * - Gemini 1.5 Pro: ~8M chars (2M tokens * 4 chars/token)
 */
const CONTEXT_LIMITS = {
  deepseek: 100000, // 100K chars
  openai: 100000, // 100K chars
  claude: 800000, // 800K chars
  gemini: 8000000, // 8M chars
}

/**
 * Cost per million tokens (approximate USD)
 */
const COST_PER_MILLION = {
  deepseek: { input: 0.14, output: 0.28 }, // DeepSeek - 10x cheaper!
  openai: { input: 0.5, output: 1.5 }, // GPT-3.5-turbo
  claude: { input: 3.0, output: 15.0 }, // Claude 3.5 Sonnet
  gemini: { input: 7.0, output: 21.0 }, // Gemini 1.5 Pro
}

/**
 * Select optimal AI provider based on document size and operation
 *
 * NEW: Respects feature-based provider configuration from lib/ai/index.ts
 * For flashcards, we now ALWAYS use Claude for premium quality
 */
export function selectAIProvider(
  textLength: number,
  operation: OperationType
): ProviderSelection {
  // Estimate tokens (rough: 4 chars per token)
  const estimatedTokens = Math.ceil(textLength / 4)

  logger.debug('Selecting AI provider', {
    textLength,
    estimatedTokens,
    operation,
  })

  // FEATURE-BASED OVERRIDE: Flashcards always use Claude for premium quality
  // This creates superior cards that WOW first-time users
  if (operation === 'flashcards') {
    const estimatedCost = (estimatedTokens / 1000000) * COST_PER_MILLION.claude.input +
                         (2000 / 1000000) * COST_PER_MILLION.claude.output

    logger.info('Using Claude for flashcards (feature configuration)', {
      textLength,
      estimatedTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
    })

    return {
      provider: 'claude',
      reason: 'Using Claude Sonnet 4 for premium flashcard quality (configured in lib/ai/index.ts)',
      estimatedCost,
    }
  }

  // For very large documents, use Gemini
  if (textLength > CONTEXT_LIMITS.claude) {
    const estimatedCost = (estimatedTokens / 1000000) * COST_PER_MILLION.gemini.input +
                         (2000 / 1000000) * COST_PER_MILLION.gemini.output

    logger.info('Selected Gemini for large document', {
      textLength,
      estimatedTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
    })

    return {
      provider: 'gemini',
      reason: `Document size (${Math.round(textLength / 1000)}K chars) exceeds Claude limit. Using Gemini 1.5 Pro for massive context.`,
      estimatedCost,
    }
  }

  // For medium-large documents, use Claude (better quality than GPT-3.5)
  if (textLength > CONTEXT_LIMITS.openai) {
    const estimatedCost = (estimatedTokens / 1000000) * COST_PER_MILLION.claude.input +
                         (2000 / 1000000) * COST_PER_MILLION.claude.output

    logger.info('Selected Claude for medium-large document', {
      textLength,
      estimatedTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
    })

    return {
      provider: 'claude',
      reason: `Document size (${Math.round(textLength / 1000)}K chars) is optimal for Claude 3.5 Sonnet (best quality/cost balance).`,
      estimatedCost,
    }
  }

  // For small documents, use DeepSeek (10x cheaper than OpenAI!)
  // Check if DeepSeek is available
  if (process.env.DEEPSEEK_API_KEY) {
    const estimatedCost = (estimatedTokens / 1000000) * COST_PER_MILLION.deepseek.input +
                         (2000 / 1000000) * COST_PER_MILLION.deepseek.output

    logger.info('Selected DeepSeek for small document', {
      textLength,
      estimatedTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
    })

    return {
      provider: 'deepseek',
      reason: `Document size (${Math.round(textLength / 1000)}K chars) is optimal for DeepSeek (10x cheaper than GPT-3.5, same quality).`,
      estimatedCost,
    }
  }

  // Fallback to OpenAI if DeepSeek not available
  const estimatedCost = (estimatedTokens / 1000000) * COST_PER_MILLION.openai.input +
                       (2000 / 1000000) * COST_PER_MILLION.openai.output

  logger.info('Selected OpenAI for small document (DeepSeek not available)', {
    textLength,
    estimatedTokens,
    estimatedCost: `$${estimatedCost.toFixed(4)}`,
  })

  return {
    provider: 'openai',
    reason: `Document size (${Math.round(textLength / 1000)}K chars) is optimal for GPT-3.5-turbo (DeepSeek not configured).`,
    estimatedCost,
  }
}

/**
 * Generate flashcards with automatic provider selection
 */
export async function generateFlashcardsAuto(
  text: string,
  options: any = {}
): Promise<{ flashcards: Flashcard[]; provider: AIProvider; providerReason: string }> {
  const selection = selectAIProvider(text.length, 'flashcards')

  logger.info('Generating flashcards with auto provider selection', {
    provider: selection.provider,
    reason: selection.reason,
  })

  let rawFlashcards: any[]

  try {
    if (selection.provider === 'deepseek') {
      // Calculate target cards based on content
      const wordCount = text.split(/\s+/).length
      const targetCards = Math.max(5, Math.min(Math.floor(wordCount / 250), 50))

      logger.info('Attempting DeepSeek flashcard generation', { targetCards, textLength: text.length })
      rawFlashcards = await generateFlashcardsWithDeepSeek(text, targetCards)
      logger.info('DeepSeek flashcard generation successful', { count: rawFlashcards.length })
    } else if (selection.provider === 'gemini') {
      // Calculate target cards based on content
      const wordCount = text.split(/\s+/).length
      const targetCards = Math.max(5, Math.min(Math.floor(wordCount / 250), 50))

      logger.info('Attempting Gemini flashcard generation', { targetCards, textLength: text.length })
      rawFlashcards = await generateFlashcardsWithGemini(text, targetCards)
      logger.info('Gemini flashcard generation successful', { count: rawFlashcards.length })
    } else if (selection.provider === 'claude') {
      // Use user-specified count or calculate based on content
      let targetCards: number

      if (options.count !== undefined && options.count > 0) {
        // User specified exact count - respect it with reasonable limits
        targetCards = Math.max(5, Math.min(options.count, 50))
        logger.info('Using user-specified flashcard count', {
          requested: options.count,
          actual: targetCards,
          textLength: text.length
        })
      } else {
        // Auto-calculate based on content length
        const wordCount = text.split(/\s+/).length
        targetCards = Math.max(5, Math.min(Math.floor(wordCount / 250), 30)) // Default auto mode capped at 30
        logger.info('Auto-calculated flashcard count', {
          wordCount,
          targetCards,
          textLength: text.length
        })
      }

      logger.info('Attempting Claude flashcard generation', { targetCards, textLength: text.length })
      rawFlashcards = await generateFlashcardsWithClaude(text, targetCards)
      logger.info('Claude flashcard generation successful', { count: rawFlashcards.length })
    } else {
      // Use existing OpenAI implementation
      logger.info('Using OpenAI flashcard generation', { textLength: text.length })
      return {
        flashcards: await generateFlashcards(text, options),
        provider: 'openai',
        providerReason: selection.reason,
      }
    }

    // Convert to Flashcard type
    const flashcards: Flashcard[] = rawFlashcards.map((card, index) => ({
      id: `card-${Date.now()}-${index}`,
      front: card.front || '',
      back: card.back || '',
      createdAt: new Date(),
    }))

    return {
      flashcards,
      provider: selection.provider,
      providerReason: selection.reason,
    }
  } catch (error) {
    // Log the error with full details for debugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error(`Flashcard generation failed with ${selection.provider}, attempting fallback to OpenAI`, error, {
      provider: selection.provider,
      errorMessage,
      textLength: text.length,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    })

    // ALWAYS log to console in production for visibility
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 PRODUCTION ERROR - Flashcard generation:', {
        provider: selection.provider,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      })
    }

    // Fallback to OpenAI if selected provider fails
    if (selection.provider !== 'openai') {
      try {
        logger.warn('Attempting OpenAI fallback after primary provider failure')
        const fallbackResult = await generateFlashcards(text, options)
        logger.info('OpenAI fallback successful', { count: fallbackResult.length })

        return {
          flashcards: fallbackResult,
          provider: 'openai',
          providerReason: `Fallback to OpenAI after ${selection.provider} failure: ${errorMessage}`,
        }
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        logger.error('OpenAI fallback also failed', fallbackError)

        if (process.env.NODE_ENV === 'production') {
          console.error('🔴 PRODUCTION ERROR - OpenAI fallback failed:', {
            error: fallbackErrorMessage,
            timestamp: new Date().toISOString()
          })
        }

        throw new Error(`Both ${selection.provider} and OpenAI fallback failed. ${selection.provider} error: ${errorMessage}. OpenAI error: ${fallbackErrorMessage}. Please check your API keys in environment variables.`)
      }
    }

    // If OpenAI was the original selection and it failed, throw detailed error
    throw new Error(`OpenAI flashcard generation failed: ${errorMessage}. Please check your OPENAI_API_KEY environment variable.`)
  }
}

/**
 * Chat with document using automatic provider selection
 */
export async function chatWithDocumentAuto(
  documentText: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  teachingMode: 'direct' | 'socratic' | 'guided' = 'direct'
): Promise<{ response: string; provider: AIProvider; providerReason: string }> {
  const selection = selectAIProvider(documentText.length, 'chat')

  logger.info('Chat with auto provider selection', {
    provider: selection.provider,
    reason: selection.reason,
  })

  try {
    let response: string

    if (selection.provider === 'gemini') {
      response = await chatWithGemini(documentText, conversationHistory, userMessage, teachingMode)
    } else if (selection.provider === 'claude') {
      response = await chatWithClaude(documentText, conversationHistory, userMessage, teachingMode)
    } else {
      // Use existing OpenAI implementation (import chatWithDocument from openai.ts if available)
      throw new Error('OpenAI chat not implemented in auto provider yet')
    }

    return {
      response,
      provider: selection.provider,
      providerReason: selection.reason,
    }
  } catch (error) {
    logger.error(`Chat failed with ${selection.provider}`, error)
    throw error
  }
}

/**
 * Generate mind map with automatic provider selection
 */
export async function generateMindMapAuto(
  text: string,
  maxNodes: number = 25
): Promise<{ mindMap: any; provider: AIProvider; providerReason: string }> {
  const selection = selectAIProvider(text.length, 'mindmap')

  logger.info('Generating mind map with auto provider selection', {
    provider: selection.provider,
    reason: selection.reason,
  })

  try {
    // For now, prefer Claude for mind map generation (best structured output quality)
    let mindMap: any

    if (selection.provider === 'claude' || selection.provider === 'gemini') {
      mindMap = await generateMindMapWithClaude(text, maxNodes)
    } else {
      // Use existing OpenAI implementation (import from mindmap-generator.ts)
      const { generateMindMap } = await import('./mindmap-generator')
      mindMap = await generateMindMap({ text, maxNodes, maxDepth: 3 })
    }

    return {
      mindMap,
      provider: selection.provider === 'gemini' ? 'claude' : selection.provider, // Gemini falls back to Claude for mind maps
      providerReason: selection.reason,
    }
  } catch (error) {
    logger.error(`Mind map generation failed with ${selection.provider}`, error)
    throw error
  }
}

/**
 * Get provider capabilities and status
 */
export function getProviderStatus(): {
  openai: { available: boolean; contextWindow: string }
  claude: { available: boolean; contextWindow: string }
  gemini: { available: boolean; contextWindow: string }
} {
  return {
    openai: {
      available: !!process.env.OPENAI_API_KEY,
      contextWindow: '100K chars (25K tokens)',
    },
    claude: {
      available: !!process.env.ANTHROPIC_API_KEY,
      contextWindow: '800K chars (200K tokens)',
    },
    gemini: {
      available: !!process.env.GEMINI_API_KEY,
      contextWindow: '8M chars (2M tokens)',
    },
  }
}
