// API Route: GET /api/documents/storage/[path]
// Fetches original document files from Supabase storage

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
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
    console.log('📥 Storage API: Fetching file from storage:', storagePath)

    // Initialize Supabase client
    const supabase = await createClient()

    // Download the file from Supabase storage
    const { data, error } = await supabase
      .storage
      .from('documents')
      .download(storagePath)

    if (error) {
      console.error('❌ Supabase storage download error:', {
        storagePath,
        error: error.message,
        details: error
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch document from storage',
          details: error.message,
          storagePath
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Document not found in storage' },
        { status: 404 }
      )
    }

    // Return the file as a blob
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Storage API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
