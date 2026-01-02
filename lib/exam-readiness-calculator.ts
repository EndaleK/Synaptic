/**
 * Exam Readiness Calculator
 *
 * Calculates a 0-100 readiness score based on:
 * - Topic Coverage (30%): % of document topics with flashcards/reviews
 * - Mastery Level (35%): SM-2 maturity across cards
 * - Mock Exam Performance (25%): Average score on practice exams
 * - Consistency Bonus (10%): Streak and daily study adherence
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ReadinessFactors {
  topicCoverage: number      // 0-100
  masteryLevel: number       // 0-100
  mockExamPerformance: number // 0-100
  consistencyBonus: number   // 0-100
}

export interface ReadinessResult {
  score: number              // 0-100 overall readiness
  factors: ReadinessFactors
  trend: 'improving' | 'stable' | 'declining'
  weakTopics: WeakTopic[]
  daysUntilExam: number | null
  lastCalculated: string
}

export interface WeakTopic {
  topic: string
  score: number              // 0-100
  reason: 'low_accuracy' | 'no_flashcards' | 'low_exam_score' | 'not_reviewed'
  flashcardCount: number
  accuracy: number | null
  examScore: number | null
  suggestedAction: string
}

export interface ExamReadinessParams {
  userId: string
  examId?: string           // Optional: specific exam to calculate readiness for
  documentId?: string       // Optional: specific document context
}

// Weights for each factor in the readiness calculation
const WEIGHTS = {
  topicCoverage: 0.30,
  masteryLevel: 0.35,
  mockExamPerformance: 0.25,
  consistencyBonus: 0.10
}

// Thresholds for weak topic identification
const THRESHOLDS = {
  weakAccuracy: 70,         // Below this = weak
  lowExamScore: 60,         // Below this = needs review
  notReviewedDays: 7        // Not reviewed in this many days = stale
}

/**
 * Calculate overall exam readiness score
 */
