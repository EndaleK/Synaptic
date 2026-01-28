/**
 * Behavioral Learning Style Inference Algorithm
 *
 * Analyzes user behavior (mode usage patterns) to infer learning style preferences.
 * Blends behavioral scores with quiz results for progressively personalized experience.
 */

import type { LearningStyle } from '@/lib/supabase/types'

// ============================================================================
// Types
// ============================================================================

export interface ModeEngagement {
  sessions: number
  totalSeconds: number
  completedActions: number
}

export interface BehavioralScores {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
  confidence: number
  dominantStyle: LearningStyle
  totalSessions: number
}

export interface BlendedScores {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
  dominantStyle: LearningStyle
  blendRatio: number
}

export interface QuizScores {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
}

// ============================================================================
// Mode-to-VARK Mapping
// ============================================================================

/**
 * Weights mapping each study mode to VARK learning style dimensions.
 * Values represent how strongly each mode correlates with each style (0.0-1.0).
 *
 * Rationale:
 * - mindmap: Highly visual (spatial, hierarchical structure)
 * - podcast/quick-summary: Auditory (audio content)
 * - flashcards: Reading/writing + kinesthetic (active recall, manipulation)
 * - chat: Kinesthetic (interactive, conversational learning)
 * - video: Visual + auditory (multimedia)
 * - writer: Reading/writing (text composition)
 * - exam: Kinesthetic + reading (active testing)
 */
export const MODE_VARK_WEIGHTS: Record<
  string,
  { visual: number; auditory: number; kinesthetic: number; readingWriting: number }
> = {
  mindmap: { visual: 0.9, auditory: 0.1, kinesthetic: 0.2, readingWriting: 0.3 },
  podcast: { visual: 0.1, auditory: 0.9, kinesthetic: 0.2, readingWriting: 0.2 },
  'quick-summary': { visual: 0.1, auditory: 0.85, kinesthetic: 0.2, readingWriting: 0.25 },
  flashcards: { visual: 0.4, auditory: 0.2, kinesthetic: 0.5, readingWriting: 0.7 },
  chat: { visual: 0.2, auditory: 0.3, kinesthetic: 0.8, readingWriting: 0.5 },
  video: { visual: 0.7, auditory: 0.7, kinesthetic: 0.3, readingWriting: 0.2 },
  writer: { visual: 0.2, auditory: 0.1, kinesthetic: 0.4, readingWriting: 0.9 },
  exam: { visual: 0.3, auditory: 0.1, kinesthetic: 0.7, readingWriting: 0.6 },
  studyguide: { visual: 0.4, auditory: 0.2, kinesthetic: 0.3, readingWriting: 0.8 },
  classes: { visual: 0.5, auditory: 0.5, kinesthetic: 0.4, readingWriting: 0.5 },
}

// ============================================================================
// Confidence Calculation
// ============================================================================

/**
 * Calculate confidence level based on number of sessions.
 * Uses exponential decay formula: 1 - e^(-0.05 * sessions)
 *
 * Results:
 * - 10 sessions → 0.39 confidence
 * - 20 sessions → 0.63 confidence
 * - 50 sessions → 0.92 confidence
 * - Maximum approaches 1.0 asymptotically
 *
 * @param totalSessions - Total number of mode selection sessions
 * @returns Confidence value between 0 and 1
 */
export function calculateConfidence(totalSessions: number): number {
  const decayRate = 0.05
  const confidence = 1 - Math.exp(-decayRate * totalSessions)
  // Cap at 0.95 to indicate we never have perfect confidence
  return Math.min(confidence, 0.95)
}

// ============================================================================
// Behavioral Score Calculation
// ============================================================================

/**
 * Calculate behavioral VARK scores from mode engagement data.
 *
 * Algorithm:
 * 1. For each mode, calculate weighted engagement score
 * 2. Engagement = (sessions * 0.5) + (completedActions * 0.3) + (minutes * 0.2)
 * 3. Apply mode-to-VARK weights
 * 4. Normalize to 0-100 scale
 *
 * @param modeEngagement - Map of mode to engagement metrics
 * @returns Calculated behavioral scores
 */
