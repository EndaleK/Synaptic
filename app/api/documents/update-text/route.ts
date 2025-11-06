/**
 * API Route: Update Document Text
 *
 * Saves client-extracted PDF text
 * Called after browser-based PDF processing completes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes

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

    // 4. Fetch existing document to preserve metadata (r2_url, topics, etc.)
    // Try multiple strategies to find the document (handles profile duplication issues)
    console.log(`🔍 UPDATE-TEXT REQUEST:`, {
      documentId,
      clerkUserId: userId,
      profileId: profile.id,
      textLength: extractedText.length,
      pageCount
    })

    let existingDoc = null
    let actualUserId = null

    // Strategy 1: Try with current profile.id
    const { data: docByProfile, error: docFetchError } = await supabase
      .from('documents')
      .select('metadata, user_id, file_name, storage_path, processing_status')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    console.log(`📊 Strategy 1 Result (profile.id=${profile.id}):`, {
      found: !!docByProfile,
      error: docFetchError?.message || null
    })

    if (docByProfile) {
      existingDoc = docByProfile
      actualUserId = profile.id
      console.log('✅ Found document using profile.id:', {
        fileName: docByProfile.file_name,
        status: docByProfile.processing_status,
        storagePath: docByProfile.storage_path
      })
    } else {
      // Strategy 2: Try finding document and check if it belongs to same Clerk user
      console.log('⚠️ Not found with profile.id, trying Clerk user match...')
      const { data: anyDoc, error: anyDocError } = await supabase
        .from('documents')
        .select('metadata, user_id, file_name, storage_path, processing_status')
        .eq('id', documentId)
        .single()

      console.log(`📊 Strategy 2 Result (any document with id=${documentId}):`, {
        found: !!anyDoc,
        error: anyDocError?.message || null,
        docUserId: anyDoc?.user_id || null
      })

      if (anyDoc) {
        // Check if this document belongs to the same Clerk user (different profile)
        const { data: docOwnerProfile } = await supabase
          .from('user_profiles')
          .select('clerk_user_id')
          .eq('id', anyDoc.user_id)
          .single()

        console.log(`📊 Document owner check:`, {
          docOwnerClerkId: docOwnerProfile?.clerk_user_id || null,
          currentClerkId: userId,
          match: docOwnerProfile?.clerk_user_id === userId
        })

        if (docOwnerProfile && docOwnerProfile.clerk_user_id === userId) {
          console.log('✅ Found document with different profile but same Clerk user')
          existingDoc = anyDoc
          actualUserId = anyDoc.user_id
        } else {
          console.error('❌ Document belongs to different user')
        }
      } else {
        // Strategy 3: Check if ANY documents exist for this user at all
        const { data: userDocs, error: userDocsError } = await supabase
          .from('documents')
          .select('id, file_name, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)

        console.log(`📊 Recent documents for user (profile.id=${profile.id}):`, {
          count: userDocs?.length || 0,
          documents: userDocs?.map(d => ({ id: d.id, fileName: d.file_name })) || [],
          error: userDocsError?.message || null
        })
      }
    }

    if (!existingDoc) {
      console.error('❌ Document not found for user:', {
        documentId,
        clerkUserId: userId,
        profileId: profile.id,
        searched: 'Both profile.id and Clerk user matching strategies failed'
      })
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ Document found: ${existingDoc.file_name}`)

    // 5. Update document with extracted text using actual user_id
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText.substring(0, 50000), // Store first 50K chars in DB
        processing_status: 'completed',
        metadata: {
          ...(existingDoc.metadata || {}), // Preserve existing metadata (r2_url, topics, etc.)
          page_count: pageCount,
          extraction_method: 'client-side',
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', documentId)
      .eq('user_id', actualUserId) // Use the actual user_id we found
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
      message: 'Document text saved successfully'
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
