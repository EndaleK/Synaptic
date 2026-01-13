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
 * Falls back to document-grouped flashcards if sessions table doesn't exist
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

    // Try to fetch sessions with document info
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

    // If table doesn't exist (migration not run), fall back to document-grouped flashcards
    if (error) {
      console.error('[FlashcardSessions] Error fetching sessions:', error)

      // Check if error is because table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.log('[FlashcardSessions] Sessions table not found, falling back to document-grouped flashcards')

        // Fall back: Get flashcards grouped by document
        const { data: flashcards, error: flashcardsError } = await supabase
          .from('flashcards')
          .select(`
            id,
            document_id,
            created_at,
            maturity_level,
            times_reviewed,
            documents (
              id,
              name,
              file_name
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (flashcardsError) {
          console.error('[FlashcardSessions] Error fetching flashcards fallback:', flashcardsError)
          return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 })
        }

        // Group flashcards by document
        const documentGroups = new Map<string, {
          documentId: string | null
          documentName: string
          fileName: string
          cards: typeof flashcards
          createdAt: string
        }>()

        for (const card of flashcards || []) {
          const docId = card.document_id || 'no-document'
          if (!documentGroups.has(docId)) {
            documentGroups.set(docId, {
              documentId: card.document_id,
              documentName: card.documents?.name || 'Untitled',
              fileName: card.documents?.file_name || '',
              cards: [],
              createdAt: card.created_at
            })
          }
          documentGroups.get(docId)!.cards.push(card)
        }

        // Convert to sessions format
        const fallbackSessions: FlashcardSession[] = Array.from(documentGroups.entries()).map(([docId, group]) => ({
          id: `fallback-${docId}`, // Temporary ID
          title: group.documentName,
          description: null,
          generation_type: 'full',
          selection_info: null,
          cards_count: group.cards.length,
          cards_reviewed: group.cards.filter(c => (c.times_reviewed || 0) > 0).length,
          cards_mastered: group.cards.filter(c => c.maturity_level === 'mature').length,
          created_at: group.createdAt,
          last_studied_at: null,
          document_id: group.documentId,
          documents: group.documentId ? {
            name: group.documentName,
            file_name: group.fileName
          } : null
        }))

        return NextResponse.json({
          sessions: fallbackSessions,
          fallback: true // Indicate this is fallback data
        })
      }

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
