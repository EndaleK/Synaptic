/**
 * API Route: GET /api/documents/{id}/download-url
 *
 * Generates a Supabase signed URL for direct download
 *
 * Benefits over proxying:
 * - Faster (single network hop, no Next.js proxy)
 * - Better caching (Supabase CDN)
 * - No Vercel function execution time used
 * - No bandwidth costs for Vercel
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10 // Only need time to generate URL

const DOWNLOAD_URL_EXPIRY = 3600 // 1 hour in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

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

    // 3. Get document record and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, storage_path, file_type')
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    if (!document.storage_path) {
      return NextResponse.json(
        { error: 'Document has no storage path' },
        { status: 400 }
      )
    }

    console.log(`🔗 Generating download URL for: ${document.file_name}`)

    // 4. Generate signed download URL
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(document.storage_path, DOWNLOAD_URL_EXPIRY)

    if (urlError || !urlData?.signedUrl) {
      console.error('Failed to generate signed URL:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate download URL', details: urlError?.message },
        { status: 500 }
      )
    }

    console.log(`✅ Generated signed download URL, expires in ${DOWNLOAD_URL_EXPIRY}s`)

    // 5. Return signed URL to client
    return NextResponse.json({
      success: true,
      downloadUrl: urlData.signedUrl,
      fileName: document.file_name,
      fileType: document.file_type,
      expiresIn: DOWNLOAD_URL_EXPIRY,
      expiresAt: new Date(Date.now() + DOWNLOAD_URL_EXPIRY * 1000).toISOString()
    })

  } catch (error) {
    console.error('Download URL generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate download URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
