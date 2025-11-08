// API Route: GET /api/documents/storage/[path]
// Fetches original document files from Supabase storage
// SIMPLIFIED: R2 logic removed - uses only Supabase storage

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    // Verify authentication
    const { userId } = await auth()
    if (!userId) {
      console.error('❌ Storage API: Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { path } = await params

    if (!path) {
      console.error('❌ Storage API: Missing document ID parameter')
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Decode the documentId (can be documentId or legacy storage_path for backward compatibility)
    const documentIdOrPath = decodeURIComponent(path)

    console.log('📥 Storage API: Fetching document:', documentIdOrPath)

    // Initialize Supabase client
    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Storage API: User profile not found')
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch document from database to get correct storage_path and verify ownership
    // Try as documentId first, then fall back to storage_path for backward compatibility
    let document
    let storagePath

    // Try fetching by ID first (new approach)
    const { data: docById, error: idError } = await supabase
      .from('documents')
      .select('storage_path, file_name')
      .eq('id', documentIdOrPath)
      .eq('user_id', profile.id)
      .single()

    if (docById) {
      document = docById
      storagePath = docById.storage_path
      console.log('✅ Document found by ID, using storage_path from database:', storagePath)
    } else {
      // Fall back to treating it as a storage_path (legacy support)
      storagePath = documentIdOrPath
      console.log('⚠️ Treating parameter as storage_path (legacy mode):', storagePath)
    }

    // Generate a signed URL for the file (works for all files, 1 hour expiry)
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (urlError || !urlData?.signedUrl) {
      console.error('❌ Failed to generate signed URL:', {
        storagePath,
        error: urlError?.message || 'No signed URL returned'
      })

      return NextResponse.json(
        {
          error: 'Failed to generate download URL',
          details: urlError?.message || 'Unknown error',
          storagePath,
          hint: 'File may not exist in storage or permissions may be incorrect'
        },
        { status: 404 }
      )
    }

    console.log('✅ Generated signed URL successfully, fetching file...')

    // Fetch the file from the signed URL
    const fileResponse = await fetch(urlData.signedUrl)

    if (!fileResponse.ok) {
      console.error('❌ Fetch from signed URL failed:', {
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        storagePath,
        documentId: document?.file_name || 'unknown'
      })

      return NextResponse.json(
        {
          error: 'File not found in storage',
          details: `HTTP ${fileResponse.status}: ${fileResponse.statusText}`,
          storagePath,
          hint: 'File may have been moved or deleted from storage'
        },
        { status: 404 }
      )
    }

    const fileBlob = await fileResponse.blob()
    console.log('✅ Fetched from Supabase successfully, size:', fileBlob.size, 'bytes')

    // Determine content type and filename
    // Prefer database filename if available (more accurate), otherwise extract from storage path
    const fileName = document?.file_name || storagePath.split('/').pop() || 'document'
    const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'

    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': String(fileBlob.size),
      },
    })

  } catch (error) {
    console.error('❌ Storage API: Unexpected error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch document from storage',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    )
  }
}
