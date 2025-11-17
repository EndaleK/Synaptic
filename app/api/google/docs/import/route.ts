/**
 * Google Docs Import API Route
 *
 * Import documents from Google Docs
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { importGoogleDoc, extractDocIdFromUrl } from '@/lib/google/docs'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { url, documentId } = body

    // Extract document ID from URL if provided
    let docId = documentId
    if (url && !docId) {
      docId = extractDocIdFromUrl(url)
    }

    if (!docId) {
      return NextResponse.json(
        { error: 'Invalid Google Docs URL or document ID' },
        { status: 400 }
      )
    }

    // Get user's Google access token
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile?.google_access_token) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google account first.' },
        { status: 403 }
      )
    }

    // TODO: Check if token is expired and refresh if needed
    // For now, assume token is valid

    // Import document from Google Docs
    const result = await importGoogleDoc(docId, profile.google_access_token)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: result.title,
        content: result.text,
        file_type: 'google_docs',
        file_size: result.text.length,
        source_url: result.url,
        metadata: {
          google_doc_id: result.documentId,
          imported_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating document:', dbError)
      return NextResponse.json(
        { error: 'Failed to save imported document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document,
      message: 'Google Doc imported successfully',
    })

  } catch (error) {
    console.error('Google Docs import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import Google Doc' },
      { status: 500 }
    )
  }
}
