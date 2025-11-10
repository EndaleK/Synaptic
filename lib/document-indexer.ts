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

    // 3. Check if we already have extracted text
    let text = document.extracted_text

    // 4. If no extracted text, download and extract from storage
    if (!text || text.trim().length === 0) {
      logger.info('No extracted text found, downloading from storage', { documentId })

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download document: ${downloadError?.message || 'Unknown error'}`)
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

      logger.info('Text extraction successful', {
        documentId,
        textLength: text.length,
      })
    } else {
      logger.info('Using existing extracted text', {
        documentId,
        textLength: text.length,
      })
    }

    // 5. Validate text content
    if (!text || text.trim().length < 100) {
      throw new Error('Insufficient text content for indexing (minimum 100 characters)')
    }

    // 6. Index document in vector store
    logger.info('Starting vector indexing', { documentId })

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

  const result = await mammoth.extractRawText({
    arrayBuffer,
  })

  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX text extraction returned empty content')
  }

  return result.value
}
