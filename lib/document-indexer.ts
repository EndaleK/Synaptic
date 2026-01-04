/**
 * Document Indexing Helper for RAG
 *
 * Handles on-demand indexing of large documents for vector search.
 * Downloads document from storage, extracts text, and indexes into ChromaDB.
 *
 * V2 Split Workers:
 * - For large documents, uses Inngest V2 workers to avoid timeouts
 * - Coordinator (30s) → Priority (3 min) → Batch workers (4 min each)
 * - Chat available after priority chunks indexed (~20% of document)
 */

import { createClient } from '@/lib/supabase/server'
import { indexDocument } from '@/lib/vector-store'
import { logger } from '@/lib/logger'
import { inngest } from '@/lib/inngest/client'

export interface IndexingResult {
  success: boolean
  chunks: number
  error?: string
  /** True if V2 background indexing was dispatched (progressive) */
  dispatchedV2?: boolean
}

/** Threshold for using V2 split workers (characters) - 100K chars ~ 25K tokens */
const V2_INDEXING_THRESHOLD = 100_000

/**
 * RAG strategy type for document processing
 */
export type RAGStrategy = 'chromadb' | 'gemini'

/**
 * Get the character threshold for using Gemini RAG
 * Documents above this threshold will use Gemini's 2M token context window
 * Documents below will use ChromaDB vector search for cost optimization
 *
 * @returns Character count threshold (default: 500,000 chars ~= 500KB)
 */
export function getGeminiThreshold(): number {
  const threshold = process.env.GEMINI_THRESHOLD_CHARS
  return threshold ? parseInt(threshold, 10) : 500_000
}

/**
 * Determine if a document should use Gemini RAG based on its size
 *
 * @param textLength - Number of characters in the document
 * @returns true if document should use Gemini, false for ChromaDB
 */
export function shouldUseGemini(textLength: number): boolean {
  // Check if Gemini API key is configured
  const hasGeminiKey = !!process.env.GEMINI_API_KEY
  if (!hasGeminiKey) {
    return false // Fall back to ChromaDB if Gemini not configured
  }

  const threshold = getGeminiThreshold()
  return textLength >= threshold
}

/**
 * Determine RAG strategy for a document based on its text content
 *
 * @param text - Extracted document text
 * @returns 'gemini' for large docs, 'chromadb' for smaller docs
 */
export function determineRAGStrategy(text: string): RAGStrategy {
  return shouldUseGemini(text.length) ? 'gemini' : 'chromadb'
}

/**
 * Index a document for RAG by downloading from storage and extracting text
 *
 * @param documentId - UUID of the document to index
 * @param userId - Clerk user ID for authentication
 * @returns Indexing result with chunk count or error
 */
