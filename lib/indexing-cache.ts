/**
 * Indexing Cache with Upstash Redis
 *
 * Caches chunks and embeddings to:
 * 1. Enable instant retries (no re-processing)
 * 2. Resume interrupted indexing
 * 3. Avoid duplicate work across workers
 *
 * Cache Keys:
 * - chunks:{docId}:hash     → 24h (avoid re-chunking)
 * - emb:{docId}:{idx}       → 24h (avoid re-embedding)
 * - progress:{docId}        → 2h  (resume checkpoint)
 */

import { Redis } from '@upstash/redis'
import { logger } from './logger'
import crypto from 'crypto'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHUNK_CACHE_TTL = 24 * 60 * 60      // 24 hours in seconds
const EMBEDDING_CACHE_TTL = 24 * 60 * 60  // 24 hours in seconds
const PROGRESS_CACHE_TTL = 2 * 60 * 60    // 2 hours in seconds

// Max size for cached embeddings (to avoid Redis memory issues)
const MAX_CACHED_EMBEDDINGS = 1000

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    logger.info('[IndexingCache] Redis client initialized')
  }

  return redis
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// ============================================================================
// TYPES
// ============================================================================

export interface IndexingProgress {
  documentId: string
  phase: 'chunking' | 'embedding' | 'upserting' | 'completed' | 'failed'
  chunksTotal: number
  chunksProcessed: number
  embeddingsGenerated: number
  lastBatchIndex: number
  startedAt: string
  updatedAt: string
  error?: string
}

export interface CachedChunks {
  hash: string
  chunks: string[]
  createdAt: string
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Generate hash for text to detect changes
 */
function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}

// ============================================================================
// CHUNK CACHING
// ============================================================================

/**
 * Get cached chunks if text hasn't changed
 */
export async function getCachedChunks(documentId: string, textHash: string): Promise<string[] | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const key = `chunks:${documentId}:hash`
    const cached = await redis.get<CachedChunks>(key)

    if (cached && cached.hash === textHash) {
      logger.info('[IndexingCache] Cache hit for chunks', {
        documentId,
        chunkCount: cached.chunks.length,
      })
      return cached.chunks
    }

    return null
  } catch (error) {
    logger.error('[IndexingCache] Failed to get cached chunks', error, { documentId })
    return null
  }
}

/**
 * Cache chunks for future use
 */
export async function cacheChunks(
  documentId: string,
  textHash: string,
  chunks: string[]
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const key = `chunks:${documentId}:hash`
    const data: CachedChunks = {
      hash: textHash,
      chunks,
      createdAt: new Date().toISOString(),
    }

    await redis.set(key, data, { ex: CHUNK_CACHE_TTL })

    logger.info('[IndexingCache] Cached chunks', {
      documentId,
      chunkCount: chunks.length,
      ttl: CHUNK_CACHE_TTL,
    })
  } catch (error) {
    logger.error('[IndexingCache] Failed to cache chunks', error, { documentId })
  }
}

/**
 * Get text hash for cache validation
 */
export function getTextHash(text: string): string {
  return hashText(text)
}

// ============================================================================
// EMBEDDING CACHING
// ============================================================================

/**
 * Get cached embedding for a chunk
 */
export async function getCachedEmbedding(
  documentId: string,
  chunkIndex: number
): Promise<number[] | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const key = `emb:${documentId}:${chunkIndex}`
    const embedding = await redis.get<number[]>(key)
    return embedding
  } catch (error) {
    logger.error('[IndexingCache] Failed to get cached embedding', error, {
      documentId,
      chunkIndex,
    })
    return null
  }
}

/**
 * Get multiple cached embeddings at once
 */
export async function getCachedEmbeddings(
  documentId: string,
  chunkIndices: number[]
): Promise<Map<number, number[]>> {
  const redis = getRedis()
  const result = new Map<number, number[]>()
  if (!redis) return result

  try {
    // Use pipeline for efficiency
    const keys = chunkIndices.map(idx => `emb:${documentId}:${idx}`)
    const embeddings = await redis.mget<(number[] | null)[]>(...keys)

    embeddings.forEach((emb, i) => {
      if (emb) {
        result.set(chunkIndices[i], emb)
      }
    })

    if (result.size > 0) {
      logger.info('[IndexingCache] Cache hit for embeddings', {
        documentId,
        requested: chunkIndices.length,
        found: result.size,
      })
    }

    return result
  } catch (error) {
    logger.error('[IndexingCache] Failed to get cached embeddings', error, { documentId })
    return result
  }
}

/**
 * Cache embedding for a chunk
 */
export async function cacheEmbedding(
  documentId: string,
  chunkIndex: number,
  embedding: number[]
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const key = `emb:${documentId}:${chunkIndex}`
    await redis.set(key, embedding, { ex: EMBEDDING_CACHE_TTL })
  } catch (error) {
    logger.error('[IndexingCache] Failed to cache embedding', error, {
      documentId,
      chunkIndex,
    })
  }
}

