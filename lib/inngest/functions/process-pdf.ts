/**
 * Inngest Function: PDF Processing
 *
 * Background job for processing PDF documents with multi-tier extraction:
 * 1. Try pdf-parse (fast, reliable, Mozilla PDF.js based)
 * 2. Fallback to PyMuPDF service (better quality for complex PDFs)
 * 3. Detect scanned PDFs → flag for optional OCR
 *
 * This runs asynchronously, allowing users to proceed without waiting.
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const processPDFFunction = inngest.createFunction(
  {
    id: 'process-pdf-document',
    name: 'Process PDF Document',
    // Retry configuration
    retries: 3,
    // Allow up to 15 minutes for very large PDFs
    maxDuration: 900, // 15 minutes

    // CRITICAL: Handle failures (including timeouts) to prevent stuck documents
    onFailure: async ({ event, error }) => {
      const { documentId } = event.data

      logger.error('[Inngest] PDF processing failed via onFailure hook', error, {
        documentId,
        errorType: error.name,
        errorMessage: error.message,
      })

      try {
        // Use service role to bypass RLS in background job context
        const supabase = await createClient()

        logger.info('[Inngest] Attempting to update document status to failed', { documentId })

        const { data, error: updateError } = await supabase
          .from('documents')
          .update({
            processing_status: 'failed',
            error_message: `Processing failed: ${error.message || 'Unknown error'}`,
            metadata: {
              processing_failed_at: new Date().toISOString(),
              failure_reason: error.name === 'TimeoutError' ? 'timeout' : 'error',
              error_details: error.message || String(error),
              failed_via: 'onFailure_hook',
            },
          })
          .eq('id', documentId)
          .select()

        if (updateError) {
          logger.error('[Inngest] Supabase update error in onFailure hook', updateError, {
            documentId,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
          })
          throw updateError
        }

        logger.info('[Inngest] Document status updated to failed via onFailure', {
          documentId,
          updatedRows: data?.length || 0,
        })
      } catch (updateError) {
        logger.error('[Inngest] Failed to update document status in onFailure', updateError, {
          documentId,
          errorType: updateError instanceof Error ? updateError.name : 'Unknown',
          errorMessage: updateError instanceof Error ? updateError.message : String(updateError),
        })
        // Don't throw - we don't want onFailure hook itself to fail
      }
    },
  },
  { event: 'document/process' },
  async ({ event, step }) => {
    const { documentId, userId, fileName, fileType, fileSize, storagePath } = event.data

    logger.info('[Inngest] Starting PDF processing', {
      documentId,
      userId,
      fileName,
      fileSize,
    })

    try {
      // Step 1: Update status to processing
    await step.run('update-status-processing', async () => {
      const supabase = await createClient()
      await supabase
        .from('documents')
        .update({
          processing_status: 'processing',
          metadata: {
            processing_started_at: new Date().toISOString(),
            processing_method: 'async-inngest',
          },
        })
        .eq('id', documentId)

      logger.info('[Inngest] Status updated to processing', { documentId })
    })

    // Step 2: Extract text from PDF (download + extract + save in single step to avoid size limits)
    // CRITICAL: Don't return large text (causes "output_too_large" error), save directly to DB
    const extractionResult = await step.run(
      'extract-pdf-text',
      async () => {
        try {
          logger.info('[Inngest] Downloading and extracting PDF', { documentId })

          // Download file from storage
          const supabase = await createClient()
          const { data: fileBlob, error: downloadError} = await supabase
            .storage
            .from('documents')
            .download(storagePath)

          if (downloadError || !fileBlob) {
            throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`)
          }

          logger.info('[Inngest] File downloaded', {
            documentId,
            size: fileBlob.size,
          })

          // Convert Blob to ArrayBuffer for pdf-parse
          const arrayBuffer = await fileBlob.arrayBuffer()
          const file = new File([arrayBuffer], fileName, { type: fileType })

          logger.info('[Inngest] File object created, starting pdf-parse extraction', {
            documentId,
            fileSize: file.size,
          })

          // Extract text using pdf-parse
          const { parseServerPDF } = await import('@/lib/server-pdf-parser')
          const result = await parseServerPDF(file)

          if (!result.error && result.text && result.text.length > 100) {
            logger.info('[Inngest] PDF extraction successful, saving to database...', {
              documentId,
              textLength: result.text.length,
              pageCount: result.pageCount,
              hasPageData: !!result.pages,
              pagesCount: result.pages?.length || 0,
              method: result.method || 'pdf-parse',
            })

            // Save extracted text directly to database (avoids "output_too_large" error)
            const { error: saveError } = await supabase
              .from('documents')
              .update({
                extracted_text: result.text,
                metadata: {
                  processing_method: result.method || 'pdf-parse',
                  text_length: result.text.length,
                  page_count: result.pageCount,
                  pages: result.pages,
                  text_saved_at: new Date().toISOString(),
                },
              })
              .eq('id', documentId)

            if (saveError) {
              logger.error('[Inngest] Failed to save extracted text', saveError, { documentId })
              throw new Error(`Failed to save extracted text: ${saveError.message}`)
            }

            logger.info('[Inngest] Text saved to database', { documentId, textLength: result.text.length })

            // Return only metadata (not the text itself)
            return {
              success: true,
              textLength: result.text.length,
              method: result.method || 'pdf-parse',
              pageCount: result.pageCount,
              pagesCount: result.pages?.length || 0,
            }
          }

          logger.warn('[Inngest] PDF extraction failed or insufficient text', {
            documentId,
            error: result.error,
            textLength: result.text?.length || 0,
            method: result.method || 'pdf-parse',
          })
          return {
            success: false,
            error: result.error,
            method: result.method || 'pdf-parse',
          }
        } catch (error) {
          logger.error('[Inngest] PDF extraction error', error, { documentId })
          return {
            success: false,
            error: String(error),
            method: 'pdf-parse',
          }
        }
      },
      // CRITICAL: Set 20-minute timeout for download + extraction (very large/complex PDFs need more time)
      { timeout: '20m' }
    )

    let extractionSuccess = extractionResult.success
    let processingMethod = extractionResult.method || 'pdf-parse'
    let pageCount: number | undefined = extractionResult.pageCount
    let textLength: number = extractionResult.textLength || 0

    // Step 3: Index extracted text into ChromaDB for RAG (if extraction successful)
    // Fetch text from database for RAG indexing
    let ragChunks = 0
    if (extractionSuccess && textLength > 100) {
      const ragResult = await step.run(
        'rag-index',
        async () => {
          try {
            // Fetch extracted text from database
            const supabase = await createClient()
            const { data: doc, error: fetchError } = await supabase
              .from('documents')
              .select('extracted_text')
              .eq('id', documentId)
              .single()

            if (fetchError || !doc?.extracted_text) {
              throw new Error(`Failed to fetch extracted text: ${fetchError?.message || 'No text found'}`)
            }

            logger.info('[Inngest] Starting RAG indexing', {
              documentId,
              textLength: doc.extracted_text.length,
            })

            const { indexDocument } = await import('@/lib/vector-store')

            const result = await indexDocument(documentId, doc.extracted_text, {
              fileName,
              fileType,
              userId,
            })

            logger.info('[Inngest] RAG indexing completed', {
              documentId,
              chunks: result.chunks,
            })

            return { success: true, chunks: result.chunks }
          } catch (error) {
            // RAG indexing is optional - don't fail the whole job if it fails
            logger.error('[Inngest] RAG indexing failed (non-fatal)', error, { documentId })
            return { success: false, chunks: 0, error: String(error) }
          }
        },
        // Set 15-minute timeout for RAG indexing (large documents can take significant time)
        { timeout: '15m' }
      )

      ragChunks = ragResult.chunks
    }

    // Step 4: Update document with results
    await step.run('update-results', async () => {
      const supabase = await createClient()

      if (extractionSuccess && textLength > 100) {
        // Success - text extracted and indexed (text already saved in Step 2)
        const { data, error: updateError } = await supabase
          .from('documents')
          .update({
            processing_status: 'completed',
            rag_indexed_at: ragChunks > 0 ? new Date().toISOString() : null,
            rag_chunk_count: ragChunks,
            rag_collection_name: ragChunks > 0 ? `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}` : null,
            metadata: {
              processing_completed_at: new Date().toISOString(),
              processing_method: processingMethod,
              text_length: textLength,
              rag_indexed: ragChunks > 0,
              rag_chunk_count: ragChunks,
              page_count: pageCount,
            },
          })
          .eq('id', documentId)
          .select()

        if (updateError) {
          logger.error('[Inngest] CRITICAL: Failed to update document to completed status', updateError, {
            documentId,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
          })
          throw new Error(`Failed to update document status: ${updateError.message}`)
        }

        logger.info('[Inngest] Processing completed successfully', {
          documentId,
          method: processingMethod,
          textLength,
          ragChunks,
          pageCount,
          updatedRows: data?.length || 0,
        })
      } else {
        // No text extracted - likely scanned PDF
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            processing_status: 'needs_ocr',
            metadata: {
              processing_completed_at: new Date().toISOString(),
              processing_method: 'failed',
              requires_ocr: true,
              message:
                'No text could be extracted. This appears to be a scanned PDF. AI-powered OCR is available.',
            },
          })
          .eq('id', documentId)

        if (updateError) {
          logger.error('[Inngest] Failed to update document to needs_ocr status', updateError, {
            documentId,
          })
          throw new Error(`Failed to update document status: ${updateError.message}`)
        }

        logger.warn('[Inngest] No text extracted - flagged for OCR', { documentId })
      }
    })

      return {
        success: extractionSuccess,
        documentId,
        method: processingMethod,
        textLength,
        requiresOCR: !extractionSuccess,
        ragChunks,
        ragIndexed: ragChunks > 0,
      }
    } catch (error) {
      // CRITICAL: If ANY error occurs, update document status to "failed"
      // This prevents documents from getting stuck in "processing" status
      logger.error('[Inngest] PDF processing failed with error', error, { documentId })

      try {
        const supabase = await createClient()

        logger.info('[Inngest] Attempting to update document status to failed (main catch)', { documentId })

        const { data, error: updateError } = await supabase
          .from('documents')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            metadata: {
              processing_failed_at: new Date().toISOString(),
              error_details: error instanceof Error ? error.stack : String(error),
              failed_via: 'main_catch',
            },
          })
          .eq('id', documentId)
          .select()

        if (updateError) {
          logger.error('[Inngest] Supabase update error in main catch', updateError, {
            documentId,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
          })
          throw updateError
        }

        logger.info('[Inngest] Document status updated to failed (main catch)', {
          documentId,
          updatedRows: data?.length || 0,
        })
      } catch (updateError) {
        logger.error('[Inngest] Failed to update document status', updateError, {
          documentId,
          errorType: updateError instanceof Error ? updateError.name : 'Unknown',
          errorMessage: updateError instanceof Error ? updateError.message : String(updateError),
        })
      }

      // Re-throw the error so Inngest can track it and trigger onFailure hook
      throw error
    }
  }
)
