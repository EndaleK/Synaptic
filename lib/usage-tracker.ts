/**
 * Usage Tracking Utility
 *
 * Tracks user usage limits for documents, API calls, and monthly costs.
 * Enforces free tier limits and prevents budget overruns.
 *
 * Features:
 * - Document count limits (10 for free tier)
 * - Monthly reset logic
 * - Cost tracking integration
 * - Usage history
 */

import { getUserUsage, UsageLimits } from './cost-estimator'
import { logger } from './logger'

// ============================================================================
// Types
// ============================================================================

export interface UsageLimits {
  maxDocuments: number
  maxCostPerMonth: number
  warningCostPerMonth: number
  maxFlashcardsPerMonth?: number
  maxPodcastsPerMonth?: number
  maxMindMapsPerMonth?: number
}

export interface UsageStats {
  documentsThisMonth: number
  flashcardsGenerated: number
  podcastsGenerated: number
  mindMapsGenerated: number
  totalCostThisMonth: number
  lastResetDate: Date
}

export interface UsageCheck {
  allowed: boolean
  reason?: string
  currentUsage?: UsageStats
  limit?: number
}

// ============================================================================
// Tier Definitions
// ============================================================================

export const FREE_TIER: UsageLimits = {
  maxDocuments: 10,
  maxCostPerMonth: 10.0,
  warningCostPerMonth: 5.0,
  maxFlashcardsPerMonth: 50,
  maxPodcastsPerMonth: 5,
  maxMindMapsPerMonth: 10
}

export const PREMIUM_TIER: UsageLimits = {
  maxDocuments: -1, // unlimited
  maxCostPerMonth: 100.0,
  warningCostPerMonth: 75.0,
  maxFlashcardsPerMonth: -1, // unlimited
  maxPodcastsPerMonth: -1, // unlimited
  maxMindMapsPerMonth: -1 // unlimited
}

// ============================================================================
// In-Memory Storage (MVP - will be replaced with database)
// ============================================================================

interface UserUsageData {
  userId: string
  documentsThisMonth: number
  flashcardsGenerated: number
  podcastsGenerated: number
  mindMapsGenerated: number
  lastResetDate: Date
  tier: 'free' | 'premium'
}

// In-memory storage (temporary until database implementation)
const usageStore = new Map<string, UserUsageData>()

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now()
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000

  for (const [userId, data] of usageStore.entries()) {
    // Remove entries older than 2 months
    if (now - data.lastResetDate.getTime() > ONE_MONTH * 2) {
      usageStore.delete(userId)
      logger.debug('Removed stale usage data', { userId })
    }
  }

  logger.debug('Usage tracker cleanup completed', {
    entriesRemaining: usageStore.size
  })
}, 60 * 60 * 1000) // Every hour

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get or create user usage data
 */
function getUserUsageData(userId: string, tier: 'free' | 'premium' = 'free'): UserUsageData {
  let userData = usageStore.get(userId)

  if (!userData) {
    userData = {
      userId,
      documentsThisMonth: 0,
      flashcardsGenerated: 0,
      podcastsGenerated: 0,
      mindMapsGenerated: 0,
      lastResetDate: new Date(),
      tier
    }
    usageStore.set(userId, userData)
    logger.debug('Created new usage data entry', { userId, tier })
  }

  // Check if we need to reset monthly counters
  const now = new Date()
  const lastReset = userData.lastResetDate

  if (now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()) {
    logger.info('Resetting monthly usage counters', {
      userId,
      previousMonth: `${lastReset.getFullYear()}-${lastReset.getMonth() + 1}`,
      currentMonth: `${now.getFullYear()}-${now.getMonth() + 1}`
    })

    userData.documentsThisMonth = 0
    userData.flashcardsGenerated = 0
    userData.podcastsGenerated = 0
    userData.mindMapsGenerated = 0
    userData.lastResetDate = now
  }

  return userData
}

/**
 * Get usage limits for a user's tier
 */
