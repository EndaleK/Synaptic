// API Route: /api/shared/flashcards/[token]
// Public endpoint to fetch shared flashcard deck (no auth required)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params

    // Find the generation session by share token
    const { data: session, error: sessionError } = await supabase
      .from('flashcard_generation_sessions')
      .select(`
        id,
        is_public,
        share_count,
        created_at,
        document_id,
        user_id,
        documents:document_id (
          file_name
        ),
        user_profiles:user_id (
          username,
          display_name
        )
      `)
      .eq('share_token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Flashcard deck not found' }, { status: 404 })
    }

    // Check if deck is public
    if (!session.is_public) {
      return NextResponse.json({ error: 'This deck is not publicly shared' }, { status: 403 })
    }

    // Fetch flashcards for this session
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('id, question, answer, difficulty')
      .eq('generation_session_id', session.id)
      .order('created_at', { ascending: true })

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError)
      return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 })
    }

    // Increment share count (fire and forget)
    supabase
      .from('flashcard_generation_sessions')
      .update({ share_count: (session.share_count || 0) + 1 })
      .eq('id', session.id)
      .then(() => {})
      .catch(console.error)

    // Build response
    const documents = session.documents as any
    const userProfile = session.user_profiles as any

    return NextResponse.json({
      deckName: documents?.file_name || 'Flashcard Deck',
      cardCount: flashcards?.length || 0,
      creatorName: userProfile?.display_name || userProfile?.username || null,
      createdAt: session.created_at,
      flashcards: flashcards || []
    })
  } catch (error) {
    console.error('GET /api/shared/flashcards/[token] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
