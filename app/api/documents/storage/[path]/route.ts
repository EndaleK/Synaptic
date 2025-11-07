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
    let storagePath = decodeURIComponent(path)
    const originalPath = storagePath // Keep for DB lookup

    // Remove 'documents/' prefix if present (bucket is already named 'documents')
    if (storagePath.startsWith('documents/')) {
      storagePath = storagePath.substring('documents/'.length)
      console.log('📥 Storage API: Stripped documents/ prefix, fetching:', storagePath)
    } else {
      console.log('📥 Storage API: Fetching file from storage:', storagePath)
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Check if this file is in R2 by looking up the document
    // Large files (>5MB) are stored in R2 and have metadata.r2_url
    try {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, metadata, storage_path')
        .eq('storage_path', originalPath)
        .single()

      if (!docError && document && document.metadata?.r2_url) {
        console.log('📦 File is in R2, fetching from R2 URL:', document.metadata.r2_url)

        // Fetch the file from R2 and return it
        // Don't redirect - that breaks fetch() calls from JavaScript
        try {
          const r2Response = await fetch(document.metadata.r2_url)
          if (!r2Response.ok) {
            throw new Error(`R2 fetch failed: ${r2Response.status}`)
          }

          const r2Data = await r2Response.blob()
          console.log('✅ Fetched from R2 successfully, size:', r2Data.size)

          return new NextResponse(r2Data, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
              'Cache-Control': 'public, max-age=3600',
            },
          })
        } catch (r2Error) {
          console.error('❌ R2 fetch failed, falling back to Supabase storage:', r2Error)
          // Continue to Supabase storage fallback
        }
      }

      // If document not found or no R2 URL, continue with Supabase storage fetch
      if (docError) {
        console.log('⚠️ Document not found in DB, falling back to Supabase storage:', docError.message)
      }
    } catch (lookupError) {
      console.warn('⚠️ R2 lookup failed, falling back to Supabase storage:', lookupError)
    }

    // Try approach 1: Generate a signed URL and redirect (more reliable)
    try {
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(storagePath, 3600) // 1 hour expiry

      if (urlError) {
        console.warn('⚠️ Signed URL failed, trying download approach:', urlError.message)
      } else if (urlData?.signedUrl) {
        console.log('✅ Generated signed URL successfully')
        // Redirect to the signed URL
        return NextResponse.redirect(urlData.signedUrl)
      }
    } catch (signedUrlError) {
      console.warn('⚠️ Signed URL approach failed:', signedUrlError)
    }

    // Fallback approach 2: Direct download
    console.log('📥 Using direct download approach')
    const { data, error } = await supabase
      .storage
      .from('documents')
      .download(storagePath)

    if (error) {
      console.error('❌ Supabase storage download error:', {
        storagePath,
        error: error.message,
        errorName: error.name,
        errorCode: (error as any).statusCode,
        details: JSON.stringify(error, null, 2)
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch document from storage',
          details: error.message,
          storagePath,
          hint: 'Check Supabase storage bucket permissions and RLS policies'
        },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('❌ No data returned from storage download')
      return NextResponse.json(
        { error: 'Document not found in storage', storagePath },
        { status: 404 }
      )
    }

    console.log('✅ Downloaded file successfully, size:', data.size)

    // Return the file as a blob
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'application/pdf',
        'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ Storage API critical error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      details: error
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
