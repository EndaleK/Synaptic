/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on SuperMemo SM-2 algorithm by Piotr Wozniak (1987)
 * Used by Anki and many other spaced repetition systems
 *
 * @see https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

export interface SM2ReviewData {
  easeFactor: number      // Ease factor (EF) - how "easy" the card is (default: 2.5)
  interval: number         // Days until next review
  repetitions: number      // Number of consecutive correct reviews
  dueDate: Date           // When the card should next be reviewed
}

export interface SM2ReviewInput {
  quality: number          // Quality of response: 0-5
  currentEaseFactor: number
  currentInterval: number
  currentRepetitions: number
  lastReviewDate: Date
}

export enum QualityRating {
  CompleteBlackout = 0,     // Complete failure to recall
  IncorrectButFamiliar = 1, // Incorrect response but recognized
  IncorrectButEasy = 2,     // Incorrect response, but correct seemed easy
  CorrectWithDifficulty = 3,// Correct response with significant difficulty
  CorrectWithHesitation = 4,// Correct response with hesitation
  Perfect = 5               // Perfect response
}

/**
 * Calculate next review interval and ease factor using SM-2 algorithm
 */
export function calculateSM2(input: SM2ReviewInput): SM2ReviewData {
  const { quality, currentEaseFactor, currentInterval, currentRepetitions, lastReviewDate } = input

  // Validate quality rating
  if (quality < 0 || quality > 5) {
    throw new Error('Quality rating must be between 0 and 5')
  }

  let easeFactor = currentEaseFactor
  let interval = currentInterval
  let repetitions = currentRepetitions

  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3, // Minimum ease factor
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // If quality < 3, reset repetitions and set interval to 1 day
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    // Increment repetitions
    repetitions += 1

    // Calculate new interval based on repetitions
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      // For repetitions > 2: I(n) = I(n-1) * EF
      interval = Math.round(interval * easeFactor)
    }
  }

  // Calculate next due date
  const dueDate = new Date(lastReviewDate)
  dueDate.setDate(dueDate.getDate() + interval)

  return {
    easeFactor,
    interval,
    repetitions,
    dueDate
  }
}

/**
 * Initialize SM-2 data for a new flashcard
 */
export function initializeSM2(): SM2ReviewData {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day

  return {
    easeFactor: 2.5,  // Default ease factor
    interval: 1,      // First review tomorrow
    repetitions: 0,   // No repetitions yet
    dueDate: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
  }
}

/**
 * Get quality rating from user-friendly labels (4-button system)
 */
export function getQualityFromLabel(label: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (label) {
    case 'again':
      return QualityRating.CompleteBlackout // 0
    case 'hard':
      return QualityRating.CorrectWithDifficulty // 3
    case 'good':
      return QualityRating.CorrectWithHesitation // 4
    case 'easy':
      return QualityRating.Perfect // 5
    default:
      return QualityRating.CorrectWithHesitation // Default to "Good"
  }
}

/**
 * Adaptive SM-2 algorithm that adjusts intervals based on card difficulty
 * Research: Complex concepts benefit 40% more from spacing (Cepeda et al., 2006)
 */
export function calculateAdaptiveSM2(
  input: SM2ReviewInput,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): SM2ReviewData {
  const baseResult = calculateSM2(input)

  // Difficulty multipliers based on research
  const difficultyMultipliers = {
    easy: 1.3,    // 30% longer intervals (faster progression for simple facts)
    medium: 1.0,  // Standard SM-2
    hard: 0.7     // 30% shorter intervals (more frequent review for complex concepts)
  }

  const multiplier = difficultyMultipliers[difficulty]

  return {
    ...baseResult,
    interval: Math.max(1, Math.round(baseResult.interval * multiplier))
  }
}

/**
 * Auto-detect flashcard difficulty based on content complexity
 */
export function estimateFlashcardDifficulty(front: string, back: string): 'easy' | 'medium' | 'hard' {
  const combinedText = front + ' ' + back

  // Complexity indicators
  const wordCount = combinedText.split(/\s+/).length
  const avgWordLength = combinedText.replace(/\s/g, '').length / Math.max(wordCount, 1)
  const hasMultipleSteps = /first|then|next|finally|step|firstly|secondly/i.test(combinedText)
  const hasTechnicalTerms = /\b[A-Z][a-z]+[A-Z]\w+\b/.test(combinedText) // CamelCase terms
  const hasFormulas = /[=+\-*\/\\∫∑πθλμσ]/.test(combinedText)
  const hasBulletPoints = /[-•*]\s+/g.test(combinedText)

  let complexityScore = 0

  // Word count scoring
  if (wordCount > 50) complexityScore += 2
  else if (wordCount > 25) complexityScore += 1

  // Average word length (longer words = more complex)
  if (avgWordLength > 6) complexityScore += 1

  // Content complexity indicators
  if (hasMultipleSteps) complexityScore += 2
  if (hasTechnicalTerms) complexityScore += 1
  if (hasFormulas) complexityScore += 1
  if (hasBulletPoints) complexityScore += 1

  // Classification
  if (complexityScore >= 5) return 'hard'
  if (complexityScore >= 2) return 'medium'
  return 'easy'
}