export async function calculateExamReadiness(
  supabase: SupabaseClient,
  params: ExamReadinessParams
): Promise<ReadinessResult> {
  const { userId, examId, documentId } = params

  // Fetch all required data in parallel
  const [
    flashcardData,
    examData,
    studyStats,
    previousSnapshot,
    examDetails
  ] = await Promise.all([
    getFlashcardMetrics(supabase, userId, documentId),
    getExamMetrics(supabase, userId, examId),
    getStudyConsistency(supabase, userId),
    getPreviousSnapshot(supabase, userId, examId),
    examId ? getExamDetails(supabase, examId) : null
  ])

  // Calculate each factor
  const factors: ReadinessFactors = {
    topicCoverage: calculateTopicCoverage(flashcardData),
    masteryLevel: calculateMasteryLevel(flashcardData),
    mockExamPerformance: calculateExamPerformance(examData),
    consistencyBonus: calculateConsistencyBonus(studyStats)
  }

  // Calculate weighted score
  const score = Math.round(
    factors.topicCoverage * WEIGHTS.topicCoverage +
    factors.masteryLevel * WEIGHTS.masteryLevel +
    factors.mockExamPerformance * WEIGHTS.mockExamPerformance +
    factors.consistencyBonus * WEIGHTS.consistencyBonus
  )

  // Determine trend
  const trend = determineTrend(score, previousSnapshot?.readiness_score)

  // Identify weak topics
  const weakTopics = identifyWeakTopics(flashcardData, examData)

  // Calculate days until exam
  const daysUntilExam = examDetails?.exam_date
    ? Math.ceil((new Date(examDetails.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return {
    score,
    factors,
    trend,
    weakTopics,
    daysUntilExam,
    lastCalculated: new Date().toISOString()
  }
}

/**
 * Get flashcard metrics for readiness calculation
 */
async function getFlashcardMetrics(
  supabase: SupabaseClient,
  userId: string,
  documentId?: string
) {
  let query = supabase
    .from('flashcards')
    .select(`
      id,
      front,
      back,
      topic,
      ease_factor,
      interval_days,
      repetitions,
      maturity_level,
      times_reviewed,
      times_correct,
      last_reviewed_at,
      document_id
    `)
    .eq('user_id', userId)

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching flashcard metrics:', error)
    return []
  }

  return data || []
}

/**
 * Get exam attempt metrics
 */
async function getExamMetrics(
  supabase: SupabaseClient,
  userId: string,
  examId?: string
) {
  let query = supabase
    .from('exam_attempts')
    .select(`
      id,
      exam_id,
      score,
      total_questions,
      correct_answers,
      topic_scores,
      completed_at
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (examId) {
    query = query.eq('exam_id', examId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching exam metrics:', error)
    return []
  }

  return data || []
}

/**
 * Get study consistency data (streaks, session frequency)
 */
async function getStudyConsistency(
  supabase: SupabaseClient,
  userId: string
) {
  // Get user profile for streak data
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_streak, longest_streak')
    .eq('clerk_user_id', userId)
    .single()

  // Get recent study sessions (last 14 days)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id, started_at, ended_at, duration_minutes')
    .eq('user_id', userId)
    .gte('started_at', twoWeeksAgo.toISOString())

  // Calculate unique study days in last 14 days
  const studyDays = new Set(
    (sessions || []).map(s => new Date(s.started_at).toDateString())
  ).size

  return {
    currentStreak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    studyDaysLast14: studyDays,
    totalSessions: sessions?.length || 0
  }
}

/**
 * Get previous readiness snapshot for trend calculation
 */
async function getPreviousSnapshot(
  supabase: SupabaseClient,
  userId: string,
  examId?: string
) {
  let query = supabase
    .from('exam_readiness_snapshots')
    .select('readiness_score, calculated_at')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)

  if (examId) {
    query = query.eq('exam_id', examId)
  }

  const { data } = await query
  return data?.[0] || null
}

/**
 * Get exam details (date, name)
 */
async function getExamDetails(
  supabase: SupabaseClient,
  examId: string
) {
  const { data } = await supabase
    .from('exams')
    .select('id, title, exam_date')
    .eq('id', examId)
    .single()

  return data
}

/**
 * Calculate topic coverage score (0-100)
 * Based on % of topics that have flashcards created
 */
function calculateTopicCoverage(flashcards: any[]): number {
  if (flashcards.length === 0) return 0

  // Group by topic
  const topicMap = new Map<string, number>()
  flashcards.forEach(card => {
    const topic = card.topic || 'General'
    topicMap.set(topic, (topicMap.get(topic) || 0) + 1)
  })

  // Assume each topic should have at least 5 cards for good coverage
  const MIN_CARDS_PER_TOPIC = 5
  let coveredTopics = 0

  topicMap.forEach((count) => {
    if (count >= MIN_CARDS_PER_TOPIC) {
      coveredTopics++
    } else {
      // Partial credit for partial coverage
      coveredTopics += count / MIN_CARDS_PER_TOPIC
    }
  })

  // Score based on number of well-covered topics
  // Assuming 5+ topics is excellent coverage
  const score = Math.min(100, (coveredTopics / 5) * 100)
  return Math.round(score)
}

/**
 * Calculate mastery level score (0-100)
 * Based on SM-2 maturity levels
 */
function calculateMasteryLevel(flashcards: any[]): number {
  if (flashcards.length === 0) return 0

  // Weight by maturity level
  const MATURITY_WEIGHTS = {
    'mature': 100,
    'young': 70,
    'learning': 40,
    'new': 10
  }

  let totalWeight = 0
  flashcards.forEach(card => {
    const maturity = card.maturity_level || 'new'
    totalWeight += MATURITY_WEIGHTS[maturity as keyof typeof MATURITY_WEIGHTS] || 10
  })

  return Math.round(totalWeight / flashcards.length)
}

/**
 * Calculate mock exam performance score (0-100)
 * Based on average of recent exam attempts
 */
function calculateExamPerformance(examAttempts: any[]): number {
  if (examAttempts.length === 0) return 50 // Neutral if no exams taken

  // Weight recent exams more heavily
  let weightedSum = 0
  let totalWeight = 0

  examAttempts.forEach((attempt, index) => {
    const weight = Math.pow(0.8, index) // Exponential decay for older attempts
    const score = (attempt.correct_answers / attempt.total_questions) * 100
    weightedSum += score * weight
    totalWeight += weight
  })

  return Math.round(weightedSum / totalWeight)
}

/**
 * Calculate consistency bonus score (0-100)
 * Based on streaks and study frequency
 */
function calculateConsistencyBonus(stats: any): number {
  const { currentStreak, studyDaysLast14 } = stats

  // Streak component (50%): Up to 7-day streak = full points
  const streakScore = Math.min(100, (currentStreak / 7) * 100)

  // Frequency component (50%): 10+ days in last 14 = full points
  const frequencyScore = Math.min(100, (studyDaysLast14 / 10) * 100)

  return Math.round((streakScore + frequencyScore) / 2)
}

/**
 * Determine if score is improving, stable, or declining
 */
function determineTrend(
  currentScore: number,
  previousScore?: number
): 'improving' | 'stable' | 'declining' {
  if (!previousScore) return 'stable'

  const diff = currentScore - previousScore
  if (diff >= 5) return 'improving'
  if (diff <= -5) return 'declining'
  return 'stable'
}

/**
 * Identify weak topics that need more study
 */
function identifyWeakTopics(
  flashcards: any[],
  examAttempts: any[]
): WeakTopic[] {
  const weakTopics: WeakTopic[] = []

  // Group flashcards by topic
  const topicStats = new Map<string, {
    count: number
    correct: number
    reviewed: number
    lastReviewed: Date | null
  }>()

  flashcards.forEach(card => {
    const topic = card.topic || 'General'
    const existing = topicStats.get(topic) || {
      count: 0,
      correct: 0,
      reviewed: 0,
      lastReviewed: null
    }

    existing.count++
    existing.correct += card.times_correct || 0
    existing.reviewed += card.times_reviewed || 0

    if (card.last_reviewed_at) {
      const reviewDate = new Date(card.last_reviewed_at)
      if (!existing.lastReviewed || reviewDate > existing.lastReviewed) {
        existing.lastReviewed = reviewDate
      }
    }

    topicStats.set(topic, existing)
  })

  // Get exam topic scores
  const examTopicScores = new Map<string, number[]>()
  examAttempts.forEach(attempt => {
    if (attempt.topic_scores) {
      Object.entries(attempt.topic_scores).forEach(([topic, score]) => {
        const scores = examTopicScores.get(topic) || []
        scores.push(score as number)
        examTopicScores.set(topic, scores)
      })
    }
  })

  // Analyze each topic
  topicStats.forEach((stats, topic) => {
    const accuracy = stats.reviewed > 0
      ? (stats.correct / stats.reviewed) * 100
      : null

    const examScores = examTopicScores.get(topic) || []
    const avgExamScore = examScores.length > 0
      ? examScores.reduce((a, b) => a + b, 0) / examScores.length
      : null

    // Check for weakness conditions
    let reason: WeakTopic['reason'] | null = null
    let suggestedAction = ''

    if (stats.count === 0) {
      reason = 'no_flashcards'
      suggestedAction = 'Generate flashcards for this topic'
    } else if (accuracy !== null && accuracy < THRESHOLDS.weakAccuracy) {
      reason = 'low_accuracy'
      suggestedAction = 'Review flashcards more frequently'
    } else if (avgExamScore !== null && avgExamScore < THRESHOLDS.lowExamScore) {
      reason = 'low_exam_score'
      suggestedAction = 'Take a practice quiz on this topic'
    } else if (stats.lastReviewed) {
      const daysSinceReview = Math.floor(
        (Date.now() - stats.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceReview > THRESHOLDS.notReviewedDays) {
        reason = 'not_reviewed'
        suggestedAction = 'Schedule a review session'
      }
    }

    if (reason) {
      const score = calculateTopicScore(accuracy, avgExamScore, stats.count)
      weakTopics.push({
        topic,
        score,
        reason,
        flashcardCount: stats.count,
        accuracy,
        examScore: avgExamScore,
        suggestedAction
      })
    }
  })

  // Sort by score (lowest first) and return top 5
  return weakTopics
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
}

/**
 * Calculate a score for a specific topic
 */
function calculateTopicScore(
  accuracy: number | null,
  examScore: number | null,
  cardCount: number
): number {
  let score = 50 // Base score

  if (accuracy !== null) {
    score = (score + accuracy) / 2
  }

  if (examScore !== null) {
    score = (score + examScore) / 2
  }

  // Penalize for too few cards
  if (cardCount < 5) {
    score *= (cardCount / 5)
  }

  return Math.round(score)
}

/**
 * Save readiness snapshot to database
 */
export async function saveReadinessSnapshot(
  supabase: SupabaseClient,
  userId: string,
  result: ReadinessResult,
  examId?: string
): Promise<void> {
  const { error } = await supabase
    .from('exam_readiness_snapshots')
    .insert({
      user_id: userId,
      exam_id: examId || null,
      readiness_score: result.score,
      topic_scores: result.weakTopics.reduce((acc, t) => ({
        ...acc,
        [t.topic]: t.score
      }), {}),
      factors: result.factors,
      calculated_at: result.lastCalculated
    })

  if (error) {
    console.error('Error saving readiness snapshot:', error)
  }
}

/**
 * Get readiness color based on score
 */
export function getReadinessColor(score: number): 'red' | 'yellow' | 'green' {
  if (score < 50) return 'red'
  if (score < 75) return 'yellow'
  return 'green'
}

/**
 * Get readiness label based on score
 */
export function getReadinessLabel(score: number): string {
  if (score < 30) return 'Just Getting Started'
  if (score < 50) return 'Needs More Practice'
  if (score < 70) return 'Making Progress'
  if (score < 85) return 'Almost Ready'
  return 'Exam Ready!'
}
