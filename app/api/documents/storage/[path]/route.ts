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
      console.error('❌ Storage API: Missing path parameter')
      return NextResponse.json(
        { error: 'Storage path is required' },
        { status: 400 }
      )
    }

    // Decode the path
    const storagePath = decodeURIComponent(path)

    console.log('📥 Storage API: Fetching file from Supabase storage:', storagePath)

    // Initialize Supabase client
    const supabase = await createClient()

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
        storagePath
      })

      return NextResponse.json(
        {
          error: 'File not found in storage',
          details: `HTTP ${fileResponse.status}: ${fileResponse.statusText}`,
          storagePath
        },
        { status: 404 }
      )
    }

    const fileBlob = await fileResponse.blob()
    console.log('✅ Fetched from Supabase successfully, size:', fileBlob.size, 'bytes')

    // Determine content type from storage path
    const fileName = storagePath.split('/').pop() || 'document'
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
