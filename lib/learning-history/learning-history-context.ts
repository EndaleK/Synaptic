/**
 * Learning History Context Generator
 *
 * Fetches and formats user's learning performance data for AI context injection.
 * This enables the AI teacher to be aware of:
 * - Weak topics (low accuracy, struggling cards)
 * - Knowledge gaps (topics needing review)
 * - Overall mastery levels
 * - Recent performance trends
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Types for learning history
export interface WeakTopic {
  topic: string
  accuracy: number
  cardCount: number
  averageEase: number
  lastReviewed: string | null
}

export interface StrugglePattern {
  topic: string
  commonMistakes: number
  totalAttempts: number
  recentTrend: 'improving' | 'declining' | 'stable'
}

export interface LearningHistoryContext {
  overallMastery: number
  totalCardsStudied: number
  averageAccuracy: number
  weakTopics: WeakTopic[]
  strongTopics: string[]
  recentStruggleAreas: string[]
  studyStreak: number
  lastStudyDate: string | null
  topicsNeedingReview: string[]
}

export interface FormattedLearningContext {
  summary: string
  instructionalFocus: string
  full: string
}

/**
 * Fetch learning history for a user
 */
export async function getLearningHistoryContext(
  supabase: SupabaseClient,
  userProfileId: string,
  documentId?: string
): Promise<LearningHistoryContext> {
  // Build base query for flashcards
  let flashcardsQuery = supabase
    .from('flashcards')
    .select('id, topic, source_section, times_reviewed, times_correct, ease_factor, last_reviewed_at, maturity_level')
    .eq('user_id', userProfileId)

  // Filter by document if provided
  if (documentId) {
    flashcardsQuery = flashcardsQuery.eq('document_id', documentId)
  }

  const [flashcardsResult, profileResult] = await Promise.all([
    flashcardsQuery,
    supabase
      .from('user_profiles')
      .select('current_streak, last_study_date')
      .eq('id', userProfileId)
      .single()
  ])

  const flashcards = flashcardsResult.data || []
  const profile = profileResult.data

  // Calculate overall stats
  const reviewedCards = flashcards.filter(f => f.times_reviewed > 0)
  const totalCorrect = reviewedCards.reduce((sum, f) => sum + (f.times_correct || 0), 0)
  const totalAttempts = reviewedCards.reduce((sum, f) => sum + (f.times_reviewed || 0), 0)
  const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0

  // Calculate mastery (% of cards at young/mature level)
  const matureCards = flashcards.filter(f => f.maturity_level === 'mature' || f.maturity_level === 'young')
  const overallMastery = flashcards.length > 0 ? (matureCards.length / flashcards.length) * 100 : 0

  // Group by topic and calculate per-topic stats
  const topicStats = new Map<string, {
    correct: number
    attempts: number
    count: number
    totalEase: number
    lastReviewed: string | null
  }>()

  for (const card of flashcards) {
    const topic = card.source_section || card.topic || 'General'
    const existing = topicStats.get(topic) || {
      correct: 0,
      attempts: 0,
      count: 0,
      totalEase: 0,
      lastReviewed: null
    }

    existing.correct += card.times_correct || 0
    existing.attempts += card.times_reviewed || 0
    existing.count += 1
    existing.totalEase += card.ease_factor || 2.5
    if (card.last_reviewed_at && (!existing.lastReviewed || card.last_reviewed_at > existing.lastReviewed)) {
      existing.lastReviewed = card.last_reviewed_at
    }

    topicStats.set(topic, existing)
  }

  // Identify weak topics (accuracy < 60% or low ease factor)
  const weakTopics: WeakTopic[] = []
  const strongTopics: string[] = []

  for (const [topic, stats] of topicStats) {
    const accuracy = stats.attempts > 0 ? (stats.correct / stats.attempts) * 100 : 0
    const averageEase = stats.totalEase / stats.count

    if (stats.attempts >= 3) { // Only consider topics with enough data
      if (accuracy < 60 || averageEase < 2.0) {
        weakTopics.push({
          topic,
          accuracy: Math.round(accuracy),
          cardCount: stats.count,
          averageEase: Math.round(averageEase * 100) / 100,
          lastReviewed: stats.lastReviewed
        })
      } else if (accuracy >= 80) {
        strongTopics.push(topic)
      }
    }
  }

  // Sort weak topics by accuracy (worst first)
  weakTopics.sort((a, b) => a.accuracy - b.accuracy)

  // Identify topics needing review (not reviewed in 7+ days but have cards)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString()

  const topicsNeedingReview: string[] = []
  for (const [topic, stats] of topicStats) {
    if (stats.count > 0 && (!stats.lastReviewed || stats.lastReviewed < sevenDaysAgoStr)) {
      topicsNeedingReview.push(topic)
    }
  }

  // Recent struggle areas (topics with low accuracy in recent reviews)
  const recentStruggleAreas = weakTopics.slice(0, 5).map(t => t.topic)

  return {
    overallMastery: Math.round(overallMastery),
    totalCardsStudied: reviewedCards.length,
    averageAccuracy: Math.round(overallAccuracy),
    weakTopics: weakTopics.slice(0, 10), // Top 10 weakest
    strongTopics: strongTopics.slice(0, 5), // Top 5 strongest
    recentStruggleAreas,
    studyStreak: profile?.current_streak || 0,
    lastStudyDate: profile?.last_study_date || null,
    topicsNeedingReview: topicsNeedingReview.slice(0, 5)
  }
}

