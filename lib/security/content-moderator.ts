/**
 * Content Moderation
 *
 * Uses OpenAI Moderation API to detect harmful content including:
 * - Hate speech
 * - Harassment
 * - Violence
 * - Self-harm
 * - Sexual content
 * - Illegal activities
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ModerationResult {
  isSafe: boolean
  reason?: string
  categories?: string[]
  flagged?: boolean
}

/**
 * Moderate content using OpenAI Moderation API
 *
 * Free to use, very fast (~200ms), highly accurate
 * Automatically flags harmful content across multiple categories
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
  // Skip moderation if OpenAI API key not configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[Content Moderator] OpenAI API key not configured, skipping moderation')
    return { isSafe: true }
  }

  try {
    const moderation = await openai.moderations.create({
      input: content,
      model: 'omni-moderation-latest' // Updated model (text-moderation-latest deprecated)
    })

    const result = moderation.results[0]

    if (result.flagged) {
      // Find which categories were flagged
      const flaggedCategories: string[] = []
      const categoryScores: Record<string, number> = {}

      for (const [category, flagged] of Object.entries(result.categories)) {
        if (flagged) {
          flaggedCategories.push(category)
          categoryScores[category] = (result.category_scores as any)[category]
        }
      }

      // Sort by severity (highest score first)
      flaggedCategories.sort((a, b) => categoryScores[b] - categoryScores[a])

      return {
        isSafe: false,
        reason: `Content violates policy: ${formatCategoryNames(flaggedCategories)}`,
        categories: flaggedCategories,
        flagged: true
      }
    }

    return {
      isSafe: true,
      flagged: false
    }
  } catch (error) {
    console.error('[Content Moderator] Moderation API error:', error)

    // Fail open (allow content) rather than fail closed (block everything)
    // But log the error for monitoring
    return {
      isSafe: true,
      reason: 'Moderation check failed, allowing content'
    }
  }
}

/**
 * Format category names for user-friendly error messages
 */
function formatCategoryNames(categories: string[]): string {
  const friendlyNames: Record<string, string> = {
    'hate': 'hate speech',
    'hate/threatening': 'threatening hate speech',
    'harassment': 'harassment',
    'harassment/threatening': 'threatening harassment',
    'self-harm': 'self-harm content',
    'self-harm/intent': 'self-harm intent',
    'self-harm/instructions': 'self-harm instructions',
    'sexual': 'sexual content',
    'sexual/minors': 'sexual content involving minors',
    'violence': 'violent content',
    'violence/graphic': 'graphic violence'
  }

  const formatted = categories.map(cat => friendlyNames[cat] || cat)

  if (formatted.length === 1) {
    return formatted[0]
  } else if (formatted.length === 2) {
    return `${formatted[0]} and ${formatted[1]}`
  } else {
    const last = formatted.pop()
    return `${formatted.join(', ')}, and ${last}`
  }
}

/**
 * Batch moderation for multiple messages
 * More efficient when checking conversation history
 */
export async function moderateMessages(messages: string[]): Promise<ModerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { isSafe: true }
  }

  try {
    const moderation = await openai.moderations.create({
      input: messages,
      model: 'omni-moderation-latest'
    })

    const flaggedResults = moderation.results.filter(r => r.flagged)

    if (flaggedResults.length > 0) {
      const allFlaggedCategories = new Set<string>()

      flaggedResults.forEach(result => {
        Object.entries(result.categories).forEach(([category, flagged]) => {
          if (flagged) {
            allFlaggedCategories.add(category)
          }
        })
      })

      return {
        isSafe: false,
        reason: `${flaggedResults.length} message(s) violate policy`,
        categories: Array.from(allFlaggedCategories),
        flagged: true
      }
    }

    return {
      isSafe: true,
      flagged: false
    }
  } catch (error) {
    console.error('[Content Moderator] Batch moderation error:', error)
    return { isSafe: true }
  }
}