/**
 * Cache multiple embeddings at once
 */
export async function cacheEmbeddings(
  documentId: string,
  embeddings: Map<number, number[]>
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  // Limit cached embeddings to avoid memory issues
  if (embeddings.size > MAX_CACHED_EMBEDDINGS) {
    logger.warn('[IndexingCache] Too many embeddings to cache, skipping', {
      documentId,
      count: embeddings.size,
      limit: MAX_CACHED_EMBEDDINGS,
    })
    return
  }

  try {
    // Use pipeline for efficiency
    const pipeline = redis.pipeline()

    for (const [idx, embedding] of embeddings) {
      const key = `emb:${documentId}:${idx}`
      pipeline.set(key, embedding, { ex: EMBEDDING_CACHE_TTL })
    }

    await pipeline.exec()

    logger.info('[IndexingCache] Cached embeddings', {
      documentId,
      count: embeddings.size,
    })
  } catch (error) {
    logger.error('[IndexingCache] Failed to cache embeddings', error, { documentId })
  }
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Get indexing progress for resume
 */
export async function getIndexingProgress(documentId: string): Promise<IndexingProgress | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const key = `progress:${documentId}`
    const progress = await redis.get<IndexingProgress>(key)
    return progress
  } catch (error) {
    logger.error('[IndexingCache] Failed to get progress', error, { documentId })
    return null
  }
}

/**
 * Save indexing progress checkpoint
 */
export async function saveIndexingProgress(progress: IndexingProgress): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const key = `progress:${progress.documentId}`
    progress.updatedAt = new Date().toISOString()
    await redis.set(key, progress, { ex: PROGRESS_CACHE_TTL })

    logger.debug('[IndexingCache] Saved progress', {
      documentId: progress.documentId,
      phase: progress.phase,
      chunksProcessed: progress.chunksProcessed,
    })
  } catch (error) {
    logger.error('[IndexingCache] Failed to save progress', error, {
      documentId: progress.documentId,
    })
  }
}

/**
 * Clear indexing progress (on completion or cleanup)
 */
export async function clearIndexingProgress(documentId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const key = `progress:${documentId}`
    await redis.del(key)
    logger.info('[IndexingCache] Cleared progress', { documentId })
  } catch (error) {
    logger.error('[IndexingCache] Failed to clear progress', error, { documentId })
  }
}

// ============================================================================
// CACHE CLEANUP
// ============================================================================

/**
 * Clear all cached data for a document
 */
export async function clearDocumentCache(documentId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    // Get all keys for this document
    const chunkKey = `chunks:${documentId}:hash`
    const progressKey = `progress:${documentId}`

    // Delete known keys
    await redis.del(chunkKey, progressKey)

    // Note: Embedding keys (emb:{docId}:{idx}) will expire naturally
    // We don't scan for them to avoid performance issues

    logger.info('[IndexingCache] Cleared document cache', { documentId })
  } catch (error) {
    logger.error('[IndexingCache] Failed to clear document cache', error, { documentId })
  }
}

// ============================================================================
// CACHE-AWARE EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embeddings with cache support
 *
 * Checks cache first, only generates embeddings for uncached chunks
 */
export async function generateEmbeddingsWithCache(
  documentId: string,
  chunks: string[],
  generateFn: (texts: string[]) => Promise<number[][]>
): Promise<{ embeddings: number[][]; cacheHits: number; generated: number }> {
  const chunkIndices = chunks.map((_, i) => i)

  // Try to get cached embeddings
  const cached = await getCachedEmbeddings(documentId, chunkIndices)
  const cacheHits = cached.size

  // Find which chunks need embedding
  const uncachedIndices: number[] = []
  const uncachedTexts: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    if (!cached.has(i)) {
      uncachedIndices.push(i)
      uncachedTexts.push(chunks[i])
    }
  }

  // Generate embeddings for uncached chunks
  let newEmbeddings: number[][] = []
  if (uncachedTexts.length > 0) {
    newEmbeddings = await generateFn(uncachedTexts)

    // Cache new embeddings
    const toCache = new Map<number, number[]>()
    for (let i = 0; i < uncachedIndices.length; i++) {
      toCache.set(uncachedIndices[i], newEmbeddings[i])
    }
    await cacheEmbeddings(documentId, toCache)
  }

  // Combine cached and new embeddings in order
  const allEmbeddings: number[][] = []
  let newIdx = 0

  for (let i = 0; i < chunks.length; i++) {
    if (cached.has(i)) {
      allEmbeddings.push(cached.get(i)!)
    } else {
      allEmbeddings.push(newEmbeddings[newIdx])
      newIdx++
    }
  }

  logger.info('[IndexingCache] Embeddings generated with cache', {
    documentId,
    total: chunks.length,
    cacheHits,
    generated: newEmbeddings.length,
  })

  return {
    embeddings: allEmbeddings,
    cacheHits,
    generated: newEmbeddings.length,
  }
}