/**
 * Format learning history into AI-readable context
 */
export function formatLearningContextForAI(
  context: LearningHistoryContext,
  options: { detailed?: boolean; documentName?: string } = {}
): FormattedLearningContext {
  const { detailed = false, documentName } = options

  // Build summary line
  const summaryParts: string[] = []

  if (context.totalCardsStudied > 0) {
    summaryParts.push(`${context.averageAccuracy}% overall accuracy`)
    summaryParts.push(`${context.overallMastery}% mastery`)
  }

  if (context.weakTopics.length > 0) {
    summaryParts.push(`${context.weakTopics.length} weak topic(s)`)
  }

  const summary = summaryParts.length > 0
    ? `Student Performance: ${summaryParts.join(', ')}`
    : 'New student - no performance history yet'

  // Build instructional focus
  let instructionalFocus = ''

  if (context.weakTopics.length > 0) {
    const weakTopicNames = context.weakTopics.slice(0, 3).map(t => t.topic).join(', ')
    instructionalFocus = `PRIORITY FOCUS AREAS: ${weakTopicNames}
- Provide extra explanations and examples for these topics
- Use simpler language and more analogies
- Check understanding frequently with follow-up questions
- Suggest specific flashcard review for reinforcement`
  } else if (context.strongTopics.length > 0) {
    instructionalFocus = `Student shows strong understanding. Challenge them with:
- Deeper connections between concepts
- Application-level questions
- Edge cases and exceptions`
  } else {
    instructionalFocus = 'New student - focus on foundational understanding and building confidence.'
  }

  // Build full context
  const fullParts: string[] = []

  fullParts.push('=== STUDENT LEARNING HISTORY ===')

  if (documentName) {
    fullParts.push(`Document: ${documentName}`)
  }

  fullParts.push(`
Overall Stats:
- Mastery Level: ${context.overallMastery}%
- Average Accuracy: ${context.averageAccuracy}%
- Cards Studied: ${context.totalCardsStudied}
- Study Streak: ${context.studyStreak} days`)

  if (context.weakTopics.length > 0) {
    fullParts.push(`
Weak Areas (Need Extra Support):`)
    for (const topic of context.weakTopics.slice(0, 5)) {
      fullParts.push(`- ${topic.topic}: ${topic.accuracy}% accuracy (${topic.cardCount} cards)`)
    }
  }

  if (context.strongTopics.length > 0 && detailed) {
    fullParts.push(`
Strong Areas:
${context.strongTopics.map(t => `- ${t}`).join('\n')}`)
  }

  if (context.topicsNeedingReview.length > 0) {
    fullParts.push(`
Topics Needing Review (Not studied recently):
${context.topicsNeedingReview.map(t => `- ${t}`).join('\n')}`)
  }

  fullParts.push(`
Instructional Guidance:
${instructionalFocus}`)

  fullParts.push('=== END LEARNING HISTORY ===')

  return {
    summary,
    instructionalFocus,
    full: fullParts.join('\n')
  }
}

/**
 * Get a compact learning context string for system prompt injection
 */
export async function getLearningContextForPrompt(
  supabase: SupabaseClient,
  userProfileId: string,
  documentId?: string,
  documentName?: string
): Promise<string> {
  try {
    const context = await getLearningHistoryContext(supabase, userProfileId, documentId)

    // If no meaningful data, return minimal context
    if (context.totalCardsStudied === 0 && context.weakTopics.length === 0) {
      return ''
    }

    const formatted = formatLearningContextForAI(context, {
      detailed: false,
      documentName
    })

    return formatted.full
  } catch (error) {
    console.error('[Learning History] Error fetching context:', error)
    return '' // Fail gracefully - don't break chat if learning history fails
  }
}

/**
 * Check if a topic is weak for the user
 */
export function isWeakTopic(
  context: LearningHistoryContext,
  topic: string
): boolean {
  const normalizedTopic = topic.toLowerCase()
  return context.weakTopics.some(
    t => t.topic.toLowerCase().includes(normalizedTopic) ||
         normalizedTopic.includes(t.topic.toLowerCase())
  )
}

/**
 * Get specific advice for a topic based on learning history
 */
export function getTopicAdvice(
  context: LearningHistoryContext,
  topic: string
): string | null {
  const weakTopic = context.weakTopics.find(
    t => t.topic.toLowerCase().includes(topic.toLowerCase()) ||
         topic.toLowerCase().includes(t.topic.toLowerCase())
  )

  if (weakTopic) {
    if (weakTopic.accuracy < 40) {
      return `This is a critical weak area (${weakTopic.accuracy}% accuracy). Provide thorough explanations with multiple examples and check understanding frequently.`
    } else if (weakTopic.accuracy < 60) {
      return `Student struggles with this topic (${weakTopic.accuracy}% accuracy). Use clear explanations and analogies.`
    }
  }

  if (context.topicsNeedingReview.some(t =>
    t.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(t.toLowerCase())
  )) {
    return `This topic hasn't been reviewed recently. Start with a brief recap before diving deeper.`
  }

  return null
}
