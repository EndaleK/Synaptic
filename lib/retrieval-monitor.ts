/**
 * Retrieval Quality Monitoring
 *
 * Tracks RAG retrieval metrics to identify quality issues:
 * - Pinecone similarity scores
 * - Cohere rerank scores
 * - Query intent classification
 * - Response strategy used
 *
 * Automatically flags low-quality retrievals for review.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Quality thresholds for flagging poor retrievals
 */
export const QUALITY_THRESHOLDS = {
  /** Flag if best rerank result < 0.5 */
  minTopRerankScore: 0.5,
  /** Flag if average rerank score < 0.3 */
  minAvgRerankScore: 0.3,
  /** Flag if top - bottom > 0.7 (inconsistent quality) */
  maxScoreSpread: 0.7,
  /** Flag if fewer than 3 chunks retrieved */
  minChunksRetrieved: 3,
}

/**
 * Retrieval event to log
 */
export interface RetrievalEvent {
  documentId: string
  userId: string              // Internal user_id (not Clerk ID)
  query: string
  queryIntent?: string
  chunksRetrieved: number
  avgPineconeScore: number
  avgRerankScore: number
  topRerankScore: number
  bottomRerankScore: number
  responseStrategy: 'pinecone' | 'gemini' | 'hybrid'
  wasReranked: boolean
}

/**
 * Aggregated retrieval statistics
 */
export interface RetrievalStats {
  totalQueries: number
  avgChunksRetrieved: number
  avgRerankScore: number
  flaggedCount: number
  flaggedPercentage: number
  byIntent: Record<string, {
    count: number
    avgRerankScore: number
  }>
  byStrategy: Record<string, number>
}

/**
 * Log a retrieval event to the database
 *
 * @param event - Retrieval event details
 * @returns Promise that resolves when logged
 */