function getUserLimits(tier: 'free' | 'premium'): UsageLimits {
  return tier === 'premium' ? PREMIUM_TIER : FREE_TIER
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if user can upload a new document
 */
export function canUploadDocument(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): UsageCheck {
  const userData = getUserUsageData(userId, tier)
  const limits = getUserLimits(tier)

  // Premium tier has unlimited documents
  if (limits.maxDocuments === -1) {
    return { allowed: true }
  }

  // Check document limit
  if (userData.documentsThisMonth >= limits.maxDocuments) {
    logger.warn('Document upload blocked - limit reached', {
      userId,
      tier,
      current: userData.documentsThisMonth,
      limit: limits.maxDocuments
    })

    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.maxDocuments} documents. Upgrade to Premium for unlimited documents.`,
      currentUsage: {
        documentsThisMonth: userData.documentsThisMonth,
        flashcardsGenerated: userData.flashcardsGenerated,
        podcastsGenerated: userData.podcastsGenerated,
        mindMapsGenerated: userData.mindMapsGenerated,
        totalCostThisMonth: 0,
        lastResetDate: userData.lastResetDate
      },
      limit: limits.maxDocuments
    }
  }

  return { allowed: true }
}

/**
 * Check if user can generate flashcards
 */
export function canGenerateFlashcards(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): UsageCheck {
  const userData = getUserUsageData(userId, tier)
  const limits = getUserLimits(tier)

  // Premium tier has unlimited flashcards
  if (limits.maxFlashcardsPerMonth === -1) {
    return { allowed: true }
  }

  const maxFlashcards = limits.maxFlashcardsPerMonth || 50

  if (userData.flashcardsGenerated >= maxFlashcards) {
    logger.warn('Flashcard generation blocked - limit reached', {
      userId,
      tier,
      current: userData.flashcardsGenerated,
      limit: maxFlashcards
    })

    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${maxFlashcards} flashcard generations. Upgrade to Premium for unlimited generations.`,
      currentUsage: {
        documentsThisMonth: userData.documentsThisMonth,
        flashcardsGenerated: userData.flashcardsGenerated,
        podcastsGenerated: userData.podcastsGenerated,
        mindMapsGenerated: userData.mindMapsGenerated,
        totalCostThisMonth: 0,
        lastResetDate: userData.lastResetDate
      },
      limit: maxFlashcards
    }
  }

  return { allowed: true }
}

/**
 * Check if user can generate a podcast
 */
export function canGeneratePodcast(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): UsageCheck {
  const userData = getUserUsageData(userId, tier)
  const limits = getUserLimits(tier)

  // Premium tier has unlimited podcasts
  if (limits.maxPodcastsPerMonth === -1) {
    return { allowed: true }
  }

  const maxPodcasts = limits.maxPodcastsPerMonth || 5

  if (userData.podcastsGenerated >= maxPodcasts) {
    logger.warn('Podcast generation blocked - limit reached', {
      userId,
      tier,
      current: userData.podcastsGenerated,
      limit: maxPodcasts
    })

    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${maxPodcasts} podcast generations. Upgrade to Premium for unlimited generations.`,
      currentUsage: {
        documentsThisMonth: userData.documentsThisMonth,
        flashcardsGenerated: userData.flashcardsGenerated,
        podcastsGenerated: userData.podcastsGenerated,
        mindMapsGenerated: userData.mindMapsGenerated,
        totalCostThisMonth: 0,
        lastResetDate: userData.lastResetDate
      },
      limit: maxPodcasts
    }
  }

  return { allowed: true }
}

/**
 * Check if user can generate a mind map
 */
export function canGenerateMindMap(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): UsageCheck {
  const userData = getUserUsageData(userId, tier)
  const limits = getUserLimits(tier)

  // Premium tier has unlimited mind maps
  if (limits.maxMindMapsPerMonth === -1) {
    return { allowed: true }
  }

  const maxMindMaps = limits.maxMindMapsPerMonth || 10

  if (userData.mindMapsGenerated >= maxMindMaps) {
    logger.warn('Mind map generation blocked - limit reached', {
      userId,
      tier,
      current: userData.mindMapsGenerated,
      limit: maxMindMaps
    })

    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${maxMindMaps} mind map generations. Upgrade to Premium for unlimited generations.`,
      currentUsage: {
        documentsThisMonth: userData.documentsThisMonth,
        flashcardsGenerated: userData.flashcardsGenerated,
        podcastsGenerated: userData.podcastsGenerated,
        mindMapsGenerated: userData.mindMapsGenerated,
        totalCostThisMonth: 0,
        lastResetDate: userData.lastResetDate
      },
      limit: maxMindMaps
    }
  }

  return { allowed: true }
}

/**
 * Track a document upload
 */
export function trackDocumentUpload(userId: string, tier: 'free' | 'premium' = 'free'): void {
  const userData = getUserUsageData(userId, tier)
  userData.documentsThisMonth++

  logger.debug('Document upload tracked', {
    userId,
    tier,
    documentsThisMonth: userData.documentsThisMonth
  })
}

/**
 * Track flashcard generation
 */
export function trackFlashcardGeneration(userId: string, tier: 'free' | 'premium' = 'free'): void {
  const userData = getUserUsageData(userId, tier)
  userData.flashcardsGenerated++

  logger.debug('Flashcard generation tracked', {
    userId,
    tier,
    flashcardsGenerated: userData.flashcardsGenerated
  })
}

/**
 * Track podcast generation
 */
export function trackPodcastGeneration(userId: string, tier: 'free' | 'premium' = 'free'): void {
  const userData = getUserUsageData(userId, tier)
  userData.podcastsGenerated++

  logger.debug('Podcast generation tracked', {
    userId,
    tier,
    podcastsGenerated: userData.podcastsGenerated
  })
}

/**
 * Track mind map generation
 */
