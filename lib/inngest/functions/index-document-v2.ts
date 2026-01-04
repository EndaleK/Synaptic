/**
 * Inngest V2 Document Indexing Functions
 *
 * Split worker architecture for large document processing:
 * 1. Coordinator (30s) - Calculates chunks, dispatches jobs
 * 2. Priority Indexer (3 min) - Indexes first 20% for immediate chat
 * 3. Batch Indexer (4 min each) - Processes remaining in batches of 200
 *
 * Benefits:
 * - No timeout issues (each job fits within Vercel limits)
 * - Progressive indexing (chat available after priority chunks)
 * - Parallel batch processing for speed
 * - Automatic retries on failure
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { generateEmbeddingsParallel, type ProgressInfo } from '@/lib/parallel-embeddings'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Pinecone } from '@pinecone-database/pinecone'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHUNK_SIZE = 2000
const CHUNK_OVERLAP = 400
const PRIORITY_PERCENTAGE = 0.20  // First 20% for immediate chat
const BATCH_SIZE = 200           // Chunks per batch job
const EMBEDDING_BATCH_SIZE = 100 // Chunks per embedding API call
const PINECONE_BATCH_SIZE = 100  // Vectors per Pinecone upsert

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChunkMetadata {
  documentId: string
  chunkIndex: number
  totalChunks: number
  text: string
}

interface IndexingProgress {
  phase: 'coordinating' | 'priority' | 'batching' | 'completed' | 'failed'
  priorityComplete: boolean
  batchesTotal: number
  batchesCompleted: number
  chunksTotal: number
  chunksIndexed: number
  percentComplete: number
  estimatedTimeRemaining?: number
}

// ============================================================================
// HELPER: Get Pinecone client
// ============================================================================

function getPineconeClient(): Pinecone | null {
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    logger.warn('[IndexV2] Pinecone API key not configured')
    return null
  }
  return new Pinecone({ apiKey })
}

function getIndexName(): string {
  return process.env.PINECONE_INDEX || 'flashcard-documents'
}

// ============================================================================
// HELPER: Update document progress in database
// ============================================================================

async function updateDocumentProgress(
  documentId: string,
  progress: IndexingProgress,
  additionalFields: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('documents')
    .update({
      rag_indexing_status: progress.phase,
      rag_indexed_chunks: progress.chunksIndexed,
      rag_total_chunks: progress.chunksTotal,
      rag_priority_chunks_indexed: progress.priorityComplete,
      processing_progress: {
        phase: progress.phase,
        priority_complete: progress.priorityComplete,
        batches_total: progress.batchesTotal,
        batches_completed: progress.batchesCompleted,
        chunks_total: progress.chunksTotal,
        chunks_indexed: progress.chunksIndexed,
        percent_complete: progress.percentComplete,
        estimated_time_remaining: progress.estimatedTimeRemaining,
        updated_at: new Date().toISOString(),
      },
      ...additionalFields,
    })
    .eq('id', documentId)
}

// ============================================================================
// 1. COORDINATOR FUNCTION (30s)
// Calculates chunks and dispatches priority + batch indexing jobs
// ============================================================================

export const coordinateIndexing = inngest.createFunction(
  {
    id: 'coordinate-indexing-v2',
    name: 'Coordinate Document Indexing V2',
    retries: 2,
    maxDuration: 30, // 30 seconds - just coordination
  },
  { event: 'document/index-v2' },
  async ({ event, step }) => {
    const { documentId, userId, text } = event.data

    logger.info('[CoordinateV2] Starting indexing coordination', {
      documentId,
      userId,
      textLength: text.length,
    })

    // Step 1: Split text into chunks
    const chunks = await step.run('split-into-chunks', async () => {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      })

      const docs = await splitter.createDocuments([text])
      return docs.map((doc, idx) => ({
        text: doc.pageContent,
        index: idx,
      }))
    })

    const totalChunks = chunks.length
    const priorityCount = Math.min(
      Math.ceil(totalChunks * PRIORITY_PERCENTAGE),
      100  // Cap priority chunks at 100 for fast initial indexing
    )
    const remainingChunks = totalChunks - priorityCount

    logger.info('[CoordinateV2] Chunks calculated', {
      documentId,
      totalChunks,
      priorityCount,
      remainingChunks,
    })

    // Step 2: Update document with initial progress
    await step.run('update-initial-progress', async () => {
      await updateDocumentProgress(documentId, {
        phase: 'coordinating',
        priorityComplete: false,
        batchesTotal: Math.ceil(remainingChunks / BATCH_SIZE),
        batchesCompleted: 0,
        chunksTotal: totalChunks,
        chunksIndexed: 0,
        percentComplete: 0,
      })
    })

    // Step 3: Dispatch priority indexing job
    await step.run('dispatch-priority-job', async () => {
      const priorityChunks = chunks.slice(0, priorityCount)

      await inngest.send({
        name: 'document/index-priority',
        data: {
          documentId,
          userId,
          chunks: priorityChunks,
          totalChunks,
          priorityCount,
        },
      })

      logger.info('[CoordinateV2] Dispatched priority indexing job', {
        documentId,
        priorityChunks: priorityChunks.length,
      })
    })

    // Step 4: Dispatch batch indexing jobs for remaining chunks
    await step.run('dispatch-batch-jobs', async () => {
      const remainingChunksList = chunks.slice(priorityCount)
      const batches: { startIndex: number; chunks: typeof chunks }[] = []

      for (let i = 0; i < remainingChunksList.length; i += BATCH_SIZE) {
        batches.push({
          startIndex: priorityCount + i,
          chunks: remainingChunksList.slice(i, i + BATCH_SIZE),
        })
      }

      // Dispatch all batch jobs at once (they'll run after priority completes)
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        await inngest.send({
          name: 'document/index-batch',
          data: {
            documentId,
            userId,
            batchIndex,
            totalBatches: batches.length,
            chunks: batch.chunks,
            startIndex: batch.startIndex,
            totalChunks,
            priorityCount,
          },
        })
      }

      logger.info('[CoordinateV2] Dispatched batch indexing jobs', {
        documentId,
        batchCount: batches.length,
      })
    })

    return {
      success: true,
      documentId,
      totalChunks,
      priorityCount,
      batchCount: Math.ceil(remainingChunks / BATCH_SIZE),
    }
  }
)

// ============================================================================
// 2. PRIORITY INDEXER (3 min)
// Indexes first 20% for immediate chat availability
// ============================================================================

export const indexPriorityChunks = inngest.createFunction(
  {
    id: 'index-priority-chunks-v2',
    name: 'Index Priority Chunks V2',
    retries: 3,
    maxDuration: 180, // 3 minutes
  },
  { event: 'document/index-priority' },
  async ({ event, step }) => {
    const { documentId, userId, chunks, totalChunks, priorityCount } = event.data

    logger.info('[PriorityV2] Starting priority chunk indexing', {
      documentId,
      chunkCount: chunks.length,
    })

    // Step 1: Update status to priority indexing
    await step.run('update-status', async () => {
      await updateDocumentProgress(documentId, {
        phase: 'priority',
        priorityComplete: false,
        batchesTotal: Math.ceil((totalChunks - priorityCount) / BATCH_SIZE),
        batchesCompleted: 0,
        chunksTotal: totalChunks,
        chunksIndexed: 0,
        percentComplete: 5,
      })
    })

    // Step 2: Generate embeddings for priority chunks
    const embeddings = await step.run('generate-priority-embeddings', async () => {
      const texts = chunks.map((c: { text: string }) => c.text)

      const result = await generateEmbeddingsParallel(texts, {
        batchSize: EMBEDDING_BATCH_SIZE,
        concurrency: 5,
        maxRetries: 3,
      })

      if (result.failedBatches.length > 0) {
        logger.warn('[PriorityV2] Some embedding batches failed', {
          documentId,
          failedBatches: result.failedBatches,
        })
      }

      return result.embeddings
    })

    // Step 3: Upsert to Pinecone
    await step.run('upsert-priority-vectors', async () => {
      const pinecone = getPineconeClient()
      if (!pinecone) {
        throw new Error('Pinecone not configured')
      }

      const index = pinecone.index(getIndexName())
      const namespace = index.namespace(documentId)

      // Prepare vectors with metadata
      const vectors = chunks.map((chunk: { text: string; index: number }, idx: number) => ({
        id: `${documentId}-chunk-${chunk.index}`,
        values: embeddings[idx],
        metadata: {
          documentId,
          chunkIndex: chunk.index,
          text: chunk.text.slice(0, 8000), // Pinecone metadata limit
          userId,
          isPriority: true,
        },
      }))

      // Upsert in batches
      for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
        const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE)
        await namespace.upsert(batch)
      }

      logger.info('[PriorityV2] Priority vectors upserted', {
        documentId,
        vectorCount: vectors.length,
      })
    })

    // Step 4: Mark priority indexing complete
    await step.run('mark-priority-complete', async () => {
      const supabase = await createClient()

      await supabase
        .from('documents')
        .update({
          rag_priority_chunks_indexed: true,
          rag_indexed_chunks: chunks.length,
          rag_indexing_status: 'priority_complete',
          processing_progress: {
            phase: 'priority_complete',
            priority_complete: true,
            batches_total: Math.ceil((totalChunks - priorityCount) / BATCH_SIZE),
            batches_completed: 0,
            chunks_total: totalChunks,
            chunks_indexed: chunks.length,
            percent_complete: Math.round((chunks.length / totalChunks) * 100),
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', documentId)

      logger.info('[PriorityV2] Priority indexing complete - chat now available!', {
        documentId,
        indexedChunks: chunks.length,
      })
    })

    return {
      success: true,
      documentId,
      indexedChunks: chunks.length,
      priorityComplete: true,
    }
  }
)

// ============================================================================
// 3. BATCH INDEXER (4 min each)
// Processes remaining chunks in batches
// ============================================================================

export const indexBatch = inngest.createFunction(
  {
    id: 'index-batch-v2',
    name: 'Index Batch V2',
    retries: 3,
    maxDuration: 240, // 4 minutes
    concurrency: {
      limit: 3, // Process up to 3 batches concurrently
    },
  },
  { event: 'document/index-batch' },
  async ({ event, step }) => {
    const {
      documentId,
      userId,
      batchIndex,
      totalBatches,
      chunks,
      startIndex,
      totalChunks,
      priorityCount,
    } = event.data

    logger.info('[BatchV2] Starting batch indexing', {
      documentId,
      batchIndex,
      totalBatches,
      chunkCount: chunks.length,
      startIndex,
    })

    // Step 1: Generate embeddings for batch
    const embeddings = await step.run('generate-batch-embeddings', async () => {
      const texts = chunks.map((c: { text: string }) => c.text)

      const result = await generateEmbeddingsParallel(texts, {
        batchSize: EMBEDDING_BATCH_SIZE,
        concurrency: 5,
        maxRetries: 3,
      })

      if (result.failedBatches.length > 0) {
        logger.warn('[BatchV2] Some embedding batches failed', {
          documentId,
          batchIndex,
          failedBatches: result.failedBatches,
        })
      }

      return result.embeddings
    })

    // Step 2: Upsert to Pinecone
    await step.run('upsert-batch-vectors', async () => {
      const pinecone = getPineconeClient()
      if (!pinecone) {
        throw new Error('Pinecone not configured')
      }

      const index = pinecone.index(getIndexName())
      const namespace = index.namespace(documentId)

      // Prepare vectors with metadata
      const vectors = chunks.map((chunk: { text: string; index: number }, idx: number) => ({
        id: `${documentId}-chunk-${chunk.index}`,
        values: embeddings[idx],
        metadata: {
          documentId,
          chunkIndex: chunk.index,
          text: chunk.text.slice(0, 8000),
          userId,
          isPriority: false,
        },
      }))

      // Upsert in batches
      for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
        const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE)
        await namespace.upsert(batch)
      }

      logger.info('[BatchV2] Batch vectors upserted', {
        documentId,
        batchIndex,
        vectorCount: vectors.length,
      })
    })

    // Step 3: Update progress
    await step.run('update-batch-progress', async () => {
      const supabase = await createClient()

      // Get current progress to calculate new values
      const { data: doc } = await supabase
        .from('documents')
        .select('rag_indexed_chunks')
        .eq('id', documentId)
        .single()

      const currentIndexed = doc?.rag_indexed_chunks || priorityCount
      const newIndexed = currentIndexed + chunks.length
      const completedBatches = batchIndex + 1
      const isFullyComplete = completedBatches === totalBatches

      await supabase
        .from('documents')
        .update({
          rag_indexed_chunks: newIndexed,
          rag_indexing_status: isFullyComplete ? 'completed' : 'full_indexing',
          processing_status: isFullyComplete ? 'completed' : 'processing',
          rag_indexed_at: isFullyComplete ? new Date().toISOString() : null,
          processing_progress: {
            phase: isFullyComplete ? 'completed' : 'batching',
            priority_complete: true,
            batches_total: totalBatches,
            batches_completed: completedBatches,
            chunks_total: totalChunks,
            chunks_indexed: newIndexed,
            percent_complete: Math.round((newIndexed / totalChunks) * 100),
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', documentId)

      logger.info('[BatchV2] Batch progress updated', {
        documentId,
        batchIndex,
        completedBatches,
        totalBatches,
        chunksIndexed: newIndexed,
        isFullyComplete,
      })
    })

    return {
      success: true,
      documentId,
      batchIndex,
      indexedChunks: chunks.length,
    }
  }
)

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const indexDocumentV2Functions = [
  coordinateIndexing,
  indexPriorityChunks,
  indexBatch,
]
