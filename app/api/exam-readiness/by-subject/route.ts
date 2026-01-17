import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface SubjectReadiness {
  documentId: string
  documentName: string
  score: number
  flashcardCount: number
  masteredCount: number
  dueCount: number
  lastStudied: string | null
}

/**
 * GET /api/exam-readiness/by-subject
 * Get readiness scores broken down by document/subject
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get all documents with flashcards for this user
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, file_name')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return NextResponse.json({ subjects: [] })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ subjects: [] })
    }

    // Get flashcard stats for each document
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select(`
        id,
        document_id,
        maturity_level,
        next_review_at,
        last_reviewed_at,
        times_reviewed,
        times_correct
      `)
      .eq('user_id', profile.id)

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError)
      return NextResponse.json({ subjects: [] })
    }

    // Calculate readiness per document
    const now = new Date()
    const subjects: SubjectReadiness[] = []

    for (const doc of documents) {
      const docFlashcards = (flashcards || []).filter(f => f.document_id === doc.id)

      if (docFlashcards.length === 0) continue // Skip documents with no flashcards

      const masteredCount = docFlashcards.filter(f => f.maturity_level === 'mature').length
      const dueCount = docFlashcards.filter(f =>
        f.next_review_at && new Date(f.next_review_at) <= now
      ).length

      // Calculate overall accuracy
      let totalReviewed = 0
      let totalCorrect = 0
      let lastStudied: Date | null = null

      docFlashcards.forEach(f => {
        totalReviewed += f.times_reviewed || 0
        totalCorrect += f.times_correct || 0
        if (f.last_reviewed_at) {
          const reviewDate = new Date(f.last_reviewed_at)
          if (!lastStudied || reviewDate > lastStudied) {
            lastStudied = reviewDate
          }
        }
      })

      // Calculate readiness score based on:
      // - Mastery ratio (40%)
      // - Accuracy (30%)
      // - Due cards penalty (30%)
      const masteryRatio = docFlashcards.length > 0
        ? (masteredCount / docFlashcards.length) * 100
        : 0

      const accuracy = totalReviewed > 0
        ? (totalCorrect / totalReviewed) * 100
        : 50 // Neutral if not reviewed

      const duePenalty = docFlashcards.length > 0
        ? Math.max(0, 100 - (dueCount / docFlashcards.length) * 100)
        : 100

      const score = Math.round(
        masteryRatio * 0.4 +
        accuracy * 0.3 +
        duePenalty * 0.3
      )

      subjects.push({
        documentId: doc.id,
        documentName: doc.file_name,
        score,
        flashcardCount: docFlashcards.length,
        masteredCount,
        dueCount,
        lastStudied: lastStudied ? lastStudied.toISOString() : null
      })
    }

    // Sort by score (lowest first - need most attention)
    subjects.sort((a, b) => a.score - b.score)

    return NextResponse.json({ subjects })
  } catch (error) {
    console.error('Error calculating subject readiness:', error)
    return NextResponse.json(
      { error: 'Failed to calculate subject readiness' },
      { status: 500 }
    )
  }
}
