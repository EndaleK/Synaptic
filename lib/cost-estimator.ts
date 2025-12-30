/**
 * AI Provider Cost Estimator
 *
 * Tracks and estimates costs for OpenAI, Claude, and Gemini API usage
 * Helps prevent budget overruns in production
 */

import { logger } from './logger'

/**
 * AI Model Pricing (Updated December 2025)
 * Prices are per 1M tokens
 */
const PRICING = {
  // DeepSeek Models (MOST COST-EFFECTIVE!)
  'deepseek-chat': {
    input: 0.14,  // $0.14 per 1M input tokens (10x cheaper than GPT-3.5!)
    output: 0.28, // $0.28 per 1M output tokens (5x cheaper than GPT-3.5!)
  },
  // OpenAI Models
  'gpt-4o-mini': {
    input: 0.15,  // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.50,  // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.00, // $10.00 per 1M input tokens
    output: 30.00, // $30.00 per 1M output tokens
  },
  // Text-to-Speech Models
  'lemonfox-tts': {
    input: 2.50,  // $2.50 per 1M characters (83% cheaper than OpenAI TTS!)
    output: 0,
  },
  'tts-1': {
    input: 15.00, // $15.00 per 1M characters
    output: 0,
  },
  'tts-1-hd': {
    input: 30.00, // $30.00 per 1M characters
    output: 0,
  },
  // Anthropic Claude Models (Updated December 2025)
  'claude-3-5-haiku-20241022': {
    input: 1.00,  // $1.00 per 1M input tokens - FAST, cost-effective
    output: 5.00, // $5.00 per 1M output tokens - for chat & Study Buddy
  },
  'claude-3-5-sonnet': {
    input: 3.00,  // $3.00 per 1M input tokens (deprecated)
    output: 15.00, // $15.00 per 1M output tokens (deprecated)
  },
  'claude-sonnet-4-20250514': {
    input: 3.00,  // $3.00 per 1M input tokens - balanced quality
    output: 15.00, // $15.00 per 1M output tokens - for flashcards, mind maps, exams
  },
  'claude-opus-4-5-20251101': {
    input: 5.00,  // $5.00 per 1M input tokens - most intelligent
    output: 25.00, // $25.00 per 1M output tokens - for complex tasks
  },
  'claude-3-opus': {
    input: 15.00, // $15.00 per 1M input tokens (legacy)
    output: 75.00, // $75.00 per 1M output tokens (legacy)
  },
  // Google Gemini Models
  'gemini-1.5-pro': {
    input: 7.00,  // $7.00 per 1M input tokens
    output: 21.00, // $21.00 per 1M output tokens
  },
  'gemini-1.5-flash': {
    input: 0.35,  // $0.35 per 1M input tokens
    output: 1.05, // $1.05 per 1M output tokens
  },
} as const

type ModelName = keyof typeof PRICING

/**
 * Rough token estimation for text
 * More accurate: use tiktoken library, but adds dependency
 * Rule of thumb: 1 token ≈ 4 characters for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model]

  if (!pricing) {
    logger.warn('Unknown model for cost calculation', { model })
    return 0
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}

/**
 * Estimate cost before making API call
 */
export function estimateRequestCost(
  model: ModelName,
  prompt: string,
  maxTokens: number
): { inputTokens: number; outputTokens: number; estimatedCost: number } {
  const inputTokens = estimateTokens(prompt)
  const outputTokens = maxTokens

  const estimatedCost = calculateCost(model, inputTokens, outputTokens)

  return {
    inputTokens,
    outputTokens,
    estimatedCost,
  }
}

/**
 * Usage tracking store (in-memory for MVP)
 */
interface UsageEntry {
  userId: string
  model: ModelName
  inputTokens: number
  outputTokens: number
  cost: number
  timestamp: Date
}

const usageLog: UsageEntry[] = []

// Maximum entries to keep in memory
const MAX_LOG_ENTRIES = 10000

/**
 * Track usage for a request
 */
export function trackUsage(
  userId: string,
  model: ModelName,
  inputTokens: number,
  outputTokens: number
) {
  const cost = calculateCost(model, inputTokens, outputTokens)

  const entry: UsageEntry = {
    userId,
    model,
    inputTokens,
    outputTokens,
    cost,
    timestamp: new Date(),
  }

  usageLog.push(entry)

  // Keep log size manageable
  if (usageLog.length > MAX_LOG_ENTRIES) {
    usageLog.shift()
  }

  // Log to console/Sentry for monitoring
  logger.cost(model, inputTokens + outputTokens, cost, {
    userId,
    inputTokens,
    outputTokens,
  })

  return cost
}

/**
 * Get usage statistics for a user
 */
export function getUserUsage(
  userId: string,
  timeframe: 'today' | 'week' | 'month' | 'all' = 'month'
): {
  totalCost: number
  totalRequests: number
  totalTokens: number
  breakdown: Record<string, { cost: number; requests: number; tokens: number }>
} {
  const now = new Date()
  const cutoff = new Date()

  switch (timeframe) {
    case 'today':
      cutoff.setHours(0, 0, 0, 0)
      break
    case 'week':
      cutoff.setDate(now.getDate() - 7)
      break
    case 'month':
      cutoff.setMonth(now.getMonth() - 1)
      break
    case 'all':
      cutoff.setFullYear(1970)
      break
  }

  const relevantEntries = usageLog.filter(
    entry => entry.userId === userId && entry.timestamp >= cutoff
  )

  const breakdown: Record<string, { cost: number; requests: number; tokens: number }> = {}

  let totalCost = 0
  let totalTokens = 0

  for (const entry of relevantEntries) {
    totalCost += entry.cost
    totalTokens += entry.inputTokens + entry.outputTokens

    if (!breakdown[entry.model]) {
      breakdown[entry.model] = { cost: 0, requests: 0, tokens: 0 }
    }

    breakdown[entry.model].cost += entry.cost
    breakdown[entry.model].requests += 1
    breakdown[entry.model].tokens += entry.inputTokens + entry.outputTokens
  }

  return {
    totalCost,
    totalRequests: relevantEntries.length,
    totalTokens,
    breakdown,
  }
}

/**
 * Check if user should be warned about usage
 */
export function shouldWarnUser(userId: string): {
  warn: boolean
  message?: string
  usage: ReturnType<typeof getUserUsage>
} {
  const usage = getUserUsage(userId, 'month')

  // Warning threshold: $5/month for free users
  const WARNING_THRESHOLD = 5.0

  if (usage.totalCost > WARNING_THRESHOLD) {
    return {
      warn: true,
      message: `You've used $${usage.totalCost.toFixed(2)} this month. Consider upgrading to Premium for unlimited access.`,
      usage,
    }
  }

  return {
    warn: false,
    usage,
  }
}

/**
 * Get cost estimate display for user
 */
export function getEstimateDisplay(estimatedCost: number): string {
  if (estimatedCost < 0.001) {
    return 'Less than $0.001'
  }

  if (estimatedCost < 0.01) {
    return `$${estimatedCost.toFixed(4)}`
  }

  return `$${estimatedCost.toFixed(2)}`
}

/**
 * Constants for usage limits
 */
export const UsageLimits = {
  FREE_TIER: {
    maxDocuments: 10,
    maxCostPerMonth: 10.0, // Hard limit: $10/month
    warningCostPerMonth: 5.0, // Warn at $5/month
  },
  PREMIUM_TIER: {
    maxDocuments: -1, // Unlimited
    maxCostPerMonth: 100.0, // Soft limit for alerting
    warningCostPerMonth: 75.0,
  },
} as const
