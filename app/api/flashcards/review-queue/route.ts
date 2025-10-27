import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { prioritizeReviewQueue, getCardMaturity, estimateRetention, formatInterval } from "@/lib/spaced-repetition/sm2-algorithm"

export const dynamic = 'force-dynamic'

/**
 * GET /api/flashcards/review-queue
 * Fetches flashcards due for review today, prioritized by urgency
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated review queue request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userProfileId = profile.id

    // Get flashcards due for review (due_date <= today)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    const { data: reviewQueue, error: reviewError } = await supabase
      .from('review_queue')
      .select(`
        *,
        flashcards (
          id,
          front,
          back,
          difficulty,
          times_reviewed,
          times_correct,
          documents (
            id,
            file_name
          )
        )
      `)
      .eq('user_id', userProfileId)
      .lte('due_date', today.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (reviewError) {
      logger.error('Failed to fetch review queue', reviewError, { userId })
      // If it's just an empty result, return empty array instead of error
      if (reviewError.code === 'PGRST116' || reviewError.message.includes('no rows')) {
        return NextResponse.json({
          success: true,
          queue: [],
          stats: {
            totalDue: 0,
            newCards: 0,
            learningCards: 0,
            youngCards: 0,
            matureCards: 0,
            averageRetention: 0
          }
        })
      }
      return NextResponse.json({ error: "Failed to fetch review queue" }, { status: 500 })
    }

    // Get flashcards that don't have review queue entries yet (new flashcards)
    const { data: newFlashcards, error: newFlashcardsError } = await supabase
      .from('flashcards')
      .select(`
        id,
        front,
        back,
        difficulty,
        times_reviewed,
        times_correct,
        documents (
          id,
          file_name
        )
      `)
      .eq('user_id', userProfileId)
      .is('last_reviewed_at', null)

    if (newFlashcardsError) {
      logger.error('Failed to fetch new flashcards', newFlashcardsError, { userId })
      // Continue without new flashcards
    }

    // Format review queue items
    const formattedQueue = (reviewQueue || []).map(item => {
      const flashcard = item.flashcards as any
      const now = new Date()
      const lastReview = item.last_reviewed_at ? new Date(item.last_reviewed_at) : null
      const daysSinceReview = lastReview
        ? Math.floor((now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000))
        : 0

      return {
        queueId: item.id,
        flashcardId: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        difficulty: flashcard.difficulty,
        documentName: flashcard.documents?.file_name || 'Unknown',
        documentId: flashcard.documents?.id,

        // SM-2 data
        easeFactor: item.ease_factor,
        interval: item.interval_days,
        repetitions: item.repetitions,
        dueDate: item.due_date,
        lastReviewedAt: item.last_reviewed_at,

        // Calculated metrics
        maturity: getCardMaturity(item.repetitions, item.interval_days),
        estimatedRetention: lastReview ? estimateRetention(daysSinceReview, item.interval_days) : 0,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - new Date(item.due_date).getTime()) / (24 * 60 * 60 * 1000))),

        // Stats
        timesReviewed: flashcard.times_reviewed || 0,
        timesCorrect: flashcard.times_correct || 0,
        successRate: flashcard.times_reviewed > 0
          ? Math.round((flashcard.times_correct / flashcard.times_reviewed) * 100)
          : 0
      }
    })

    // Add new flashcards (never reviewed)
    const formattedNewFlashcards = (newFlashcards || []).map(flashcard => ({
      queueId: null, // Will be created on first review
      flashcardId: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
      difficulty: flashcard.difficulty,
      documentName: flashcard.documents?.file_name || 'Unknown',
      documentId: flashcard.documents?.id,

      // SM-2 data (defaults for new cards)
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      dueDate: new Date().toISOString().split('T')[0],
      lastReviewedAt: null,

      // Calculated metrics
      maturity: 'new' as const,
      estimatedRetention: 0,
      daysOverdue: 0,

      // Stats
      timesReviewed: 0,
      timesCorrect: 0,
      successRate: 0
    }))

    // Combine and prioritize
    const allCards = [...formattedQueue, ...formattedNewFlashcards]

    // Prioritize: new cards first (up to 20), then by SM-2 priority
    const newCards = allCards.filter(c => c.maturity === 'new').slice(0, 20)
    const dueCards = allCards.filter(c => c.maturity !== 'new')

    const prioritizedDueCards = prioritizeReviewQueue(
      dueCards.map(c => ({
        id: c.flashcardId,
        dueDate: new Date(c.dueDate),
        interval: c.interval,
        lastReviewDate: c.lastReviewedAt ? new Date(c.lastReviewedAt) : null
      }))
    )

    const prioritized = [
      ...newCards,
      ...prioritizedDueCards.map(p => dueCards.find(c => c.flashcardId === p.id)!).filter(Boolean)
    ]

    // Calculate summary stats
    const stats = {
      totalDue: prioritized.length,
      newCards: newCards.length,
      learningCards: prioritized.filter(c => c.maturity === 'learning').length,
      youngCards: prioritized.filter(c => c.maturity === 'young').length,
      matureCards: prioritized.filter(c => c.maturity === 'mature').length,
      averageRetention: prioritized.length > 0
        ? prioritized.reduce((sum, c) => sum + c.estimatedRetention, 0) / prioritized.length
        : 0
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/flashcards/review-queue', 200, duration, {
      userId,
      totalDue: stats.totalDue
    })

    return NextResponse.json({
      success: true,
      queue: prioritized,
      stats
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Review queue error', error, { userId: 'unknown' })
    logger.api('GET', '/api/flashcards/review-queue', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to fetch review queue" },
      { status: 500 }
    )
  }
}
