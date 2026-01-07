/**
 * Knowledge Gap Calculator
 *
 * Utility functions for analyzing flashcard performance and identifying knowledge gaps.
 * Used by the Knowledge Gap Dashboard to provide actionable study recommendations.
 */

import { estimateRetention } from '@/lib/spaced-repetition/sm2-algorithm'
import type { Flashcard, MaturityLevel } from '@/lib/supabase/types'

// Thresholds for gap detection
export const GAP_THRESHOLDS = {
  lowEaseFactor: 1.8,
  lowAccuracy: 0.5,
  minReviewsForAccuracy: 3,
  staleReviewDays: 14,
  atRiskRetention: 0.7,
  criticalRetention: 0.4,
  highUrgencyRetention: 0.55,
  masteryThreshold: 0.3, // 30% mature cards = topic mastered
}

export interface MasteryProgress {
  new: number
  learning: number
  young: number
  mature: number
}

export interface TopicStats {
  topic: string
  cardCount: number
  masteryProgress: MasteryProgress
  accuracy: number | null
  averageEaseFactor: number
  lastReviewedAt: Date | null
  estimatedRetention: number | null
  needsAttention: boolean
  reason: string | null
}

export interface CardGapInfo {
  id: string
  easeFactor: number
  accuracy: number
  daysSinceReview: number | null
  estimatedRetention: number | null
  isStruggling: boolean
  isAtRisk: boolean
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Calculate topic mastery percentage
 * Mastery = % of cards at 'mature' level
 */
export function calculateTopicMastery(cards: Partial<Flashcard>[]): number {
  if (cards.length === 0) return 0

  const matureCount = cards.filter(c => c.maturity_level === 'mature').length
  return Math.round((matureCount / cards.length) * 100)
}

/**
 * Calculate overall mastery across all cards
 */
export function calculateOverallMastery(cards: Partial<Flashcard>[]): number {
  return calculateTopicMastery(cards)
}

/**
 * Get maturity distribution for a set of cards
 */
export function getMasteryProgress(cards: Partial<Flashcard>[]): MasteryProgress {
  return {
    new: cards.filter(c => c.maturity_level === 'new').length,
    learning: cards.filter(c => c.maturity_level === 'learning').length,
    young: cards.filter(c => c.maturity_level === 'young').length,
    mature: cards.filter(c => c.maturity_level === 'mature').length,
  }
}

/**
 * Calculate accuracy for a set of cards
 */
export function calculateAccuracy(cards: Partial<Flashcard>[]): number | null {
  let totalCorrect = 0
  let totalReviewed = 0

  cards.forEach(card => {
    totalCorrect += card.times_correct || 0
    totalReviewed += card.times_reviewed || 0
  })

  if (totalReviewed === 0) return null
  return Math.round((totalCorrect / totalReviewed) * 100)
}

/**
 * Calculate accuracy for a single card
 */
export function calculateCardAccuracy(card: Partial<Flashcard>): number {
  const reviewed = card.times_reviewed || 0
  const correct = card.times_correct || 0

  if (reviewed === 0) return 100
  return Math.round((correct / reviewed) * 100)
}

/**
 * Check if a card is struggling (low ease or repeated failures)
 */
export function isCardStruggling(card: Partial<Flashcard>): boolean {
  const easeFactor = card.ease_factor || 2.5
  const timesReviewed = card.times_reviewed || 0
  const timesCorrect = card.times_correct || 0

  // Low ease factor
  if (easeFactor < GAP_THRESHOLDS.lowEaseFactor) {
    return true
  }

  // Low accuracy with enough reviews
  if (timesReviewed >= GAP_THRESHOLDS.minReviewsForAccuracy) {
    const accuracy = timesCorrect / timesReviewed
    if (accuracy < GAP_THRESHOLDS.lowAccuracy) {
      return true
    }
  }

  return false
}

/**
 * Check if a card is at risk of being forgotten
 */
export function isCardAtRisk(card: Partial<Flashcard>, now: Date = new Date()): boolean {
  // Must have been reviewed before
  if (!card.last_reviewed_at) return false

  // Only check young/mature cards (they've been learned)
  if (!['young', 'mature'].includes(card.maturity_level || 'new')) {
    return false
  }

  const lastReview = new Date(card.last_reviewed_at)
  const daysSinceReview = Math.floor(
    (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Must be stale
  if (daysSinceReview < GAP_THRESHOLDS.staleReviewDays) {
    return false
  }

  // Check retention
  const retention = estimateRetention(daysSinceReview, card.interval_days || 1)
  return retention < GAP_THRESHOLDS.atRiskRetention
}

/**
 * Get urgency level for a card
 */
export function getCardUrgency(
  card: Partial<Flashcard>,
  now: Date = new Date()
): 'critical' | 'high' | 'medium' | 'low' {
  const isStruggling = isCardStruggling(card)
  const atRisk = isCardAtRisk(card, now)

  if (isStruggling && atRisk) return 'critical'
  if (isStruggling && (card.ease_factor || 2.5) < 1.5) return 'critical'
  if (isStruggling) return 'high'

  if (atRisk && card.last_reviewed_at) {
    const daysSinceReview = Math.floor(
      (now.getTime() - new Date(card.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    const retention = estimateRetention(daysSinceReview, card.interval_days || 1)

    if (retention < GAP_THRESHOLDS.criticalRetention) return 'critical'
    if (retention < GAP_THRESHOLDS.highUrgencyRetention) return 'high'
    return 'medium'
  }

  return 'low'
}

/**
 * Identify all struggling cards from a set
 */
export function identifyStrugglingCards(cards: Partial<Flashcard>[]): Partial<Flashcard>[] {
  return cards
    .filter(isCardStruggling)
    .sort((a, b) => (a.ease_factor || 2.5) - (b.ease_factor || 2.5))
}

/**
 * Identify all at-risk cards from a set
 */
export function identifyAtRiskKnowledge(
  cards: Partial<Flashcard>[],
  now: Date = new Date()
): Partial<Flashcard>[] {
  return cards
    .filter(card => isCardAtRisk(card, now))
    .sort((a, b) => {
      // Sort by retention (lowest first)
      const aReview = a.last_reviewed_at ? new Date(a.last_reviewed_at) : now
      const bReview = b.last_reviewed_at ? new Date(b.last_reviewed_at) : now

      const aDays = Math.floor((now.getTime() - aReview.getTime()) / (1000 * 60 * 60 * 24))
      const bDays = Math.floor((now.getTime() - bReview.getTime()) / (1000 * 60 * 60 * 24))

      const aRetention = estimateRetention(aDays, a.interval_days || 1)
      const bRetention = estimateRetention(bDays, b.interval_days || 1)

      return aRetention - bRetention
    })
}

/**
 * Get comprehensive gap info for a card
 */
export function getCardGapInfo(
  card: Partial<Flashcard>,
  now: Date = new Date()
): CardGapInfo {
  const daysSinceReview = card.last_reviewed_at
    ? Math.floor((now.getTime() - new Date(card.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  let estimatedRetentionValue: number | null = null
  if (daysSinceReview !== null) {
    estimatedRetentionValue = Math.round(
      estimateRetention(daysSinceReview, card.interval_days || 1) * 100
    )
  }

  return {
    id: card.id || '',
    easeFactor: card.ease_factor || 2.5,
    accuracy: calculateCardAccuracy(card),
    daysSinceReview,
    estimatedRetention: estimatedRetentionValue,
    isStruggling: isCardStruggling(card),
    isAtRisk: isCardAtRisk(card, now),
    urgency: getCardUrgency(card, now),
  }
}

/**
 * Analyze a topic and return stats
 */
export function analyzeTopicStats(
  topic: string,
  cards: Partial<Flashcard>[],
  now: Date = new Date()
): TopicStats {
  const masteryProgress = getMasteryProgress(cards)
  const accuracy = calculateAccuracy(cards)

  // Average ease factor
  const avgEase = cards.length > 0
    ? cards.reduce((sum, c) => sum + (c.ease_factor || 2.5), 0) / cards.length
    : 2.5

  // Last reviewed
  const reviewDates = cards
    .filter(c => c.last_reviewed_at)
    .map(c => new Date(c.last_reviewed_at!))
  const lastReviewedAt = reviewDates.length > 0
    ? new Date(Math.max(...reviewDates.map(d => d.getTime())))
    : null

  // Estimated retention
  let avgRetention: number | null = null
  if (lastReviewedAt) {
    const retentions = cards
      .filter(c => c.last_reviewed_at)
      .map(c => {
        const days = Math.floor(
          (now.getTime() - new Date(c.last_reviewed_at!).getTime()) / (1000 * 60 * 60 * 24)
        )
        return estimateRetention(days, c.interval_days || 1)
      })
    if (retentions.length > 0) {
      avgRetention = Math.round(
        (retentions.reduce((a, b) => a + b, 0) / retentions.length) * 100
      )
    }
  }

  // Determine if needs attention
  let needsAttention = false
  let reason: string | null = null

  if (avgEase < GAP_THRESHOLDS.lowEaseFactor) {
    needsAttention = true
    reason = 'Low ease factor indicates difficulty'
  } else if (accuracy !== null && accuracy < 60) {
    needsAttention = true
    reason = 'Low accuracy needs more review'
  } else if (avgRetention !== null && avgRetention < 70) {
    needsAttention = true
    reason = 'Knowledge fading - needs refresh'
  } else if (cards.length >= 5 && masteryProgress.mature / cards.length < GAP_THRESHOLDS.masteryThreshold) {
    needsAttention = true
    reason = 'Most cards still in learning phase'
  }

  return {
    topic,
    cardCount: cards.length,
    masteryProgress,
    accuracy,
    averageEaseFactor: Math.round(avgEase * 100) / 100,
    lastReviewedAt,
    estimatedRetention: avgRetention,
    needsAttention,
    reason,
  }
}

/**
 * Estimate study time in minutes for a number of cards
 * Average: 1.5 minutes per card (based on spaced repetition research)
 */
export function estimateStudyMinutes(cardCount: number): number {
  return Math.ceil(cardCount * 1.5)
}

/**
 * Format study time for display
 */
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  if (remainingMins === 0) {
    return `~${hours}h`
  }
  return `~${hours}h ${remainingMins}m`
}

/**
 * Get color class based on mastery/accuracy percentage
 */
export function getMasteryColorClass(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
  if (percentage >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

/**
 * Get background color class based on urgency
 */
export function getUrgencyBgClass(urgency: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (urgency) {
    case 'critical':
      return 'bg-rose-100 dark:bg-rose-900/30'
    case 'high':
      return 'bg-amber-100 dark:bg-amber-900/30'
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
}

/**
 * Get text color class based on urgency
 */
export function getUrgencyTextClass(urgency: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (urgency) {
    case 'critical':
      return 'text-rose-700 dark:text-rose-300'
    case 'high':
      return 'text-amber-700 dark:text-amber-300'
    case 'medium':
      return 'text-yellow-700 dark:text-yellow-300'
    default:
      return 'text-gray-700 dark:text-gray-300'
  }
}
