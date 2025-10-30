import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

interface MasteryRequestBody {
  flashcardId: string
  action: 'mastered' | 'needs-review'
}

/**
 * POST /api/flashcards/mastery
 * Updates flashcard mastery status based on green (mastered) or red (needs-review) button
 * Simpler than full SM-2 algorithm - just tracks mastery level and confidence
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
    const { flashcardId, action } = body

    if (!flashcardId || !action) {
      return NextResponse.json(
        { error: "flashcardId and action are required" },
        { status: 400 }
      )
    }

    if (!['mastered', 'needs-review'].includes(action)) {
      return NextResponse.json(
        { error: "action must be either 'mastered' or 'needs-review'" },
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
    let newMasteryLevel: string
    let newConfidenceScore: number
    const currentScore = flashcard.confidence_score || 0
    const isCorrect = action === 'mastered'

    // Update mastery level and confidence score based on action
    if (action === 'mastered') {
      // Green button: increase confidence, move towards mastered
      newConfidenceScore = Math.min(100, currentScore + 20) // Increase by 20, max 100

      if (newConfidenceScore >= 80) {
        newMasteryLevel = 'mastered'
      } else if (newConfidenceScore >= 50) {
        newMasteryLevel = 'reviewing'
      } else {
        newMasteryLevel = 'learning'
      }
    } else {
      // Red button: decrease confidence, back to learning
      newConfidenceScore = Math.max(0, currentScore - 15) // Decrease by 15, min 0

      if (newConfidenceScore < 30) {
        newMasteryLevel = 'learning'
      } else if (newConfidenceScore < 70) {
        newMasteryLevel = 'reviewing'
      } else {
        newMasteryLevel = 'mastered'
      }
    }

    // Calculate next review date (simple algorithm)
    let nextReviewAt: Date
    if (newMasteryLevel === 'mastered') {
      // Review in 7 days
      nextReviewAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    } else if (newMasteryLevel === 'reviewing') {
      // Review in 3 days
      nextReviewAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    } else {
      // Review tomorrow
      nextReviewAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    }

    // Update flashcard
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({
        mastery_level: newMasteryLevel,
        confidence_score: newConfidenceScore,
        times_reviewed: (flashcard.times_reviewed || 0) + 1,
        times_correct: isCorrect
          ? (flashcard.times_correct || 0) + 1
          : (flashcard.times_correct || 0),
        last_reviewed_at: now.toISOString(),
        next_review_at: nextReviewAt.toISOString()
      })
      .eq('id', flashcardId)

    if (updateError) {
      console.error('Failed to update flashcard mastery:', updateError)
      return NextResponse.json({ error: "Failed to update mastery" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mastery: {
        level: newMasteryLevel,
        confidenceScore: newConfidenceScore,
        timesReviewed: (flashcard.times_reviewed || 0) + 1,
        timesCorrect: isCorrect
          ? (flashcard.times_correct || 0) + 1
          : (flashcard.times_correct || 0),
        nextReviewAt: nextReviewAt.toISOString()
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
