/**
 * Diagnostic endpoint to check document storage configuration
 * GET /api/documents/{id}/storage-info
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const supabase = await createClient()

    // Get document info
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if file exists in Supabase Storage
    let storageFileExists = false
    let storageError = null

    if (document.storage_path) {
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('documents')
        .list(document.storage_path.split('/').slice(0, -1).join('/'), {
          search: document.storage_path.split('/').pop()
        })

      if (fileError) {
        storageError = fileError.message
      } else {
        storageFileExists = fileData && fileData.length > 0
      }
    }

    // Check environment configuration
    const envConfig = {
      hasR2Endpoint: !!process.env.R2_ENDPOINT,
      hasR2AccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasR2SecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    return NextResponse.json({
      document: {
        id: document.id,
        fileName: document.file_name,
        fileSize: document.file_size,
        fileType: document.file_type,
        storagePath: document.storage_path,
        processingStatus: document.processing_status,
        hasExtractedText: !!document.extracted_text && document.extracted_text.length > 0,
        extractedTextLength: document.extracted_text?.length || 0,
        metadata: document.metadata,
      },
      storage: {
        fileExistsInSupabase: storageFileExists,
        storageError: storageError,
        storagePath: document.storage_path,
        expectedFetchUrl: `/api/documents/storage/${documentId}`, // Uses documentId to fetch correct path from DB
      },
      environment: envConfig,
      diagnosis: {
        usingR2: envConfig.hasR2Endpoint && envConfig.hasR2AccessKey && envConfig.hasR2SecretKey,
        usingSupabase: !envConfig.hasR2Endpoint,
        storagePathFormat: document.storage_path?.startsWith('documents/') ? 'R2_FORMAT' : 'SUPABASE_FORMAT',
      }
    })
  } catch (error) {
    console.error('Storage info error:', error)
    return NextResponse.json({
      error: 'Failed to get storage info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
