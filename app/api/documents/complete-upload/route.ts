/**
 * API Route: Complete Direct Upload
 *
 * Called after client finishes uploading directly to Supabase Storage
 * Verifies upload, updates document status, and returns success
 *
 * Text extraction happens client-side (for PDFs) or is skipped (for other types)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { trackDocumentUpload } from '@/lib/usage-tracker'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/documents/complete-upload
 *
 * Body:
 * - documentId: string
 * - storagePath: string
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { documentId, storagePath } = body

    if (!documentId || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, storagePath' },
        { status: 400 }
      )
    }

    logger.info('Completing direct upload', {
      userId,
      documentId,
      storagePath,
    })

    // 3. Verify document exists and belongs to user
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      logger.error('Document not found or unauthorized', docError, {
        userId,
        documentId,
      })
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // 4. Verify file exists in storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: storagePath.split('/').pop(),
      })

    if (storageError || !fileData || fileData.length === 0) {
      logger.error('File not found in storage', storageError, {
        userId,
        documentId,
        storagePath,
      })
      return NextResponse.json(
        { error: 'Upload verification failed - file not found in storage' },
        { status: 500 }
      )
    }

    logger.info('Upload verified successfully', {
      userId,
      documentId,
      fileName: document.file_name,
      fileSize: fileData[0].metadata?.size,
    })

    // 5. Update document status to 'processing'
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: 'processing',
        metadata: {
          ...document.metadata,
          upload_completed_at: new Date().toISOString(),
          upload_method: 'direct',
        },
      })
      .eq('id', documentId)

    if (updateError) {
      logger.error('Failed to update document status', updateError, {
        userId,
        documentId,
      })
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    // 6. Track usage
    await trackDocumentUpload(userId)

    const duration = Date.now() - startTime
    logger.info('Upload completed successfully', {
      userId,
      documentId,
      fileName: document.file_name,
      duration: `${duration}ms`,
    })

    return NextResponse.json({
      success: true,
      documentId,
      document: {
        id: document.id,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        status: 'processing',
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Upload completion failed', error, {
      userId,
      duration: `${duration}ms`,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
