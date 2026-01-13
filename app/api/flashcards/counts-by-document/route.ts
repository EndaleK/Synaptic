/**
 * API Route: /api/flashcards/counts-by-document
 *
 * GET: Get flashcard counts grouped by document for the current user
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get flashcard counts grouped by document_id
    // Using raw SQL for GROUP BY since Supabase JS client doesn't support it directly
    const { data: flashcards, error } = await supabase
      .from('flashcards')
      .select('document_id')
      .eq('user_id', profile.id)
      .not('document_id', 'is', null)

    if (error) {
      console.error('[FlashcardCounts] Error fetching flashcards:', error)
      return NextResponse.json({ error: 'Failed to fetch flashcard counts' }, { status: 500 })
    }

    // Count flashcards per document manually
    const countMap = new Map<string, number>()
    for (const card of flashcards || []) {
      if (card.document_id) {
        countMap.set(card.document_id, (countMap.get(card.document_id) || 0) + 1)
      }
    }

    // Convert to array format
    const counts = Array.from(countMap.entries()).map(([document_id, count]) => ({
      document_id,
      count
    }))

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('[FlashcardCounts] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
