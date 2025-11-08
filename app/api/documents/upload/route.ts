/**
 * API Route: POST /api/documents/upload
 *
 * Simple upload flow using Supabase signed URLs
 *
 * Flow:
 * 1. Client sends file metadata (name, size, type)
 * 2. Server validates, creates document record, generates signed upload URL
 * 3. Client uploads directly to Supabase using signed URL (bypasses Vercel limits)
 * 4. Client calls /api/documents/[id]/complete when done
 *
 * Benefits:
 * - No chunking needed (Supabase supports up to 5GB single upload)
 * - No session management (Supabase handles upload state)
 * - Fast (direct upload, no proxy)
 * - Reliable (browser handles retries)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30 // Only need time to generate URL, not upload file

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
const UPLOAD_URL_EXPIRY = 7200 // 2 hours in seconds

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userProfileId = profile.id

    // 3. Parse and validate request
    const body = await request.json()
    const { fileName, fileSize, fileType } = body

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, fileType' },
        { status: 400 }
      )
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `File type not allowed. Supported types: PDF, DOCX, TXT` },
        { status: 400 }
      )
    }

    console.log(`📤 Preparing upload for: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`)

    // 4. Create document record in database
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userProfileId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        storage_path: storagePath,
        extracted_text: '',
        processing_status: 'pending', // Will be updated to 'completed' by completion endpoint
        metadata: {
          upload_started_at: new Date().toISOString(),
          upload_method: 'signed_url'
        }
      })
      .select()
      .single()

    if (dbError || !document) {
      console.error('Failed to create document:', dbError)
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    console.log(`✅ Document record created with ID: ${document.id}`)

    // 5. Generate Supabase signed upload URL
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('documents')
      .createSignedUploadUrl(storagePath, {
        upsert: true // Allow overwriting if file exists
      })

    if (urlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', urlError)

      // Cleanup: Delete document record since we can't generate upload URL
      await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)
        .catch(err => console.error('Failed to cleanup document:', err))

      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: urlError?.message },
        { status: 500 }
      )
    }

    console.log(`✅ Generated signed upload URL, expires in ${UPLOAD_URL_EXPIRY}s`)

    // 6. Return upload URL and document ID to client
    return NextResponse.json({
      success: true,
      uploadUrl: signedUrlData.signedUrl,
      documentId: document.id,
      storagePath,
      expiresIn: UPLOAD_URL_EXPIRY,
      message: 'Upload URL generated successfully. Upload your file directly to this URL.'
    })

  } catch (error) {
    console.error('Upload preparation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to prepare upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
