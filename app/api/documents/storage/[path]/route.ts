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

    // Check if this file is in R2 by looking up the document
    // Large files (>5MB) are stored in R2 and have metadata.r2_url
    let isR2File = false
    let document: any = null

    try {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id, metadata, storage_path, file_size')
        .eq('storage_path', storagePath)
        .single()

      document = doc

      // Check if file is stored in R2 (storage_path starts with "documents/")
      isR2File = !docError && document && document.storage_path?.startsWith('documents/')

      if (isR2File) {
        console.log('📦 File is in R2, storage_path:', document.storage_path)

        // Get R2 URL - either from metadata or generate signed URL
        let r2Url = document.metadata?.r2_url

        // If r2_url is empty or invalid (contains "undefined"), generate signed URL
        if (!r2Url || r2Url.includes('undefined')) {
          console.log('⚠️ R2 public URL not configured, checking if file exists and generating signed URL for:', document.storage_path)

          // Check if R2 is configured
          const hasR2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)

          if (!hasR2) {
            console.error('❌ R2 credentials not configured - will try Supabase fallback')
            isR2File = false // Mark as non-R2 to trigger Supabase fallback
          } else {
            try {
              // First check if file actually exists in R2
              const { fileExistsInR2, getR2SignedUrl } = await import('@/lib/r2-storage')
              const fileExists = await fileExistsInR2(document.storage_path)

              if (!fileExists) {
                console.warn('⚠️ File not found in R2, will try Supabase fallback:', document.storage_path)
                isR2File = false // Mark as non-R2 to trigger Supabase fallback
              } else {
                // File exists, generate signed URL
                r2Url = await getR2SignedUrl(document.storage_path, 3600) // 1 hour expiry
                console.log('✅ File exists in R2, generated signed URL successfully')
              }
            } catch (r2Error) {
              console.error('❌ R2 check/signed URL failed, will try Supabase fallback:', r2Error)
              isR2File = false // Mark as non-R2 to trigger Supabase fallback
            }
          }
        }

        if (r2Url) {
          // Check file size to determine strategy
          const fileSize = document.file_size || 0
          const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 // 50MB

          // For large files (>50MB), stream directly from R2
          if (fileSize > FILE_SIZE_THRESHOLD) {
            console.log(`📦 Large file (${Math.round(fileSize / 1024 / 1024)}MB), streaming from R2`)

            try {
              const r2Response = await fetch(r2Url)
              if (!r2Response.ok) {
                // Capture detailed error information from R2
                const errorBody = await r2Response.text().catch(() => 'Unable to read error body')
                const errorDetails = {
                  status: r2Response.status,
                  statusText: r2Response.statusText,
                  headers: Object.fromEntries(r2Response.headers.entries()),
                  body: errorBody,
                  url: r2Url.substring(0, 100) + '...' // Log partial URL for debugging
                }
                console.error('❌ R2 fetch failed with detailed error:', errorDetails)
                throw new Error(`R2 fetch failed: ${r2Response.status} ${r2Response.statusText} - ${errorBody}`)
              }

              // Stream the response directly without loading into memory
              return new NextResponse(r2Response.body, {
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Length': String(fileSize),
                  'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
                  'Cache-Control': 'public, max-age=3600',
                  'Accept-Ranges': 'bytes', // Enable range requests for seeking
                },
              })
            } catch (r2Error) {
              console.error('❌ R2 stream failed, will try Supabase fallback:', r2Error)
              // Don't return error - fall through to Supabase fallback
              isR2File = false // Disable R2 mode to trigger Supabase fallback
            }
          } else {
            // For smaller files (<50MB), fetch as blob (original behavior)
            // Don't redirect - that breaks fetch() calls from JavaScript
            try {
              const r2Response = await fetch(r2Url)
              if (!r2Response.ok) {
                // Capture detailed error information from R2
                const errorBody = await r2Response.text().catch(() => 'Unable to read error body')
                const errorDetails = {
                  status: r2Response.status,
                  statusText: r2Response.statusText,
                  headers: Object.fromEntries(r2Response.headers.entries()),
                  body: errorBody,
                  url: r2Url.substring(0, 100) + '...' // Log partial URL for debugging
                }
                console.error('❌ R2 fetch failed with detailed error:', errorDetails)
                throw new Error(`R2 fetch failed: ${r2Response.status} ${r2Response.statusText} - ${errorBody}`)
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
              console.error('❌ R2 fetch failed, will try Supabase fallback:', r2Error)
              // Don't return error - fall through to Supabase fallback
              isR2File = false // Disable R2 mode to trigger Supabase fallback
            }
          }
        }
      }

      // If R2 file but failed to fetch from R2, fall back to Supabase
      if (isR2File) {
        console.log('⚠️ R2 fetch failed, falling back to Supabase storage')
        // Try Supabase with original R2 path first, then strip prefix if needed
      }

      // If document not found in DB, try Supabase storage directly
      if (!document) {
        console.log('⚠️ Document not found in DB, trying Supabase storage directly')
      }
    } catch (lookupError) {
      console.warn('⚠️ R2 lookup failed, falling back to Supabase storage:', lookupError)
    }

    // Try approach 1: Generate a signed URL and fetch blob
    // NOTE: Don't use redirect - it breaks fetch() calls from JavaScript
    try {
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(storagePath, 3600) // 1 hour expiry

      if (urlError) {
        console.warn('⚠️ Signed URL failed, trying download approach:', urlError.message)
      } else if (urlData?.signedUrl) {
        console.log('✅ Generated signed URL successfully, fetching blob...')

        // Fetch the file from the signed URL
        const fileResponse = await fetch(urlData.signedUrl)
        if (!fileResponse.ok) {
          throw new Error(`Fetch from signed URL failed: ${fileResponse.status}`)
        }

        const fileBlob = await fileResponse.blob()
        console.log('✅ Fetched from Supabase successfully, size:', fileBlob.size)

        return new NextResponse(fileBlob, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
            'Cache-Control': 'public, max-age=3600',
          },
        })
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
        error: error.message || 'Unknown error',
        errorName: error.name || 'Error',
        errorCode: (error as any).statusCode || (error as any).status || 'N/A',
        errorDetails: String(error)
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch document from storage',
          details: error.message || String(error) || 'Unknown Supabase storage error',
          storagePath,
          hint: 'Check Supabase storage bucket permissions and RLS policies',
          errorCode: (error as any).statusCode || (error as any).status
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