export function trackMindMapGeneration(userId: string, tier: 'free' | 'premium' = 'free'): void {
  const userData = getUserUsageData(userId, tier)
  userData.mindMapsGenerated++

  logger.debug('Mind map generation tracked', {
    userId,
    tier,
    mindMapsGenerated: userData.mindMapsGenerated
  })
}

/**
 * Get current usage statistics for a user
 */
export function getUserUsageStats(userId: string, tier: 'free' | 'premium' = 'free'): UsageStats {
  const userData = getUserUsageData(userId, tier)

  // Get cost data from cost-estimator
  const costUsage = getUserUsage(userId, 'month')

  return {
    documentsThisMonth: userData.documentsThisMonth,
    flashcardsGenerated: userData.flashcardsGenerated,
    podcastsGenerated: userData.podcastsGenerated,
    mindMapsGenerated: userData.mindMapsGenerated,
    totalCostThisMonth: costUsage.totalCost,
    lastResetDate: userData.lastResetDate
  }
}

/**
 * Check if user is approaching any limits (for warnings)
 */
export function checkUsageWarnings(
  userId: string,
  tier: 'free' | 'premium' = 'free'
): { hasWarnings: boolean; warnings: string[] } {
  const userData = getUserUsageData(userId, tier)
  const limits = getUserLimits(tier)
  const warnings: string[] = []

  // Check document limit (80% threshold)
  if (limits.maxDocuments > 0) {
    const docPercentage = (userData.documentsThisMonth / limits.maxDocuments) * 100
    if (docPercentage >= 80) {
      warnings.push(
        `You've used ${userData.documentsThisMonth} of ${limits.maxDocuments} documents (${Math.round(docPercentage)}%)`
      )
    }
  }

  // Check flashcard limit (80% threshold)
  if (limits.maxFlashcardsPerMonth && limits.maxFlashcardsPerMonth > 0) {
    const flashcardPercentage = (userData.flashcardsGenerated / limits.maxFlashcardsPerMonth) * 100
    if (flashcardPercentage >= 80) {
      warnings.push(
        `You've generated ${userData.flashcardsGenerated} of ${limits.maxFlashcardsPerMonth} flashcards (${Math.round(flashcardPercentage)}%)`
      )
    }
  }

  // Check podcast limit (80% threshold)
  if (limits.maxPodcastsPerMonth && limits.maxPodcastsPerMonth > 0) {
    const podcastPercentage = (userData.podcastsGenerated / limits.maxPodcastsPerMonth) * 100
    if (podcastPercentage >= 80) {
      warnings.push(
        `You've generated ${userData.podcastsGenerated} of ${limits.maxPodcastsPerMonth} podcasts (${Math.round(podcastPercentage)}%)`
      )
    }
  }

  // Check mind map limit (80% threshold)
  if (limits.maxMindMapsPerMonth && limits.maxMindMapsPerMonth > 0) {
    const mindMapPercentage = (userData.mindMapsGenerated / limits.maxMindMapsPerMonth) * 100
    if (mindMapPercentage >= 80) {
      warnings.push(
        `You've generated ${userData.mindMapsGenerated} of ${limits.maxMindMapsPerMonth} mind maps (${Math.round(mindMapPercentage)}%)`
      )
    }
  }

  // Check cost limit
  const costUsage = getUserUsage(userId, 'month')
  const costPercentage = (costUsage.totalCost / limits.maxCostPerMonth) * 100
  if (costPercentage >= 50) {
    warnings.push(
      `You've used $${costUsage.totalCost.toFixed(2)} of $${limits.maxCostPerMonth.toFixed(2)} monthly budget (${Math.round(costPercentage)}%)`
    )
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings
  }
}

/**
 * Reset usage counters for a user (admin function)
 */
export function resetUserUsage(userId: string): void {
  const userData = usageStore.get(userId)
  if (userData) {
    userData.documentsThisMonth = 0
    userData.flashcardsGenerated = 0
    userData.podcastsGenerated = 0
    userData.mindMapsGenerated = 0
    userData.lastResetDate = new Date()

    logger.info('User usage manually reset', { userId })
  }
}

/**
 * Get total usage count across all users (admin function)
 */
export function getTotalUsageStats(): {
  totalUsers: number
  totalDocuments: number
  totalFlashcards: number
  totalPodcasts: number
  totalMindMaps: number
} {
  let totalDocuments = 0
  let totalFlashcards = 0
  let totalPodcasts = 0
  let totalMindMaps = 0

  for (const userData of usageStore.values()) {
    totalDocuments += userData.documentsThisMonth
    totalFlashcards += userData.flashcardsGenerated
    totalPodcasts += userData.podcastsGenerated
    totalMindMaps += userData.mindMapsGenerated
  }

  return {
    totalUsers: usageStore.size,
    totalDocuments,
    totalFlashcards,
    totalPodcasts,
    totalMindMaps
  }
}