export async function indexDocumentForRAG(
  documentId: string,
  userId: string
): Promise<IndexingResult> {
  try {
    const supabase = await createClient()

    // 1. Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // 2. Get document metadata
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or unauthorized')
    }

    logger.info('Starting document indexing', {
      userId,
      documentId,
      fileName: document.file_name,
      fileType: document.file_type,
    })

    // 3. ALWAYS download and extract fresh text from storage for RAG indexing
    // The database may have truncated text (50K limit), but RAG needs the FULL document
    // This ensures large documents like Toronto Notes get fully indexed
    let text: string = ''

    // Check if we need fresh extraction (file size > threshold or text appears truncated)
    const dbTextLength = document.extracted_text?.length || 0
    const fileSizeBytes = document.file_size || 0
    const estimatedCharsPerByte = 0.5 // Rough estimate: 1 byte ≈ 0.5 chars after extraction
    const estimatedFullTextLength = fileSizeBytes * estimatedCharsPerByte
    const isLikelyTruncated = dbTextLength > 0 && dbTextLength < estimatedFullTextLength * 0.5

    // For large files (>1MB), always re-extract from storage to ensure full text
    const shouldReExtract = fileSizeBytes > 1 * 1024 * 1024 || isLikelyTruncated

    if (shouldReExtract || !document.extracted_text || document.extracted_text.trim().length === 0) {
      logger.info('Downloading fresh text from storage for RAG indexing', {
        documentId,
        reason: !document.extracted_text ? 'no_db_text' :
                isLikelyTruncated ? 'likely_truncated' : 'large_file',
        dbTextLength,
        fileSizeBytes
      })

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download document: ${downloadError?.message || 'Unknown error'}`)
      }

      // Check file size - allow PDFs up to 100MB for RAG re-extraction
      // Server-pdf-parser handles up to 500MB with PyMuPDF fallback
      const fileSizeMB = fileData.size / (1024 * 1024)
      if (document.file_type === 'application/pdf' && fileSizeMB > 100) {
        throw new Error(
          `This PDF is too large (${fileSizeMB.toFixed(1)}MB) for on-demand text extraction. ` +
          `The maximum supported size is 100MB. ` +
          `Please try re-uploading or splitting the document.`
        )
      }

      logger.info('Re-extracting PDF for RAG indexing', {
        documentId,
        fileSizeMB: fileSizeMB.toFixed(2),
      })

      // Extract text based on file type
      if (document.file_type === 'application/pdf') {
        text = await extractPDFText(fileData, document.file_name)
      } else if (
        document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        document.file_type === 'application/msword'
      ) {
        text = await extractDOCXText(fileData)
      } else if (document.file_type === 'text/plain') {
        text = await fileData.text()
      } else {
        throw new Error(`Unsupported file type: ${document.file_type}`)
      }

      logger.info('Text extraction successful', {
        documentId,
        textLength: text.length,
      })
    } else {
      // Small file with existing text - use cached DB text
      text = document.extracted_text!
      logger.info('Using existing extracted text (small file)', {
        documentId,
        textLength: text.length,
      })
    }

    // 5. Validate text content
    if (!text || text.trim().length < 100) {
      throw new Error('Insufficient text content for indexing (minimum 100 characters)')
    }

    // 6. Determine RAG strategy based on document size
    const ragStrategy = determineRAGStrategy(text)
    logger.info('RAG strategy determined', {
      documentId,
      strategy: ragStrategy,
      textLength: text.length,
      threshold: getGeminiThreshold(),
    })

    // 7. For Gemini documents, skip vector indexing (uses full context directly)
    if (ragStrategy === 'gemini') {
      logger.info('Skipping vector indexing for Gemini-eligible document', { documentId })
      return {
        success: true,
        chunks: 0, // No chunks needed for Gemini
      }
    }

    // 8. For ChromaDB documents, index in vector store
    logger.info('Starting vector indexing for ChromaDB', { documentId })

    const result = await indexDocument(documentId, text, {
      fileName: document.file_name,
      fileType: document.file_type,
      userId: profile.id.toString(),
    })

    logger.info('Document indexed successfully', {
      documentId,
      chunks: result.chunks,
    })

    return {
      success: true,
      chunks: result.chunks,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Document indexing failed', error, {
      documentId,
      userId,
    })

    return {
      success: false,
      chunks: 0,
      error: errorMessage,
    }
  }
}

/**
 * Extract text from PDF file using server-side parser
 */
async function extractPDFText(fileData: Blob, fileName: string): Promise<string> {
  const { parseServerPDF } = await import('@/lib/server-pdf-parser')

  const file = new File([fileData], fileName, { type: 'application/pdf' })
  const parseResult = await parseServerPDF(file)

  if (parseResult.error || !parseResult.text) {
    throw new Error(parseResult.error || 'PDF text extraction failed')
  }

  return parseResult.text
}

/**
 * Extract text from DOCX file
 */
async function extractDOCXText(fileData: Blob): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await fileData.arrayBuffer()

  // Convert ArrayBuffer to Node.js Buffer for mammoth
  // mammoth uses {buffer} in Node.js, not {arrayBuffer} (which is browser-only)
  const buffer = Buffer.from(arrayBuffer)

  const result = await mammoth.extractRawText({
    buffer,
  })

  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX text extraction returned empty content')
  }

  return result.value
}

/**
 * Start V2 progressive indexing for a document
 *
 * This dispatches an Inngest event that triggers the V2 split worker pipeline:
 * 1. Coordinator (30s) - calculates chunks, dispatches jobs
 * 2. Priority Indexer (3 min) - indexes first 20% for immediate chat
 * 3. Batch Indexers (4 min each) - process remaining chunks
 *
 * Benefits:
 * - No timeout issues (each worker fits within Vercel limits)
 * - Progressive indexing (chat available after priority chunks)
 * - Parallel batch processing for speed
 *
 * @param documentId - UUID of the document to index
 * @param userId - Clerk user ID (for internal user_id lookup)
 * @returns Result with dispatchedV2=true if successfully queued
 */
export async function startV2Indexing(
  documentId: string,
  userId: string
): Promise<IndexingResult> {
  try {
    const supabase = await createClient()

    // 1. Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // 2. Get document metadata
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or unauthorized')
    }

    logger.info('[V2 Indexing] Starting progressive indexing', {
      userId,
      documentId,
      fileName: document.file_name,
      fileType: document.file_type,
    })

    // 3. Extract text from document (same logic as indexDocumentForRAG)
    let text: string = ''

    const dbTextLength = document.extracted_text?.length || 0
    const fileSizeBytes = document.file_size || 0
    const estimatedCharsPerByte = 0.5
    const estimatedFullTextLength = fileSizeBytes * estimatedCharsPerByte
    const isLikelyTruncated = dbTextLength > 0 && dbTextLength < estimatedFullTextLength * 0.5
    const shouldReExtract = fileSizeBytes > 1 * 1024 * 1024 || isLikelyTruncated

    if (shouldReExtract || !document.extracted_text || document.extracted_text.trim().length === 0) {
      logger.info('[V2 Indexing] Downloading fresh text from storage', {
        documentId,
        reason: !document.extracted_text ? 'no_db_text' :
                isLikelyTruncated ? 'likely_truncated' : 'large_file',
        dbTextLength,
        fileSizeBytes
      })

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download document: ${downloadError?.message || 'Unknown error'}`)
      }

      // Check file size limit
      const fileSizeMB = fileData.size / (1024 * 1024)
      if (document.file_type === 'application/pdf' && fileSizeMB > 100) {
        throw new Error(
          `This PDF is too large (${fileSizeMB.toFixed(1)}MB) for text extraction. ` +
          `Maximum supported size is 100MB.`
        )
      }

      // Extract text based on file type
      if (document.file_type === 'application/pdf') {
        text = await extractPDFText(fileData, document.file_name)
      } else if (
        document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        document.file_type === 'application/msword'
      ) {
        text = await extractDOCXText(fileData)
      } else if (document.file_type === 'text/plain') {
        text = await fileData.text()
      } else {
        throw new Error(`Unsupported file type: ${document.file_type}`)
      }

      logger.info('[V2 Indexing] Text extraction successful', {
        documentId,
        textLength: text.length,
      })
    } else {
      text = document.extracted_text!
      logger.info('[V2 Indexing] Using existing extracted text', {
        documentId,
        textLength: text.length,
      })
    }

    // 4. Validate text content
    if (!text || text.trim().length < 100) {
      throw new Error('Insufficient text content for indexing (minimum 100 characters)')
    }

    // 5. Update document status to show indexing has started
    await supabase
      .from('documents')
      .update({
        rag_indexing_status: 'priority_indexing',
        processing_status: 'processing',
        processing_progress: {
          phase: 'coordinating',
          priority_complete: false,
          percent_complete: 0,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', documentId)

    // 6. Dispatch V2 indexing event to Inngest
    try {
      await inngest.send({
        name: 'document/index-v2',
        data: {
          documentId,
          userId: profile.id.toString(),
          text,
        },
      })

      logger.info('[V2 Indexing] Dispatched to Inngest V2 workers', {
        documentId,
        textLength: text.length,
      })

      return {
        success: true,
        chunks: 0, // Will be calculated by coordinator
        dispatchedV2: true,
      }
    } catch (inngestError) {
      // Inngest failed (not configured, network issue, etc.)
      // Revert status to 'completed' so document isn't stuck
      logger.error('[V2 Indexing] Inngest dispatch failed, reverting to completed status', inngestError, {
        documentId,
      })

      await supabase
        .from('documents')
        .update({
          processing_status: 'completed',
          rag_indexing_status: null,
          processing_progress: null,
          metadata: {
            ...document?.metadata,
            inngest_failed: true,
            inngest_error: inngestError instanceof Error ? inngestError.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', documentId)

      // Return success=false but document is still usable (not stuck)
      return {
        success: false,
        chunks: 0,
        error: 'Background indexing unavailable. Document is still usable but RAG features may be limited.',
        dispatchedV2: false,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('[V2 Indexing] Failed to start progressive indexing', error, {
      documentId,
      userId,
    })

    // Also revert status on general errors
    try {
      await supabase
        .from('documents')
        .update({
          processing_status: 'completed',
          rag_indexing_status: null,
        })
        .eq('id', documentId)
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      chunks: 0,
      error: errorMessage,
    }
  }
}

/**
 * Determine if a document should use V2 split workers based on text length
 *
 * V2 workers are better for large documents because:
 * - No timeout issues (each worker fits within Vercel limits)
 * - Progressive indexing (chat available after 20% indexed)
 * - Parallel batch processing for speed
 *
 * @param textLength - Number of characters in the document
 * @returns true if document should use V2 workers
 */
export function shouldUseV2Indexing(textLength: number): boolean {
  return textLength >= V2_INDEXING_THRESHOLD
}
