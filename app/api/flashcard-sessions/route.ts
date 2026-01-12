/**
 * API Route: /api/flashcard-sessions
 *
 * GET: Fetch all flashcard generation sessions for the current user
 * DELETE: Delete a specific session and its flashcards
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface FlashcardSession {
  id: string
  title: string
  description: string | null
  generation_type: string
  selection_info: Record<string, unknown> | null
  cards_count: number
  cards_reviewed: number
  cards_mastered: number
  created_at: string
  last_studied_at: string | null
  document_id: string | null
  documents?: {
    name: string
    file_name: string
  } | null
}

/**
 * GET /api/flashcard-sessions
 * Fetch all flashcard generation sessions for the current user
 */
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

    // Fetch sessions with document info
    const { data: sessions, error } = await supabase
      .from('flashcard_generation_sessions')
      .select(`
        id,
        title,
        description,
        generation_type,
        selection_info,
        cards_count,
        cards_reviewed,
        cards_mastered,
        created_at,
        last_studied_at,
        document_id,
        documents (
          name,
          file_name
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[FlashcardSessions] Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('[FlashcardSessions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/flashcard-sessions?sessionId=xxx
 * Delete a specific session and all its flashcards
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
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

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('flashcard_generation_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Delete flashcards first (they have foreign key reference)
    const { error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('generation_session_id', sessionId)

    if (flashcardsError) {
      console.error('[FlashcardSessions] Error deleting flashcards:', flashcardsError)
      return NextResponse.json({ error: 'Failed to delete flashcards' }, { status: 500 })
    }

    // Delete session
    const { error: sessionError } = await supabase
      .from('flashcard_generation_sessions')
      .delete()
      .eq('id', sessionId)

    if (sessionError) {
      console.error('[FlashcardSessions] Error deleting session:', sessionError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[FlashcardSessions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
