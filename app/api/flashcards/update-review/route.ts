import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { calculateSM2, getQualityFromLabel, initializeSM2, getNextReviewIntervals } from "@/lib/spaced-repetition/sm2-algorithm"

export const dynamic = 'force-dynamic'

interface UpdateReviewRequestBody {
  flashcardId: string
  rating: 'again' | 'hard' | 'good' | 'easy'
}

/**
 * POST /api/flashcards/update-review
 * Updates flashcard review using SM-2 algorithm
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated update review request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: UpdateReviewRequestBody = await req.json()
    const { flashcardId, rating } = body

    if (!flashcardId || !rating) {
      return NextResponse.json(
        { error: "flashcardId and rating are required" },
        { status: 400 }
      )
    }

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return NextResponse.json(
        { error: "rating must be one of: again, hard, good, easy" },
        { status: 400 }
      )
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

    // Verify flashcard belongs to user
    const { data: flashcard, error: flashcardError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .eq('user_id', userProfileId)
      .single()

    if (flashcardError || !flashcard) {
      logger.error('Flashcard not found', flashcardError, { userId, flashcardId })
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 })
    }

    // Get existing review queue entry or create new one
    const { data: existingReview } = await supabase
      .from('review_queue')
      .select('*')
      .eq('flashcard_id', flashcardId)
      .eq('user_id', userProfileId)
      .single()

    const now = new Date()
    const quality = getQualityFromLabel(rating)

    let sm2Result

    if (existingReview) {
      // Calculate next review using SM-2
      sm2Result = calculateSM2({
        quality,
        currentEaseFactor: existingReview.ease_factor,
        currentInterval: existingReview.interval_days,
        currentRepetitions: existingReview.repetitions,
        lastReviewDate: now
      })

      // Update existing review queue entry
      const { error: updateError } = await supabase
        .from('review_queue')
        .update({
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.interval,
          repetitions: sm2Result.repetitions,
          due_date: sm2Result.dueDate.toISOString().split('T')[0],
          last_reviewed_at: now.toISOString(),
          quality_rating: quality,
          updated_at: now.toISOString()
        })
        .eq('id', existingReview.id)

      if (updateError) {
        logger.error('Failed to update review queue', updateError, { userId, flashcardId })
        return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
      }
    } else {
      // First time reviewing - initialize with SM-2 defaults
      const initialSM2 = initializeSM2()

      // Apply the rating to the initialized data
      sm2Result = calculateSM2({
        quality,
        currentEaseFactor: initialSM2.easeFactor,
        currentInterval: initialSM2.interval,
        currentRepetitions: initialSM2.repetitions,
        lastReviewDate: now
      })

      // Create new review queue entry
      const { error: insertError } = await supabase
        .from('review_queue')
        .insert({
          flashcard_id: flashcardId,
          user_id: userProfileId,
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.interval,
          repetitions: sm2Result.repetitions,
          due_date: sm2Result.dueDate.toISOString().split('T')[0],
          last_reviewed_at: now.toISOString(),
          quality_rating: quality
        })

      if (insertError) {
        logger.error('Failed to create review queue entry', insertError, { userId, flashcardId })
        return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
      }
    }

    // Update flashcard stats
    const isCorrect = quality >= 3 // 3 or higher is considered correct
    const { error: flashcardUpdateError } = await supabase
      .from('flashcards')
      .update({
        times_reviewed: flashcard.times_reviewed + 1,
        times_correct: isCorrect ? flashcard.times_correct + 1 : flashcard.times_correct,
        last_reviewed_at: now.toISOString()
      })
      .eq('id', flashcardId)

    if (flashcardUpdateError) {
      logger.error('Failed to update flashcard stats', flashcardUpdateError, { userId, flashcardId })
      // Don't fail the request - SM-2 update succeeded
    }

    // Get next review intervals for all ratings (for preview in UI)
    const nextIntervals = getNextReviewIntervals({
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions
    })

    const duration = Date.now() - startTime
    logger.api('POST', '/api/flashcards/update-review', 200, duration, {
      userId,
      flashcardId,
      rating,
      nextReviewDays: sm2Result.interval
    })

    return NextResponse.json({
      success: true,
      review: {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        dueDate: sm2Result.dueDate.toISOString().split('T')[0],
        quality
      },
      nextIntervals,
      stats: {
        timesReviewed: flashcard.times_reviewed + 1,
        timesCorrect: isCorrect ? flashcard.times_correct + 1 : flashcard.times_correct,
        successRate: Math.round(
          ((isCorrect ? flashcard.times_correct + 1 : flashcard.times_correct) /
            (flashcard.times_reviewed + 1)) *
            100
        )
      }
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Update review error', error, { userId: 'unknown' })
    logger.api('POST', '/api/flashcards/update-review', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to update review" },
      { status: 500 }
    )
  }
}