export async function logRetrievalEvent(event: RetrievalEvent): Promise<void> {
  try {
    const supabase = await createClient()

    // Calculate if this should be flagged
    const flaggedLowQuality = shouldFlagRetrieval(event)

    const { error } = await supabase
      .from('retrieval_logs')
      .insert({
        document_id: event.documentId,
        user_id: event.userId,
        query: event.query.substring(0, 1000), // Truncate long queries
        query_intent: event.queryIntent,
        chunks_retrieved: event.chunksRetrieved,
        avg_pinecone_score: event.avgPineconeScore,
        avg_rerank_score: event.avgRerankScore,
        top_rerank_score: event.topRerankScore,
        bottom_rerank_score: event.bottomRerankScore,
        response_strategy: event.responseStrategy,
        was_reranked: event.wasReranked,
        flagged_low_quality: flaggedLowQuality,
      })

    if (error) {
      // Don't throw - monitoring should never break the main flow
      logger.warn('[Retrieval Monitor] Failed to log event', { error: error.message })
    } else if (flaggedLowQuality) {
      logger.warn('[Retrieval Monitor] Flagged low-quality retrieval', {
        documentId: event.documentId,
        query: event.query.substring(0, 50),
        topRerankScore: event.topRerankScore,
        avgRerankScore: event.avgRerankScore,
      })
    }
  } catch (error) {
    // Never throw from monitoring - just log
    logger.warn('[Retrieval Monitor] Error logging event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Determine if a retrieval should be flagged as low quality
 */
export function shouldFlagRetrieval(event: RetrievalEvent): boolean {
  // Skip flagging if reranking wasn't used (structural queries, etc.)
  if (!event.wasReranked) {
    return false
  }

  // Flag if top result is below threshold
  if (event.topRerankScore < QUALITY_THRESHOLDS.minTopRerankScore) {
    return true
  }

  // Flag if average is below threshold
  if (event.avgRerankScore < QUALITY_THRESHOLDS.minAvgRerankScore) {
    return true
  }

  // Flag if score spread is too high (inconsistent results)
  const scoreSpread = event.topRerankScore - event.bottomRerankScore
  if (scoreSpread > QUALITY_THRESHOLDS.maxScoreSpread) {
    return true
  }

  // Flag if too few chunks retrieved
  if (event.chunksRetrieved < QUALITY_THRESHOLDS.minChunksRetrieved) {
    return true
  }

  return false
}

/**
 * Get retrieval statistics for a document or all documents
 *
 * @param documentId - Optional document ID to filter by
 * @param days - Number of days to look back (default: 7)
 * @returns Aggregated statistics
 */
export async function getRetrievalStats(
  documentId?: string,
  days: number = 7
): Promise<RetrievalStats | null> {
  try {
    const supabase = await createClient()

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('retrieval_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return null
    }

    // Calculate statistics
    const totalQueries = data.length
    const avgChunksRetrieved = data.reduce((sum, r) => sum + r.chunks_retrieved, 0) / totalQueries
    const avgRerankScore = data.reduce((sum, r) => sum + (r.avg_rerank_score || 0), 0) / totalQueries
    const flaggedCount = data.filter(r => r.flagged_low_quality).length

    // Group by intent
    const byIntent: Record<string, { count: number; avgRerankScore: number }> = {}
    for (const row of data) {
      const intent = row.query_intent || 'unknown'
      if (!byIntent[intent]) {
        byIntent[intent] = { count: 0, avgRerankScore: 0 }
      }
      byIntent[intent].count++
      byIntent[intent].avgRerankScore += row.avg_rerank_score || 0
    }
    // Calculate averages
    for (const intent of Object.keys(byIntent)) {
      byIntent[intent].avgRerankScore /= byIntent[intent].count
    }

    // Group by strategy
    const byStrategy: Record<string, number> = {}
    for (const row of data) {
      const strategy = row.response_strategy || 'unknown'
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1
    }

    return {
      totalQueries,
      avgChunksRetrieved,
      avgRerankScore,
      flaggedCount,
      flaggedPercentage: (flaggedCount / totalQueries) * 100,
      byIntent,
      byStrategy,
    }
  } catch (error) {
    logger.error('[Retrieval Monitor] Failed to get stats', error)
    return null
  }
}

/**
 * Get flagged (low-quality) retrievals for review
 *
 * @param limit - Maximum number of records to return (default: 50)
 * @param documentId - Optional document ID to filter by
 * @returns Array of flagged retrieval records
 */
export async function getFlaggedRetrievals(
  limit: number = 50,
  documentId?: string
): Promise<Array<{
  id: string
  documentId: string
  query: string
  queryIntent: string | null
  topRerankScore: number
  avgRerankScore: number
  createdAt: string
}>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('retrieval_logs')
      .select('id, document_id, query, query_intent, top_rerank_score, avg_rerank_score, created_at')
      .eq('flagged_low_quality', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    return data.map(row => ({
      id: row.id,
      documentId: row.document_id,
      query: row.query,
      queryIntent: row.query_intent,
      topRerankScore: row.top_rerank_score,
      avgRerankScore: row.avg_rerank_score,
      createdAt: row.created_at,
    }))
  } catch (error) {
    logger.error('[Retrieval Monitor] Failed to get flagged retrievals', error)
    return []
  }
}

/**
 * Helper to create a RetrievalEvent from search results
 */
export function createRetrievalEvent(
  documentId: string,
  userId: string,
  query: string,
  results: Array<{ score: number; relevanceScore: number }>,
  options: {
    queryIntent?: string
    responseStrategy?: 'pinecone' | 'gemini' | 'hybrid'
    wasReranked?: boolean
  } = {}
): RetrievalEvent {
  const pineconeScores = results.map(r => r.score)
  const rerankScores = results.map(r => r.relevanceScore)

  const avgPineconeScore = pineconeScores.length > 0
    ? pineconeScores.reduce((a, b) => a + b, 0) / pineconeScores.length
    : 0

  const avgRerankScore = rerankScores.length > 0
    ? rerankScores.reduce((a, b) => a + b, 0) / rerankScores.length
    : 0

  const topRerankScore = rerankScores.length > 0 ? Math.max(...rerankScores) : 0
  const bottomRerankScore = rerankScores.length > 0 ? Math.min(...rerankScores) : 0

  return {
    documentId,
    userId,
    query,
    queryIntent: options.queryIntent,
    chunksRetrieved: results.length,
    avgPineconeScore,
    avgRerankScore,
    topRerankScore,
    bottomRerankScore,
    responseStrategy: options.responseStrategy || 'pinecone',
    wasReranked: options.wasReranked ?? true,
  }
}
