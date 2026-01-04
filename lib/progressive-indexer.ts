/**
 * Progressive Document Indexer
 *
 * Enables chat access before full indexing completes by:
 * 1. Identifying priority chunks (first 20% = intro, TOC, early chapters)
 * 2. Fast-indexing priority chunks for immediate chat
 * 3. Continuing background indexing for remaining chunks
 *
 * Benefits:
 * - Users can chat with 1000+ page documents in ~1-2 minutes
 * - Full indexing continues in background
 * - No timeout issues (split across multiple workers)
 */

import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/logger'
import type { RAGIndexingStatus } from '@/lib/supabase/types'

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRIORITY_PERCENTAGE = 0.20  // First 20% of chunks
const MAX_PRIORITY_CHUNKS = 100   // Cap for fast initial indexing
const MIN_CHUNKS_FOR_SPLIT = 50   // Below this, use single-pass indexing

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressiveIndexingStatus {
  phase: RAGIndexingStatus
  priorityComplete: boolean
  chunksIndexed: number
  chunksTotal: number
  percentComplete: number
  estimatedTimeRemaining?: number  // seconds
  canChat: boolean
}

export interface StartIndexingResult {
  success: boolean
  documentId: string
  useProgressiveIndexing: boolean
  estimatedTime?: number  // seconds
  error?: string
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Start progressive indexing for a document
 *
 * @param documentId - UUID of the document
 * @param userId - Clerk user ID
 * @param text - Full extracted text
 * @returns Result with status and estimated time
 */
export async function startProgressiveIndexing(
  documentId: string,
  userId: string,
  text: string
): Promise<StartIndexingResult> {
  try {
    // Estimate chunk count (roughly 1 chunk per 2000 chars)
    const estimatedChunks = Math.ceil(text.length / 2000)

    logger.info('[ProgressiveIndexer] Starting progressive indexing', {
      documentId,
      textLength: text.length,
      estimatedChunks,
    })

    // For small documents, use standard indexing
    if (estimatedChunks < MIN_CHUNKS_FOR_SPLIT) {
      logger.info('[ProgressiveIndexer] Using single-pass indexing (small doc)', {
        documentId,
        estimatedChunks,
      })

      // Dispatch standard RAG indexing
      await inngest.send({
        name: 'document/rag-index',
        data: { documentId, userId, text },
      })

      return {
        success: true,
        documentId,
        useProgressiveIndexing: false,
        estimatedTime: Math.ceil(estimatedChunks * 0.5), // ~0.5s per chunk
      }
    }

    // For large documents, use V2 split workers
    await inngest.send({
      name: 'document/index-v2',
      data: { documentId, userId, text },
    })

    // Estimate time: priority chunks ~1-2 min, full indexing continues in background
    const priorityChunks = Math.min(
      Math.ceil(estimatedChunks * PRIORITY_PERCENTAGE),
      MAX_PRIORITY_CHUNKS
    )
    const priorityTime = Math.ceil(priorityChunks * 0.5)  // ~0.5s per chunk
    const fullTime = Math.ceil(estimatedChunks * 0.3)     // Faster with parallel processing

    logger.info('[ProgressiveIndexer] V2 indexing dispatched', {
      documentId,
      estimatedChunks,
      priorityChunks,
      priorityTime,
      fullTime,
    })

    return {
      success: true,
      documentId,
      useProgressiveIndexing: true,
      estimatedTime: priorityTime,  // Time until chat is available
    }
  } catch (error) {
    logger.error('[ProgressiveIndexer] Failed to start indexing', error, {
      documentId,
    })

    return {
      success: false,
      documentId,
      useProgressiveIndexing: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get current indexing status for a document
 */
export async function getIndexingStatus(
  documentId: string
): Promise<ProgressiveIndexingStatus | null> {
  try {
    const supabase = await createClient()

    const { data: doc, error } = await supabase
      .from('documents')
      .select(`
        rag_indexing_status,
        rag_priority_chunks_indexed,
        rag_indexed_chunks,
        rag_total_chunks,
        rag_indexed,
        processing_progress
      `)
      .eq('id', documentId)
      .single()

    if (error || !doc) {
      return null
    }

    const phase = (doc.rag_indexing_status || 'not_started') as RAGIndexingStatus
    const priorityComplete = doc.rag_priority_chunks_indexed || false
    const chunksIndexed = doc.rag_indexed_chunks || 0
    const chunksTotal = doc.rag_total_chunks || 0

    // Calculate progress
    const percentComplete = chunksTotal > 0
      ? Math.round((chunksIndexed / chunksTotal) * 100)
      : 0

    // Estimate time remaining (based on ~0.3s per chunk with parallel processing)
    const remainingChunks = chunksTotal - chunksIndexed
    const estimatedTimeRemaining = remainingChunks > 0
      ? Math.ceil(remainingChunks * 0.3)
      : 0

    // User can chat if priority chunks are indexed
    const canChat = priorityComplete || phase === 'completed' || doc.rag_indexed === true

    return {
      phase,
      priorityComplete,
      chunksIndexed,
      chunksTotal,
      percentComplete,
      estimatedTimeRemaining,
      canChat,
    }
  } catch (error) {
    logger.error('[ProgressiveIndexer] Failed to get status', error, { documentId })
    return null
  }
}

/**
 * Check if a document is ready for chat (priority chunks indexed)
 */
export async function isReadyForChat(documentId: string): Promise<boolean> {
  const status = await getIndexingStatus(documentId)
  return status?.canChat || false
}

/**
 * Get documents currently being indexed for a user
 */
export async function getIndexingDocuments(userId: string): Promise<Array<{
  documentId: string
  fileName: string
  status: ProgressiveIndexingStatus
}>> {
  try {
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return []
    }

    // Get documents in indexing states
    const { data: docs, error } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        rag_indexing_status,
        rag_priority_chunks_indexed,
        rag_indexed_chunks,
        rag_total_chunks,
        rag_indexed
      `)
      .eq('user_id', profile.id)
      .in('rag_indexing_status', ['priority_indexing', 'priority_complete', 'full_indexing'])
      .order('updated_at', { ascending: false })

    if (error || !docs) {
      return []
    }

    return docs.map(doc => ({
      documentId: doc.id,
      fileName: doc.file_name,
      status: {
        phase: (doc.rag_indexing_status || 'not_started') as RAGIndexingStatus,
        priorityComplete: doc.rag_priority_chunks_indexed || false,
        chunksIndexed: doc.rag_indexed_chunks || 0,
        chunksTotal: doc.rag_total_chunks || 0,
        percentComplete: doc.rag_total_chunks
          ? Math.round((doc.rag_indexed_chunks || 0) / doc.rag_total_chunks * 100)
          : 0,
        canChat: doc.rag_priority_chunks_indexed || doc.rag_indexed,
      },
    }))
  } catch (error) {
    logger.error('[ProgressiveIndexer] Failed to get indexing docs', error, { userId })
    return []
  }
}

/**
 * Retry failed indexing for a document
 */
export async function retryIndexing(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get document text
    const { data: doc, error } = await supabase
      .from('documents')
      .select('extracted_text, rag_indexing_status')
      .eq('id', documentId)
      .single()

    if (error || !doc) {
      return { success: false, error: 'Document not found' }
    }

    if (doc.rag_indexing_status !== 'failed') {
      return { success: false, error: 'Document is not in failed state' }
    }

    if (!doc.extracted_text) {
      return { success: false, error: 'No extracted text found' }
    }

    // Reset status and restart
    await supabase
      .from('documents')
      .update({
        rag_indexing_status: 'not_started',
        rag_indexed_chunks: 0,
        rag_priority_chunks_indexed: false,
        rag_indexing_error: null,
      })
      .eq('id', documentId)

    // Start progressive indexing
    const result = await startProgressiveIndexing(documentId, userId, doc.extracted_text)

    return { success: result.success, error: result.error }
  } catch (error) {
    logger.error('[ProgressiveIndexer] Failed to retry indexing', error, { documentId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
