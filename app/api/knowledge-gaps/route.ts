import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { estimateRetention } from '@/lib/spaced-repetition/sm2-algorithm'

export const runtime = 'nodejs'
export const maxDuration = 30

// Types for knowledge gap analysis
interface TopicAnalysis {
  topic: string
  documentId: string | null
  documentName: string | null
  cardCount: number
  masteryProgress: {
    new: number
    learning: number
    young: number
    mature: number
  }
  accuracy: number | null
  averageEaseFactor: number
  lastReviewedAt: string | null
  estimatedRetention: number | null
  trend: 'improving' | 'stable' | 'declining'
  needsAttention: boolean
  reason: string | null
}

interface CardDetail {
  id: string
  front: string
  back: string
  topic: string | null
  documentName: string | null
  easeFactor: number
  accuracy: number
  timesReviewed: number
  lastQualityRating: number | null
  daysSinceReview: number | null
  estimatedRetention: number | null
  reason: 'low_ease' | 'low_accuracy' | 'repeated_failures' | 'at_risk'
  urgency?: 'critical' | 'high' | 'medium'
}

interface QuickAction {
  id: string
  type: 'review_topic' | 'review_struggling' | 'review_at_risk'
  label: string
  description: string
  cardCount: number
  estimatedMinutes: number
  topicFilter?: string
  documentId?: string
}

interface KnowledgeGapResponse {
  summary: {
    totalCards: number
    totalTopics: number
    overallMastery: number
    atRiskCount: number
    strugglingCount: number
    averageAccuracy: number
  }
  topicBreakdown: TopicAnalysis[]
  strugglingCards: CardDetail[]
  atRiskKnowledge: CardDetail[]
  quickActions: QuickAction[]
}

// Thresholds for gap detection
const THRESHOLDS = {
  lowEaseFactor: 1.8,
  lowAccuracy: 0.5,
  minReviewsForAccuracy: 3,
  staleReviewDays: 14,
  atRiskRetention: 0.7,
  criticalRetention: 0.4,
  highUrgencyRetention: 0.55,
}

// Estimate study time (average 1.5 minutes per card)
function estimateStudyMinutes(cardCount: number): number {
  return Math.ceil(cardCount * 1.5)
}

