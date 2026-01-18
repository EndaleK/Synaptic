// API Route: /api/shared/document/[token]
// Public endpoint to fetch shared document info (no auth required)

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

    // Find the document by share token
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        file_type,
        is_public,
        share_count,
        created_at,
        user_id,
        metadata,
        user_profiles:user_id (
          username,
          display_name
        )
      `)
      .eq('share_token', token)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if document is public
    if (!document.is_public) {
      return NextResponse.json({ error: 'This document is not publicly shared' }, { status: 403 })
    }

    // Get counts of generated content
    const [flashcardsResult, podcastsResult, mindmapsResult] = await Promise.all([
      supabase.from('flashcards').select('id', { count: 'exact' }).eq('document_id', document.id),
      supabase.from('podcasts').select('id', { count: 'exact' }).eq('document_id', document.id),
      supabase.from('mindmaps').select('id', { count: 'exact' }).eq('document_id', document.id)
    ])

    // Increment share count (fire and forget)
    supabase
      .from('documents')
      .update({ share_count: (document.share_count || 0) + 1 })
      .eq('id', document.id)
      .then(() => {})
      .catch(console.error)

    // Build response
    const userProfile = document.user_profiles as any
    const metadata = document.metadata as any

    return NextResponse.json({
      fileName: document.file_name,
      fileType: document.file_type,
      creatorName: userProfile?.display_name || userProfile?.username || null,
      createdAt: document.created_at,
      summary: metadata?.summary || null,
      hasFlashcards: (flashcardsResult.count || 0) > 0,
      hasPodcasts: (podcastsResult.count || 0) > 0,
      hasMindmaps: (mindmapsResult.count || 0) > 0,
      flashcardsCount: flashcardsResult.count || 0,
      podcastsCount: podcastsResult.count || 0,
      mindmapsCount: mindmapsResult.count || 0
    })
  } catch (error) {
    console.error('GET /api/shared/document/[token] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
