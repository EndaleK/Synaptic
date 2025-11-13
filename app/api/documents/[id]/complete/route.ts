/**
 * API Route: POST /api/documents/{id}/complete
 *
 * Called after client completes direct upload to Supabase Storage
 *
 * Actions:
 * 1. Verify file exists in Supabase Storage
 * 2. Get actual file size from storage
 * 3. For small PDFs (<30MB): Extract text synchronously + index into ChromaDB
 * 4. For large PDFs (≥30MB): Trigger async Inngest background job
 * 5. For non-PDFs: Mark as completed immediately
 *
 * Processing Strategy:
 * - Small PDFs (<30MB): Synchronous extraction + ChromaDB indexing → Ready in 1-3 minutes
 * - Large PDFs (≥30MB): Async Inngest job with multi-tier extraction + RAG indexing
 * - Non-PDFs: Immediate completion (no processing needed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes (Vercel Pro max) for PDF extraction and ChromaDB indexing

// File size threshold for sync vs async processing
// Files ≥30MB will use async Inngest processing to avoid timeouts
// Files <30MB will be processed synchronously (extraction + indexing in this request)
// Note: Sync processing tested up to ~25MB reliably within 300s timeout
const LARGE_FILE_THRESHOLD = 30 * 1024 * 1024 // 30MB

export async function POST(
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

    // 3. Get document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    console.log(`📝 Completing upload for document: ${document.file_name}`)

    // 4. Verify file exists in Supabase Storage
    const { data: fileData, error: storageError } = await supabase
      .storage
      .from('documents')
      .list(document.storage_path.split('/')[0], {
        search: document.storage_path.split('/')[1]
      })

    if (storageError || !fileData || fileData.length === 0) {
      console.error('File not found in storage:', storageError)

      // Update document status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          metadata: {
            ...document.metadata,
            error: 'File not found in storage after upload',
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', documentId)

      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 404 }
      )
    }

    const actualFileSize = fileData[0].metadata?.size || document.file_size

    console.log(`✅ File verified in storage: ${(actualFileSize / (1024 * 1024)).toFixed(2)} MB`)

    // 5. Determine processing strategy based on file type and size
    const isPDF = document.file_type === 'application/pdf'
    const isLargeFile = actualFileSize > LARGE_FILE_THRESHOLD
    let processingStatus: 'processing' | 'completed' = 'completed'
    let extractedText: string | null = null
    let hasExtractedText = false
    let ragIndexed = false
    let ragChunkCount = 0
    let extractionMethod: string = 'none'

    if (isPDF && !isLargeFile) {
      // Small PDFs (<30MB): Process synchronously for immediate availability
      console.log(`📄 Processing small PDF synchronously: ${document.file_name} (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`)

      try {
        // Download file from storage
        const { data: fileBlob, error: downloadError } = await supabase
          .storage
          .from('documents')
          .download(document.storage_path)

        if (downloadError || !fileBlob) {
          console.error('Failed to download PDF for extraction:', downloadError)
          throw new Error('Failed to download PDF from storage')
        }

        // Convert Blob to File for parser
        const arrayBuffer = await fileBlob.arrayBuffer()
        const file = new File([arrayBuffer], document.file_name, { type: document.file_type })

        // Extract text using pdf2json
        const { parseServerPDF } = await import('@/lib/server-pdf-parser')
        const parseResult = await parseServerPDF(file)

        // Save page count and per-page data if available
        if (parseResult.pageCount) {
          console.log(`📄 PDF has ${parseResult.pageCount} pages`)
          document.metadata = {
            ...document.metadata,
            page_count: parseResult.pageCount,
            // Store per-page data for accurate page-based extraction
            pages: parseResult.pages || undefined
          }

          if (parseResult.pages) {
            console.log(`✅ Stored per-page data for ${parseResult.pages.length} pages`)
          }
        }

        // Capture extraction method
        extractionMethod = parseResult.method || 'pdf-parse'

        if (parseResult.error) {
          console.warn('PDF extraction failed:', parseResult.error)
        } else if (parseResult.text && parseResult.text.length > 0) {
          extractedText = parseResult.text
          hasExtractedText = true
          console.log(`✅ Extracted ${parseResult.text.length} characters from PDF using ${extractionMethod}`)

          // Index into ChromaDB for RAG (only if configured)
          if (process.env.CHROMA_URL) {
            try {
              const { indexDocument } = await import('@/lib/vector-store')
              const indexResult = await indexDocument(documentId, extractedText, {
                fileName: document.file_name,
                fileType: document.file_type,
                userId: profile.id,
              })

              ragIndexed = true
              ragChunkCount = indexResult.chunks
              console.log(`✅ Indexed ${indexResult.chunks} chunks into ChromaDB`)
            } catch (ragError) {
              console.error('ChromaDB indexing failed (non-fatal):', ragError)
              // Not fatal - document still usable without RAG
            }
          } else {
            console.log(`ℹ️ ChromaDB not configured, skipping vector indexing (document still usable with extracted text)`)
          }
        } else {
          console.log(`⚠️ No text extracted from PDF (may be scanned or image-based)`)
        }

      } catch (extractionError) {
        console.error('PDF processing error:', extractionError)
        // Not fatal - document still marked as completed, just without text
      }

      processingStatus = 'completed'
      console.log(`✅ Small PDF processed synchronously, ready for immediate use`)

    } else if (isPDF && isLargeFile) {
      // Large PDFs (≥30MB): Trigger async Inngest background job
      console.log(`🚀 Triggering async processing for large PDF: ${document.file_name} (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`)

      processingStatus = 'processing'

      try {
        await inngest.send({
          name: 'document/process',
          data: {
            documentId,
            userId: profile.id,
            fileName: document.file_name,
            fileType: document.file_type,
            fileSize: actualFileSize,
            storagePath: document.storage_path
          }
        })

        console.log(`✅ Background processing job queued for: ${document.file_name}`)
      } catch (inngestError) {
        console.error('Failed to queue Inngest job:', inngestError)
        // Fall back to lazy loading - mark as completed but without extracted text
        processingStatus = 'completed'
      }
    } else {
      console.log(`✅ Non-PDF file, marking as completed immediately`)
    }

    // 6. Update document record with processing results
    const updateData: any = {
      file_size: actualFileSize,
      processing_status: processingStatus,
      extracted_text: extractedText, // Save extracted text for small PDFs
      rag_indexed_at: ragIndexed ? new Date().toISOString() : null,
      rag_chunk_count: ragChunkCount,
      rag_collection_name: ragIndexed ? `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}` : null,
      metadata: {
        ...document.metadata,
        upload_completed_at: new Date().toISOString(),
        actual_file_size: actualFileSize,
        is_large_file: isLargeFile,
        has_extracted_text: hasExtractedText,
        processing_started_at: isPDF ? new Date().toISOString() : undefined,
        processing_completed_at: processingStatus === 'completed' ? new Date().toISOString() : undefined,
        extraction_method: isPDF && !isLargeFile ? `sync_${extractionMethod}` : isPDF && isLargeFile ? 'async_inngest' : 'none',
        rag_indexed: ragIndexed
      }
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document status' },
        { status: 500 }
      )
    }

    console.log(`✅ Upload completed successfully for: ${document.file_name}`)

    // 7. Return success response (processing continues in background for PDFs)
    return NextResponse.json({
      success: true,
      documentId,
      fileName: document.file_name,
      fileSize: actualFileSize,
      processingStatus
    })

  } catch (error) {
    console.error('Upload completion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
