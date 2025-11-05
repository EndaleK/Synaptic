/**
 * API Route: Fetch Flashcards
 *
 * GET /api/flashcards?documentId={id}
 * Fetches flashcards for a specific document
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

    // 2. Get documentId from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 }
      )
    }

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

    // 4. Verify document ownership
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

    // 5. Fetch flashcards for this document
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError)
      return NextResponse.json(
        { error: 'Failed to fetch flashcards' },
        { status: 500 }
      )
    }

    // 6. Return flashcards
    return NextResponse.json({
      flashcards: flashcards || [],
      documentName: document.file_name
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