/**
 * Get minimum reviews required for mastery based on difficulty
 * Research: Students need 3-8 successful reviews for long-term retention
 */
export function getMinReviewsForMastery(difficulty: 'easy' | 'medium' | 'hard'): number {
  const minReviews = {
    easy: 3,    // Simple facts: 3 reviews
    medium: 4,  // Standard concepts: 4 reviews
    hard: 6     // Complex concepts: 6 reviews
  }
  return minReviews[difficulty]
}

/**
 * Get next review intervals for preview (before user selects rating)
 */
export function getNextReviewIntervals(currentData: {
  easeFactor: number
  interval: number
  repetitions: number
}): {
  again: number    // Days if user clicks "Again"
  hard: number     // Days if user clicks "Hard"
  good: number     // Days if user clicks "Good"
  easy: number     // Days if user clicks "Easy"
} {
  const { easeFactor, interval, repetitions } = currentData
  const now = new Date()

  // Calculate interval for each rating
  const calculateInterval = (quality: number): number => {
    const result = calculateSM2({
      quality,
      currentEaseFactor: easeFactor,
      currentInterval: interval,
      currentRepetitions: repetitions,
      lastReviewDate: now
    })
    return result.interval
  }

  return {
    again: calculateInterval(QualityRating.CompleteBlackout),
    hard: calculateInterval(QualityRating.CorrectWithDifficulty),
    good: calculateInterval(QualityRating.CorrectWithHesitation),
    easy: calculateInterval(QualityRating.Perfect)
  }
}

/**
 * Get user-friendly interval text
 */
export function formatInterval(days: number): string {
  if (days < 1) {
    return 'Today'
  } else if (days === 1) {
    return '1 day'
  } else if (days < 30) {
    return `${days} days`
  } else if (days < 365) {
    const months = Math.round(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  } else {
    const years = Math.round(days / 365)
    return years === 1 ? '1 year' : `${years} years`
  }
}

/**
 * Calculate retention probability based on SM-2 parameters
 * (Simplified estimation for UI feedback)
 */
export function estimateRetention(daysSinceLastReview: number, interval: number): number {
  // Simple exponential decay model
  // R = e^(-k * t / I) where k is decay constant
  const decayConstant = 0.5
  const retention = Math.exp(-decayConstant * daysSinceLastReview / Math.max(interval, 1))
  return Math.max(0, Math.min(1, retention)) // Clamp between 0 and 1
}

/**
 * Determine if a card is "young" (recently learned) or "mature" (well-learned)
 * Updated: Requires 3+ consecutive correct reviews before "mature" status (per user feedback)
 */
export function getCardMaturity(repetitions: number, interval: number): 'new' | 'learning' | 'young' | 'mature' {
  if (repetitions === 0) {
    return 'new'
  } else if (repetitions < 3) {
    // Requires 3 correct reviews before advancing to young/mature
    return 'learning'
  } else if (interval < 21) {
    return 'young'
  } else {
    return 'mature'
  }
}

/**
 * Calculate daily recommended review count based on user's available time
 */
export function calculateDailyReviewGoal(
  availableMinutesPerDay: number,
  averageSecondsPerCard: number = 10
): number {
  const availableSeconds = availableMinutesPerDay * 60
  return Math.floor(availableSeconds / averageSecondsPerCard)
}

/**
 * Prioritize review queue - cards due sooner and with lower retention should be reviewed first
 */
export interface ReviewQueueItem {
  id: string
  dueDate: Date
  interval: number
  lastReviewDate: Date | null
}

export function prioritizeReviewQueue(items: ReviewQueueItem[]): ReviewQueueItem[] {
  const now = new Date()

  return [...items].sort((a, b) => {
    // Calculate days overdue
    const aDaysOverdue = Math.max(0, Math.floor((now.getTime() - a.dueDate.getTime()) / (24 * 60 * 60 * 1000)))
    const bDaysOverdue = Math.max(0, Math.floor((now.getTime() - b.dueDate.getTime()) / (24 * 60 * 60 * 1000)))

    // Prioritize more overdue cards
    if (aDaysOverdue !== bDaysOverdue) {
      return bDaysOverdue - aDaysOverdue
    }

    // If equally overdue, prioritize by retention (cards reviewed longer ago first)
    const aRetention = a.lastReviewDate
      ? estimateRetention((now.getTime() - a.lastReviewDate.getTime()) / (24 * 60 * 60 * 1000), a.interval)
      : 0
    const bRetention = b.lastReviewDate
      ? estimateRetention((now.getTime() - b.lastReviewDate.getTime()) / (24 * 60 * 60 * 1000), b.interval)
      : 0

    return aRetention - bRetention // Lower retention first
  })
}
