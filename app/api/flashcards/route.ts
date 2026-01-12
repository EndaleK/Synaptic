/**
 * API Route: Fetch Flashcards
 *
 * GET /api/flashcards?documentId={id} - Fetch flashcards for specific document
 * GET /api/flashcards?sessionId={id} - Fetch flashcards for a specific generation session
 * GET /api/flashcards - Fetch all flashcards for user (for Content Library)
 * DELETE /api/flashcards?documentId={id} - Delete all flashcards for a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const sessionId = searchParams.get('sessionId')
    const limit = searchParams.get('limit')

    // 3. Initialize Supabase client
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 4. Build query based on whether documentId is provided
    let query = supabase
      .from('flashcards')
      .select(`
        *,
        documents:document_id (
          id,
          file_name,
          file_type
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    // Filter by generation session if provided
    if (sessionId) {
      // Verify session ownership first
      const { data: session, error: sessionError } = await supabase
        .from('flashcard_generation_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .eq('user_id', profile.id)
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        )
      }

      query = query.eq('generation_session_id', sessionId)
    }
    // Filter by document if provided
    else if (documentId) {
      // Verify document ownership first
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, file_name, user_id')
        .eq('id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (docError || !document) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        )
      }

      query = query.eq('document_id', documentId)
    }

    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    // 5. Fetch flashcards
    const { data: flashcards, error: flashcardsError } = await query

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError)
      return NextResponse.json(
        { error: 'Failed to fetch flashcards' },
        { status: 500 }
      )
    }

    // 6. Return flashcards
    const context = sessionId
      ? `for session ${sessionId}`
      : documentId
        ? `for document ${documentId}`
        : 'for user (all documents)'
    console.log(`📋 Returning ${flashcards?.length || 0} flashcards ${context}`)

    return NextResponse.json({
      flashcards: flashcards || []
    })

  } catch (error) {
    console.error('Flashcards fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch flashcards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get documentId from query params (required)
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 }
      )
    }

    // 3. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 4. Verify document belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', profile.id) // Use query filter instead of post-check
      .single()

    if (docError || !document) {
      logger.warn('Document not found for flashcard deletion or access denied', {
        userId,
        documentId,
        profileId: profile.id,
        error: docError?.message
      })
      return NextResponse.json({
        error: 'Document not found or access denied'
      }, { status: 404 })
    }

    // 5. Delete all flashcards for this document
    const { error: deleteError, count } = await supabase
      .from('flashcards')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', profile.id)

    if (deleteError) {
      logger.error('Failed to delete flashcards', deleteError, { userId, documentId })
      return NextResponse.json(
        { error: 'Failed to delete flashcards' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.info('Flashcards deleted successfully', { userId, documentId, count, duration })

    return NextResponse.json({
      success: true,
      message: 'Flashcards deleted successfully',
      count
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DELETE /api/flashcards error', error, { duration })
    return NextResponse.json(
      {
        error: 'Failed to delete flashcards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