export function calculateBehavioralScores(
  modeEngagement: Record<string, ModeEngagement>
): BehavioralScores {
  // Calculate raw weighted scores
  const rawScores = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    readingWriting: 0,
  }

  let totalWeight = 0
  let totalSessions = 0

  for (const [mode, engagement] of Object.entries(modeEngagement)) {
    const weights = MODE_VARK_WEIGHTS[mode]
    if (!weights) continue

    totalSessions += engagement.sessions

    // Calculate engagement weight for this mode
    // Emphasize completed actions and session count over raw time
    const minutes = Math.floor(engagement.totalSeconds / 60)
    const engagementWeight =
      engagement.sessions * 0.5 +
      engagement.completedActions * 0.3 +
      Math.min(minutes, 100) * 0.02 // Cap time contribution

    totalWeight += engagementWeight

    // Apply mode-to-VARK weights
    rawScores.visual += weights.visual * engagementWeight
    rawScores.auditory += weights.auditory * engagementWeight
    rawScores.kinesthetic += weights.kinesthetic * engagementWeight
    rawScores.readingWriting += weights.readingWriting * engagementWeight
  }

  // Normalize to 0-100 scale
  // If no engagement, return neutral scores (50)
  if (totalWeight === 0) {
    return {
      visual: 50,
      auditory: 50,
      kinesthetic: 50,
      readingWriting: 50,
      confidence: 0,
      dominantStyle: 'mixed',
      totalSessions: 0,
    }
  }

  // Normalize - find max raw score to scale appropriately
  const maxRaw = Math.max(
    rawScores.visual,
    rawScores.auditory,
    rawScores.kinesthetic,
    rawScores.readingWriting
  )

  // Scale so max score is around 85 (leaving room for growth)
  // and minimum score is around 20 (no style should be completely absent)
  const scaleFactor = maxRaw > 0 ? 65 / maxRaw : 1
  const baseScore = 20

  const normalizedScores = {
    visual: Math.round(baseScore + rawScores.visual * scaleFactor),
    auditory: Math.round(baseScore + rawScores.auditory * scaleFactor),
    kinesthetic: Math.round(baseScore + rawScores.kinesthetic * scaleFactor),
    readingWriting: Math.round(baseScore + rawScores.readingWriting * scaleFactor),
  }

  // Determine dominant style
  const dominantStyle = determineDominantStyle(normalizedScores)

  return {
    ...normalizedScores,
    confidence: calculateConfidence(totalSessions),
    dominantStyle,
    totalSessions,
  }
}

// ============================================================================
// Blended Score Calculation
// ============================================================================

/**
 * Calculate blended scores combining quiz results with behavioral data.
 *
 * Formula:
 *   blended = quiz * (1 - adjustedRatio) + behavioral * adjustedRatio
 *   adjustedRatio = baseRatio * behavioralConfidence
 *
 * With baseRatio = 0.3:
 * - At 0 confidence: 100% quiz scores
 * - At 0.5 confidence: 85% quiz / 15% behavioral
 * - At 1.0 confidence: 70% quiz / 30% behavioral
 *
 * @param quizScores - Original VARK scores from quiz
 * @param behavioralScores - Calculated behavioral scores
 * @param baseRatio - Maximum influence of behavioral scores (default 0.3)
 * @returns Blended scores
 */
