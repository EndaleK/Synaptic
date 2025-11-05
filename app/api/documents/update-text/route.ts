/**
 * API Route: Update Document Text
 *
 * Simple endpoint to save client-extracted PDF text to database
 * Called after browser-based PDF processing completes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute - simple text update

/**
 * POST /api/documents/update-text
 *
 * Updates document with extracted text and marks as completed
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const { documentId, extractedText, pageCount } = await request.json()

    if (!documentId || !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId and extractedText' },
        { status: 400 }
      )
    }

    // 3. Get user profile ID
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 4. Verify document ownership and update
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText.substring(0, 50000), // Store first 50K chars in DB
        processing_status: 'completed',
        metadata: {
          page_count: pageCount,
          extraction_method: 'client-side',
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json(
        { error: `Database update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ Document ${documentId} updated with ${extractedText.length} characters from ${pageCount} pages`)

    return NextResponse.json({
      success: true,
      documentId: document.id,
      textLength: extractedText.length,
      pageCount,
    })

  } catch (error) {
    console.error('Error updating document text:', error)
    return NextResponse.json(
      {
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
