import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import {
  calculateAdaptiveSM2,
  estimateFlashcardDifficulty,
  getMinReviewsForMastery,
  getCardMaturity,
  getQualityFromLabel,
  type SM2ReviewInput
} from "@/lib/spaced-repetition/sm2-algorithm"

export const dynamic = 'force-dynamic'

interface MasteryRequestBody {
  flashcardId: string
  action: 'mastered' | 'needs-review' | 'hard' | 'good' | 'easy'
  // Legacy support
  quality?: number // 0-5 SM-2 quality scale (if provided, overrides action)
}

/**
 * POST /api/flashcards/mastery
 * Updates flashcard mastery status using enhanced SM-2 algorithm
 * Supports 4-button system: Again (needs-review), Hard, Good, Easy (mastered)
 * Also accepts legacy binary: mastered, needs-review
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: MasteryRequestBody = await req.json()
    const { flashcardId, action, quality: explicitQuality } = body

    if (!flashcardId || !action) {
      return NextResponse.json(
        { error: "flashcardId and action are required" },
        { status: 400 }
      )
    }

    // Validate action (supports both 4-button and legacy binary)
    const validActions = ['mastered', 'needs-review', 'hard', 'good', 'easy']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
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

    // Get flashcard
    const { data: flashcard, error: flashcardError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .eq('user_id', userProfileId)
      .single()

    if (flashcardError || !flashcard) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 })
    }

    const now = new Date()

    // Map action to SM-2 quality rating (0-5 scale)
    let quality: number
    if (explicitQuality !== undefined) {
      quality = explicitQuality
    } else {
      // Map button action to quality rating
      if (action === 'needs-review') {
        quality = getQualityFromLabel('again') // 0
      } else if (action === 'hard') {
        quality = getQualityFromLabel('hard') // 3
      } else if (action === 'good') {
        quality = getQualityFromLabel('good') // 4
      } else if (action === 'easy' || action === 'mastered') {
        quality = getQualityFromLabel('easy') // 5
      } else {
        quality = 4 // Default to "good"
      }
    }

    // Auto-detect difficulty if not already set
    let autoDifficulty = flashcard.auto_difficulty
    if (!autoDifficulty) {
      autoDifficulty = estimateFlashcardDifficulty(flashcard.front, flashcard.back)
    }

    // Prepare SM-2 input
    const sm2Input: SM2ReviewInput = {
      quality,
      currentEaseFactor: flashcard.ease_factor || 2.5,
      currentInterval: flashcard.interval_days || 1,
      currentRepetitions: flashcard.repetitions || 0,
      lastReviewDate: flashcard.last_reviewed_at ? new Date(flashcard.last_reviewed_at) : now
    }

    // Calculate next review using adaptive SM-2
    const reviewData = calculateAdaptiveSM2(sm2Input, autoDifficulty)

    // Determine maturity level based on repetitions and interval
    const newMaturityLevel = getCardMaturity(reviewData.repetitions, reviewData.interval)

    // Build review record for history
    const reviewRecord = {
      date: now.toISOString(),
      quality,
      interval: reviewData.interval
    }

    // Get existing review history
    const reviewHistory = Array.isArray(flashcard.review_history)
      ? flashcard.review_history
      : []

    // Append new review (limit to last 50 reviews)
    const updatedHistory = [...reviewHistory, reviewRecord].slice(-50)

    // Legacy compatibility: maintain old fields
    const isCorrect = quality >= 3
    const currentScore = flashcard.confidence_score || 0
    let newConfidenceScore: number
    if (isCorrect) {
      newConfidenceScore = Math.min(100, currentScore + 20)
    } else {
      newConfidenceScore = Math.max(0, currentScore - 15)
    }

    // Legacy mastery level mapping
    let legacyMasteryLevel: string
    if (newMaturityLevel === 'mature') {
      legacyMasteryLevel = 'mastered'
    } else if (newMaturityLevel === 'young' || newMaturityLevel === 'learning') {
      legacyMasteryLevel = 'reviewing'
    } else {
      legacyMasteryLevel = 'learning'
    }

    // Update flashcard with enhanced SM-2 data
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({
        // Enhanced SM-2 fields
        ease_factor: reviewData.easeFactor,
        interval_days: reviewData.interval,
        repetitions: reviewData.repetitions,
        last_quality_rating: quality,
        maturity_level: newMaturityLevel,
        review_history: updatedHistory,
        auto_difficulty: autoDifficulty,

        // Legacy fields (maintain backward compatibility)
        mastery_level: legacyMasteryLevel,
        confidence_score: newConfidenceScore,
        times_reviewed: (flashcard.times_reviewed || 0) + 1,
        times_correct: isCorrect
          ? (flashcard.times_correct || 0) + 1
          : (flashcard.times_correct || 0),
        last_reviewed_at: now.toISOString(),
        next_review_at: reviewData.dueDate.toISOString()
      })
      .eq('id', flashcardId)

    if (updateError) {
      console.error('Failed to update flashcard mastery:', updateError)
      return NextResponse.json({ error: "Failed to update mastery" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mastery: {
        // Enhanced SM-2 data
        maturityLevel: newMaturityLevel,
        easeFactor: reviewData.easeFactor,
        intervalDays: reviewData.interval,
        repetitions: reviewData.repetitions,
        qualityRating: quality,
        autoDifficulty,
        nextReviewAt: reviewData.dueDate.toISOString(),

        // Legacy fields (for backward compatibility)
        level: legacyMasteryLevel,
        confidenceScore: newConfidenceScore,
        timesReviewed: (flashcard.times_reviewed || 0) + 1,
        timesCorrect: isCorrect
          ? (flashcard.times_correct || 0) + 1
          : (flashcard.times_correct || 0)
      }
    })

  } catch (error: any) {
    console.error('Mastery update error:', error)
    return NextResponse.json(
      { error: error.message || "Failed to update mastery" },
      { status: 500 }
    )
  }
}