export function calculateBlendedScores(
  quizScores: QuizScores,
  behavioralScores: BehavioralScores,
  baseRatio: number = 0.3
): BlendedScores {
  // Adjust ratio based on confidence
  const adjustedRatio = baseRatio * behavioralScores.confidence

  const blended = {
    visual: Math.round(
      quizScores.visual * (1 - adjustedRatio) + behavioralScores.visual * adjustedRatio
    ),
    auditory: Math.round(
      quizScores.auditory * (1 - adjustedRatio) + behavioralScores.auditory * adjustedRatio
    ),
    kinesthetic: Math.round(
      quizScores.kinesthetic * (1 - adjustedRatio) + behavioralScores.kinesthetic * adjustedRatio
    ),
    readingWriting: Math.round(
      quizScores.readingWriting * (1 - adjustedRatio) +
        behavioralScores.readingWriting * adjustedRatio
    ),
  }

  const dominantStyle = determineDominantStyle(blended)

  return {
    ...blended,
    dominantStyle,
    blendRatio: adjustedRatio,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the dominant learning style from scores.
 * Returns 'mixed' if top two scores are within 10 points.
 */
export function determineDominantStyle(scores: {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
}): LearningStyle {
  const scoreArray: [LearningStyle, number][] = [
    ['visual', scores.visual],
    ['auditory', scores.auditory],
    ['kinesthetic', scores.kinesthetic],
    ['reading_writing', scores.readingWriting],
  ]

  // Sort by score descending
  scoreArray.sort((a, b) => b[1] - a[1])

  const [topStyle, topScore] = scoreArray[0]
  const [, secondScore] = scoreArray[1]

  // If top two are within 10 points, consider it mixed
  if (topScore - secondScore < 10) {
    return 'mixed'
  }

  return topStyle
}

/**
 * Check if behavioral style significantly diverges from quiz style.
 * Used to prompt users about potential style mismatch.
 *
 * @param quizStyle - Dominant style from quiz
 * @param behavioralScores - Calculated behavioral scores
 * @returns Object with divergence info
 */
export function checkStyleDivergence(
  quizStyle: LearningStyle,
  behavioralScores: BehavioralScores
): {
  hasDivergence: boolean
  divergenceAmount: number
  suggestedStyle: LearningStyle | null
} {
  // Only check if we have enough confidence
  if (behavioralScores.confidence < 0.5) {
    return { hasDivergence: false, divergenceAmount: 0, suggestedStyle: null }
  }

  // Map styles to score keys
  const styleToKey: Record<LearningStyle, keyof Omit<BehavioralScores, 'confidence' | 'dominantStyle' | 'totalSessions'>> = {
    visual: 'visual',
    auditory: 'auditory',
    kinesthetic: 'kinesthetic',
    reading_writing: 'readingWriting',
    mixed: 'visual', // For mixed, compare against visual as baseline
  }

  // Get quiz style score in behavioral data
  const quizStyleKey = styleToKey[quizStyle]
  const quizStyleBehavioralScore = behavioralScores[quizStyleKey]

  // Get behavioral dominant style score
  const behavioralStyleKey = styleToKey[behavioralScores.dominantStyle]
  const behavioralDominantScore = behavioralScores[behavioralStyleKey]

  // Check divergence: behavioral dominant significantly higher than quiz style
  const divergenceAmount = behavioralDominantScore - quizStyleBehavioralScore

  // Significant divergence: >20 points difference and behavioral style is different
  const hasDivergence =
    divergenceAmount > 20 && behavioralScores.dominantStyle !== quizStyle

  return {
    hasDivergence,
    divergenceAmount,
    suggestedStyle: hasDivergence ? behavioralScores.dominantStyle : null,
  }
}

/**
 * Get recommended modes based on learning style (for ordering dashboard tiles).
 */
export function getRecommendedModeOrder(
  style: LearningStyle
): string[] {
  const modeOrderByStyle: Record<LearningStyle, string[]> = {
    visual: ['mindmap', 'video', 'flashcards', 'chat', 'exam', 'podcast', 'quick-summary', 'writer'],
    auditory: ['podcast', 'quick-summary', 'video', 'chat', 'flashcards', 'mindmap', 'exam', 'writer'],
    kinesthetic: ['chat', 'exam', 'flashcards', 'mindmap', 'video', 'podcast', 'quick-summary', 'writer'],
    reading_writing: ['flashcards', 'writer', 'studyguide', 'mindmap', 'chat', 'exam', 'video', 'podcast'],
    mixed: ['flashcards', 'chat', 'podcast', 'quick-summary', 'exam', 'mindmap', 'writer', 'video'],
  }

  return modeOrderByStyle[style] || modeOrderByStyle.mixed
}

/**
 * Reorder modes based on engagement data (most used first).
 * Only applied when user has >10 sessions for meaningful data.
 */
export function reorderModesByEngagement(
  modes: Array<{ id: string; [key: string]: unknown }>,
  modeEngagement: Record<string, ModeEngagement>,
  minSessions: number = 10
): Array<{ id: string; [key: string]: unknown }> {
  // Calculate total sessions
  const totalSessions = Object.values(modeEngagement).reduce(
    (sum, m) => sum + m.sessions,
    0
  )

  // Don't reorder if not enough data
  if (totalSessions < minSessions) {
    return modes
  }

  // Create engagement score for each mode
  const engagementScores: Record<string, number> = {}
  for (const [mode, engagement] of Object.entries(modeEngagement)) {
    // Score based on sessions and completed actions
    engagementScores[mode] = engagement.sessions * 2 + engagement.completedActions * 3
  }

  // Sort modes by engagement score (descending)
  return [...modes].sort((a, b) => {
    const scoreA = engagementScores[a.id] || 0
    const scoreB = engagementScores[b.id] || 0
    return scoreB - scoreA
  })
}
