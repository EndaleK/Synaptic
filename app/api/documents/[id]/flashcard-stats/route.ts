/**
 * API Route: GET /api/documents/{id}/flashcard-stats
 *
 * Get flashcard statistics for a specific document
 * - Total cards, due counts, mastery breakdown
 * - Success rate and last review date
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // 2. Get user profile
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Get all flashcards for this document
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', profile.id)

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError)
      return NextResponse.json(
        { error: 'Failed to fetch flashcards' },
        { status: 500 }
      )
    }

    const cards = flashcards || []

    // Handle empty case early
    if (cards.length === 0) {
      return NextResponse.json({
        documentId,
        documentName: document.file_name,
        totalCards: 0,
        dueToday: 0,
        dueThisWeek: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        averageAccuracy: 0,
        lastReviewedAt: null,
        hasCards: false
      })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekFromNow = new Date(today)
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)

    // 5. Calculate statistics
    const totalCards = cards.length
    const dueToday = cards.filter(card => {
      if (!card.next_review) return true // Never reviewed = due
      try {
        const nextReview = new Date(card.next_review)
        return nextReview <= today
      } catch {
        return true // Treat invalid dates as due
      }
    }).length

    const dueThisWeek = cards.filter(card => {
      if (!card.next_review) return true
      try {
        const nextReview = new Date(card.next_review)
        return nextReview <= oneWeekFromNow
      } catch {
        return true
      }
    }).length

    // Mastery levels (based on repetitions and interval)
    const learning = cards.filter(card => {
      const reps = card.repetitions || 0
      return reps < 2 // Learning: 0-1 repetitions
    }).length

    const reviewing = cards.filter(card => {
      const reps = card.repetitions || 0
      const interval = card.interval || 0
      return reps >= 2 && interval < 21 // Reviewing: 2+ reps but <21 day interval
    }).length

    const mastered = cards.filter(card => {
      const reps = card.repetitions || 0
      const interval = card.interval || 0
      return reps >= 2 && interval >= 21 // Mastered: 2+ reps and 21+ day interval
    }).length

    // Success rate
    const reviewedCards = cards.filter(card => (card.times_reviewed || 0) > 0)
    const totalReviews = reviewedCards.reduce((sum, card) => sum + (card.times_reviewed || 0), 0)
    const correctReviews = reviewedCards.reduce((sum, card) => sum + (card.times_correct || 0), 0)
    const averageAccuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0

    // Last reviewed
    const lastReviewedCard = cards
      .filter(card => card.last_reviewed_at)
      .sort((a, b) => {
        const dateA = new Date(a.last_reviewed_at!).getTime()
        const dateB = new Date(b.last_reviewed_at!).getTime()
        return dateB - dateA
      })[0]

    const lastReviewedAt = lastReviewedCard?.last_reviewed_at || null

    // 6. Return statistics
    return NextResponse.json({
      documentId,
      documentName: document.file_name,
      totalCards,
      dueToday,
      dueThisWeek,
      learning,
      reviewing,
      mastered,
      averageAccuracy,
      lastReviewedAt,
      hasCards: totalCards > 0
    })

  } catch (error) {
    console.error('Document flashcard stats error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch flashcard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
