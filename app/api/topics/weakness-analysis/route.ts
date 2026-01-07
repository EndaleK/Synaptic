import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface WeakTopic {
  topic: string
  score: number
  reason: 'low_accuracy' | 'no_flashcards' | 'low_exam_score' | 'not_reviewed'
  flashcardCount: number
  accuracy: number | null
  examScore: number | null
  suggestedAction: string
}

// Thresholds for weakness detection
const THRESHOLDS = {
  weakAccuracy: 70,
  lowExamScore: 60,
  notReviewedDays: 7,
  minCardsPerTopic: 5
}

/**
 * GET /api/topics/weakness-analysis
 * Analyze topics and identify weak areas
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId') || undefined

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch flashcard data
    let flashcardQuery = supabase
      .from('flashcards')
      .select(`
        id,
        topic,
        times_reviewed,
        times_correct,
        last_reviewed_at,
        maturity_level
      `)
      .eq('user_id', profile.id)

    if (documentId) {
      flashcardQuery = flashcardQuery.eq('document_id', documentId)
    }

    const { data: flashcards, error: flashcardError } = await flashcardQuery

    if (flashcardError) {
      console.error('Error fetching flashcards:', flashcardError)
      return NextResponse.json(
        { error: 'Failed to fetch flashcard data' },
        { status: 500 }
      )
    }

    // Fetch exam attempt data
    // Note: topic_scores may not exist in all deployments, so we handle gracefully
    let examAttempts: any[] = []
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('answers, score, completed_at')
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        examAttempts = data
      }
    } catch {
      // Table may not exist - continue without exam data
      console.log('exam_attempts table not available')
    }

    // Analyze topics
    const weakTopics = analyzeTopics(flashcards || [], examAttempts || [])

    return NextResponse.json({ weakTopics })
  } catch (error) {
    console.error('Error analyzing topic weaknesses:', error)
    return NextResponse.json(
      { error: 'Failed to analyze topics' },
      { status: 500 }
    )
  }
}

/**
 * Analyze flashcard and exam data to identify weak topics
 */
function analyzeTopics(
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
    maturityLevels: string[]
  }>()

  flashcards.forEach(card => {
    const topic = card.topic || 'General'
    const existing = topicStats.get(topic) || {
      count: 0,
      correct: 0,
      reviewed: 0,
      lastReviewed: null,
      maturityLevels: []
    }

    existing.count++
    existing.correct += card.times_correct || 0
    existing.reviewed += card.times_reviewed || 0
    existing.maturityLevels.push(card.maturity_level || 'new')

    if (card.last_reviewed_at) {
      const reviewDate = new Date(card.last_reviewed_at)
      if (!existing.lastReviewed || reviewDate > existing.lastReviewed) {
        existing.lastReviewed = reviewDate
      }
    }

    topicStats.set(topic, existing)
  })

  // Get exam scores - we use overall exam scores since topic_scores isn't available
  // The exam data contains answers array and overall score
  const examScores: number[] = []
  examAttempts.forEach(attempt => {
    if (attempt.score !== null && attempt.score !== undefined) {
      examScores.push(attempt.score)
    }
  })
  const avgExamScore = examScores.length > 0
    ? examScores.reduce((a, b) => a + b, 0) / examScores.length
    : null

  // We no longer have per-topic exam scores, so we'll use overall exam performance
  const examTopicScores = new Map<string, number[]>()

  // Analyze each topic for weaknesses
  topicStats.forEach((stats, topic) => {
    const accuracy = stats.reviewed > 0
      ? (stats.correct / stats.reviewed) * 100
      : null

    const examScores = examTopicScores.get(topic) || []
    const avgExamScore = examScores.length > 0
      ? examScores.reduce((a, b) => a + b, 0) / examScores.length
      : null

    // Check for different types of weaknesses
    let reason: WeakTopic['reason'] | null = null
    let suggestedAction = ''

    // Priority 1: No flashcards
    if (stats.count < THRESHOLDS.minCardsPerTopic) {
      reason = 'no_flashcards'
      suggestedAction = 'Generate more flashcards for this topic'
    }
    // Priority 2: Low accuracy
    else if (accuracy !== null && accuracy < THRESHOLDS.weakAccuracy) {
      reason = 'low_accuracy'
      suggestedAction = 'Review these flashcards more frequently'
    }
    // Priority 3: Low exam score
    else if (avgExamScore !== null && avgExamScore < THRESHOLDS.lowExamScore) {
      reason = 'low_exam_score'
      suggestedAction = 'Take a practice quiz on this topic'
    }
    // Priority 4: Not reviewed recently
    else if (stats.lastReviewed) {
      const daysSinceReview = Math.floor(
        (Date.now() - stats.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceReview > THRESHOLDS.notReviewedDays) {
        reason = 'not_reviewed'
        suggestedAction = 'Schedule a review session for this topic'
      }
    }

    if (reason) {
      const score = calculateTopicScore(accuracy, avgExamScore, stats)
      weakTopics.push({
        topic,
        score,
        reason,
        flashcardCount: stats.count,
        accuracy: accuracy !== null ? Math.round(accuracy) : null,
        examScore: avgExamScore !== null ? Math.round(avgExamScore) : null,
        suggestedAction
      })
    }
  })

  // Also check for topics that appear in exams but have no flashcards
  examTopicScores.forEach((scores, topic) => {
    if (!topicStats.has(topic)) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      weakTopics.push({
        topic,
        score: Math.round(avgScore),
        reason: 'no_flashcards',
        flashcardCount: 0,
        accuracy: null,
        examScore: Math.round(avgScore),
        suggestedAction: 'Generate flashcards for this topic'
      })
    }
  })

  // Sort by score (lowest first) and return top 5
  return weakTopics
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
}

/**
 * Calculate an overall score for a topic
 */
function calculateTopicScore(
  accuracy: number | null,
  examScore: number | null,
  stats: { count: number; maturityLevels: string[] }
): number {
  let score = 50 // Base score

  // Factor in accuracy (40% weight)
  if (accuracy !== null) {
    score = score * 0.6 + accuracy * 0.4
  }

  // Factor in exam scores (30% weight)
  if (examScore !== null) {
    score = score * 0.7 + examScore * 0.3
  }

  // Factor in maturity levels (20% weight)
  const maturityScores: Record<string, number> = {
    'mature': 100,
    'young': 70,
    'learning': 40,
    'new': 10
  }

  if (stats.maturityLevels.length > 0) {
    const avgMaturity = stats.maturityLevels.reduce((sum, level) => {
      return sum + (maturityScores[level] || 10)
    }, 0) / stats.maturityLevels.length
    score = score * 0.8 + avgMaturity * 0.2
  }

  // Penalize for too few cards (10% weight)
  if (stats.count < THRESHOLDS.minCardsPerTopic) {
    score *= (stats.count / THRESHOLDS.minCardsPerTopic)
  }

  return Math.round(Math.max(0, Math.min(100, score)))
}
