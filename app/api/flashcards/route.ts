/**
 * API Route: Fetch Flashcards
 *
 * GET /api/flashcards?documentId={id} - Fetch flashcards for specific document
 * GET /api/flashcards - Fetch all flashcards for user (for Content Library)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

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

    // Filter by document if provided
    if (documentId) {
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
    const context = documentId ? `for document ${documentId}` : 'for user (all documents)'
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
