/**
 * Document Indexing Helper for RAG
 *
 * Handles on-demand indexing of large documents for vector search.
 * Downloads document from storage, extracts text, and indexes into ChromaDB.
 */

import { createClient } from '@/lib/supabase/server'
import { indexDocument } from '@/lib/vector-store'
import { logger } from '@/lib/logger'

export interface IndexingResult {
  success: boolean
  chunks: number
  error?: string
}

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
