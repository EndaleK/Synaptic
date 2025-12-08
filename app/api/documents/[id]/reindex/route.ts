/**
 * API Route: POST /api/documents/[id]/reindex
 *
 * Re-indexes a document in the vector store with improved chunking strategy.
 * Useful for:
 * - Documents indexed with old chunking parameters
 * - Improving RAG quality for specific documents
 * - Forcing re-extraction of document text
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { deleteDocumentVectors, indexDocument } from '@/lib/vector-store'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large documents

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // 2. Get document and verify ownership
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    logger.info('Re-indexing document', {
      userId,
      documentId,
      fileName: document.file_name,
    })

    // 3. Get document text - prefer fresh extraction from storage for best quality
    let text = ''

    if (document.storage_path) {
      // Download and extract fresh text
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storage_path)

      if (!downloadError && fileData) {
        if (document.file_type === 'application/pdf') {
          const { parseServerPDF } = await import('@/lib/server-pdf-parser')
          const file = new File([fileData], document.file_name, { type: 'application/pdf' })
          const parseResult = await parseServerPDF(file)
          if (parseResult.text) {
            text = parseResult.text
          }
        } else if (
          document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          document.file_type === 'application/msword'
        ) {
          const mammoth = await import('mammoth')
          const arrayBuffer = await fileData.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer })
          text = result.value || ''
        } else if (document.file_type === 'text/plain') {
          text = await fileData.text()
        }
      }
    }

    // Fall back to stored text if extraction failed
    if (!text && document.extracted_text) {
      text = document.extracted_text
    }

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Insufficient text content for re-indexing' },
        { status: 400 }
      )
    }

    // 4. Delete existing vectors
    logger.info('Deleting existing vectors', { documentId })
    await deleteDocumentVectors(documentId)

    // 5. Re-index with improved chunking
    logger.info('Re-indexing with improved chunking strategy', {
      documentId,
      textLength: text.length,
    })

    const result = await indexDocument(documentId, text, {
      fileName: document.file_name,
      fileType: document.file_type,
      userId: profile.id.toString(),
    })

    const duration = Date.now() - startTime

    logger.info('Document re-indexed successfully', {
      documentId,
      chunks: result.chunks,
      duration: `${duration}ms`,
    })

    return NextResponse.json({
      success: true,
      message: `Document re-indexed with ${result.chunks} chunks using improved chunking strategy`,
      chunks: result.chunks,
      duration: `${(duration / 1000).toFixed(1)}s`,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('Document re-indexing failed', error, { duration: `${duration}ms` })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Re-indexing failed' },
      { status: 500 }
    )
  }
}