/**
 * GET /api/knowledge-gaps
 * Comprehensive knowledge gap analysis for the user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

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

    // Build base query for flashcards
    let flashcardQuery = supabase
      .from('flashcards')
      .select(`
        id,
        front,
        back,
        source_section,
        document_id,
        ease_factor,
        interval_days,
        times_reviewed,
        times_correct,
        last_reviewed_at,
        last_quality_rating,
        maturity_level,
        repetitions,
        review_history,
        documents!inner(id, file_name)
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

    if (!flashcards || flashcards.length === 0) {
      // Return empty state for new users
      const emptyResponse: KnowledgeGapResponse = {
        summary: {
          totalCards: 0,
          totalTopics: 0,
          overallMastery: 0,
          atRiskCount: 0,
          strugglingCount: 0,
          averageAccuracy: 0,
        },
        topicBreakdown: [],
        strugglingCards: [],
        atRiskKnowledge: [],
        quickActions: [],
      }
      return NextResponse.json(emptyResponse)
    }

    const now = new Date()

    // Calculate summary stats
    const totalCards = flashcards.length
    const matureCards = flashcards.filter(c => c.maturity_level === 'mature').length
    const overallMastery = Math.round((matureCards / totalCards) * 100)

    // Calculate average accuracy
    let totalCorrect = 0
    let totalReviewed = 0
    flashcards.forEach(card => {
      totalCorrect += card.times_correct || 0
      totalReviewed += card.times_reviewed || 0
    })
    const averageAccuracy = totalReviewed > 0
      ? Math.round((totalCorrect / totalReviewed) * 100)
      : 0

    // Identify struggling cards (low ease factor or low accuracy)
    const strugglingCards: CardDetail[] = flashcards
      .filter(card => {
        const accuracy = card.times_reviewed > 0
          ? card.times_correct / card.times_reviewed
          : 1

        return (
          card.ease_factor < THRESHOLDS.lowEaseFactor ||
          (card.times_reviewed >= THRESHOLDS.minReviewsForAccuracy && accuracy < THRESHOLDS.lowAccuracy)
        )
      })
      .map(card => {
        const accuracy = card.times_reviewed > 0
          ? card.times_correct / card.times_reviewed
          : 1

        let reason: CardDetail['reason'] = 'low_ease'
        if (card.ease_factor < 1.5) {
          reason = 'low_ease'
        } else if (card.times_reviewed >= 3 && accuracy < 0.5) {
          reason = 'repeated_failures'
        } else if (accuracy < THRESHOLDS.lowAccuracy) {
          reason = 'low_accuracy'
        }

        return {
          id: card.id,
          front: card.front.substring(0, 200),
          back: card.back.substring(0, 200),
          topic: card.source_section || null,
          documentName: (card.documents as any)?.file_name || null,
          easeFactor: card.ease_factor,
          accuracy: Math.round(accuracy * 100),
          timesReviewed: card.times_reviewed,
          lastQualityRating: card.last_quality_rating,
          daysSinceReview: card.last_reviewed_at
            ? Math.floor((now.getTime() - new Date(card.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          estimatedRetention: null,
          reason,
        }
      })
      .sort((a, b) => a.easeFactor - b.easeFactor)
      .slice(0, 10)

    // Identify at-risk knowledge (cards not reviewed recently with low retention)
    const atRiskKnowledge: CardDetail[] = flashcards
      .filter(card => {
        if (!card.last_reviewed_at) return false
        if (!['young', 'mature'].includes(card.maturity_level)) return false

        const daysSinceReview = Math.floor(
          (now.getTime() - new Date(card.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceReview < THRESHOLDS.staleReviewDays) return false

        const retention = estimateRetention(daysSinceReview, card.interval_days || 1)
        return retention < THRESHOLDS.atRiskRetention
      })
      .map(card => {
        const daysSinceReview = Math.floor(
          (now.getTime() - new Date(card.last_reviewed_at!).getTime()) / (1000 * 60 * 60 * 24)
        )
        const retention = estimateRetention(daysSinceReview, card.interval_days || 1)
        const accuracy = card.times_reviewed > 0
          ? card.times_correct / card.times_reviewed
          : 1

        let urgency: CardDetail['urgency'] = 'medium'
        if (retention < THRESHOLDS.criticalRetention) {
          urgency = 'critical'
        } else if (retention < THRESHOLDS.highUrgencyRetention) {
          urgency = 'high'
        }

        return {
          id: card.id,
          front: card.front.substring(0, 200),
          back: card.back.substring(0, 200),
          topic: card.source_section || null,
          documentName: (card.documents as any)?.file_name || null,
          easeFactor: card.ease_factor,
          accuracy: Math.round(accuracy * 100),
          timesReviewed: card.times_reviewed,
          lastQualityRating: card.last_quality_rating,
          daysSinceReview,
          estimatedRetention: Math.round(retention * 100),
          reason: 'at_risk' as const,
          urgency,
        }
      })
      .sort((a, b) => (a.estimatedRetention || 0) - (b.estimatedRetention || 0))
      .slice(0, 10)

    // Group by topic (source_section)
    const topicMap = new Map<string, {
      cards: typeof flashcards
      documentId: string | null
      documentName: string | null
    }>()

    flashcards.forEach(card => {
      const topic = card.source_section || 'Uncategorized'
      const existing = topicMap.get(topic)

      if (existing) {
        existing.cards.push(card)
      } else {
        topicMap.set(topic, {
          cards: [card],
          documentId: card.document_id,
          documentName: (card.documents as any)?.file_name || null,
        })
      }
    })

    // Calculate topic analysis
    const topicBreakdown: TopicAnalysis[] = Array.from(topicMap.entries())
      .map(([topic, data]) => {
        const cards = data.cards
        const cardCount = cards.length

        // Maturity distribution
        const masteryProgress = {
          new: cards.filter(c => c.maturity_level === 'new').length,
          learning: cards.filter(c => c.maturity_level === 'learning').length,
          young: cards.filter(c => c.maturity_level === 'young').length,
          mature: cards.filter(c => c.maturity_level === 'mature').length,
        }

        // Average ease factor
        const avgEase = cards.reduce((sum, c) => sum + c.ease_factor, 0) / cardCount

        // Accuracy
        let topicCorrect = 0
        let topicReviewed = 0
        cards.forEach(c => {
          topicCorrect += c.times_correct || 0
          topicReviewed += c.times_reviewed || 0
        })
        const accuracy = topicReviewed > 0
          ? Math.round((topicCorrect / topicReviewed) * 100)
          : null

        // Last reviewed
        const reviewDates = cards
          .filter(c => c.last_reviewed_at)
          .map(c => new Date(c.last_reviewed_at!))
        const lastReviewedAt = reviewDates.length > 0
          ? new Date(Math.max(...reviewDates.map(d => d.getTime()))).toISOString()
          : null

        // Estimated retention (average across cards)
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

        // Determine trend based on review history
        let trend: TopicAnalysis['trend'] = 'stable'
        const recentHistory = cards
          .flatMap(c => c.review_history || [])
          .filter(r => {
            const reviewDate = new Date(r.date)
            const daysSince = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
            return daysSince <= 30
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        if (recentHistory.length >= 5) {
          const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2))
          const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2))

          const firstAvg = firstHalf.reduce((s, r) => s + r.quality, 0) / firstHalf.length
          const secondAvg = secondHalf.reduce((s, r) => s + r.quality, 0) / secondHalf.length

          if (secondAvg > firstAvg + 0.5) trend = 'improving'
          else if (secondAvg < firstAvg - 0.5) trend = 'declining'
        }

        // Determine if needs attention
        let needsAttention = false
        let reason: string | null = null

        if (avgEase < THRESHOLDS.lowEaseFactor) {
          needsAttention = true
          reason = 'Low ease factor indicates difficulty'
        } else if (accuracy !== null && accuracy < 60) {
          needsAttention = true
          reason = 'Low accuracy needs more review'
        } else if (avgRetention !== null && avgRetention < 70) {
          needsAttention = true
          reason = 'Knowledge fading - needs refresh'
        } else if (masteryProgress.mature / cardCount < 0.3 && cardCount >= 5) {
          needsAttention = true
          reason = 'Most cards still in learning phase'
        }

        return {
          topic,
          documentId: data.documentId,
          documentName: data.documentName,
          cardCount,
          masteryProgress,
          accuracy,
          averageEaseFactor: Math.round(avgEase * 100) / 100,
          lastReviewedAt,
          estimatedRetention: avgRetention,
          trend,
          needsAttention,
          reason,
        }
      })
      .sort((a, b) => {
        // Sort by needs attention first, then by average ease factor
        if (a.needsAttention !== b.needsAttention) {
          return a.needsAttention ? -1 : 1
        }
        return a.averageEaseFactor - b.averageEaseFactor
      })
      .slice(0, limit)

    // Generate quick actions
    const quickActions: QuickAction[] = []

    if (strugglingCards.length > 0) {
      quickActions.push({
        id: 'review-struggling',
        type: 'review_struggling',
        label: `Review ${strugglingCards.length} Struggling Cards`,
        description: 'Focus on cards with low ease factor',
        cardCount: strugglingCards.length,
        estimatedMinutes: estimateStudyMinutes(strugglingCards.length),
      })
    }

    if (atRiskKnowledge.length > 0) {
      quickActions.push({
        id: 'review-at-risk',
        type: 'review_at_risk',
        label: `Refresh ${atRiskKnowledge.length} At-Risk Cards`,
        description: 'Prevent knowledge from fading',
        cardCount: atRiskKnowledge.length,
        estimatedMinutes: estimateStudyMinutes(atRiskKnowledge.length),
      })
    }

    // Add topic-specific actions for top 2 struggling topics
    const strugglingTopics = topicBreakdown
      .filter(t => t.needsAttention)
      .slice(0, 2)

    strugglingTopics.forEach(topic => {
      quickActions.push({
        id: `review-topic-${topic.topic}`,
        type: 'review_topic',
        label: `Focus on "${topic.topic}"`,
        description: topic.reason || 'Topic needs attention',
        cardCount: topic.cardCount,
        estimatedMinutes: estimateStudyMinutes(topic.cardCount),
        topicFilter: topic.topic,
        documentId: topic.documentId || undefined,
      })
    })

    const response: KnowledgeGapResponse = {
      summary: {
        totalCards,
        totalTopics: topicMap.size,
        overallMastery,
        atRiskCount: atRiskKnowledge.length,
        strugglingCount: strugglingCards.length,
        averageAccuracy,
      },
      topicBreakdown,
      strugglingCards,
      atRiskKnowledge,
      quickActions,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error analyzing knowledge gaps:', error)
    return NextResponse.json(
      { error: 'Failed to analyze knowledge gaps' },
      { status: 500 }
    )
  }
}
