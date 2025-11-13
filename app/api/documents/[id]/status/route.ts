/**
 * API Route: GET /api/documents/{id}/status
 *
 * Returns the current processing status of a document
 *
 * Used by UI to poll for status updates during async PDF processing
 *
 * Response includes:
 * - processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_ocr'
 * - metadata: Additional processing information (timestamps, method, errors)
 * - has_text: Whether extracted text is available
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

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

    // 3. Get document record with status (including RAG fields)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, file_type, file_size, processing_status, metadata, extracted_text, created_at, updated_at, rag_indexed_at, rag_chunk_count, rag_collection_name, error_message')
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // 4. Determine if document has extracted text
    const hasText = !!(document.extracted_text && document.extracted_text.length > 0)

    // 5. Calculate processing time if applicable
    let processingDuration: number | null = null
    if (document.metadata?.processing_started_at && document.metadata?.processing_completed_at) {
      const startTime = new Date(document.metadata.processing_started_at).getTime()
      const endTime = new Date(document.metadata.processing_completed_at).getTime()
      processingDuration = Math.round((endTime - startTime) / 1000) // seconds
    } else if (document.metadata?.processing_started_at && document.processing_status === 'processing') {
      const startTime = new Date(document.metadata.processing_started_at).getTime()
      const now = Date.now()
      processingDuration = Math.round((now - startTime) / 1000) // seconds elapsed
    }

    // 6. Build response (including RAG status)
    return NextResponse.json({
      documentId: document.id,
      fileName: document.file_name,
      fileType: document.file_type,
      fileSize: document.file_size,
      processingStatus: document.processing_status,
      errorMessage: document.error_message,
      hasText,
      textLength: hasText ? document.extracted_text.length : 0,
      ragIndexed: !!document.rag_indexed_at,
      ragChunkCount: document.rag_chunk_count || 0,
      ragCollectionName: document.rag_collection_name,
      metadata: {
        processingMethod: document.metadata?.processing_method,
        processingStartedAt: document.metadata?.processing_started_at,
        processingCompletedAt: document.metadata?.processing_completed_at,
        processingDuration,
        requiresOcr: document.metadata?.requires_ocr || false,
        message: document.metadata?.message,
        error: document.metadata?.error,
        fileHash: document.metadata?.file_hash,
        isLargeFile: document.metadata?.is_large_file || false,
        ragIndexed: document.rag_indexed || false,
        ragChunkCount: document.rag_chunk_count || 0,
      },
      timestamps: {
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        ragIndexedAt: document.rag_indexed_at,
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check document status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
