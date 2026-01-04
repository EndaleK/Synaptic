/**
 * Cohere Rerank Integration
 *
 * Provides semantic reranking of search results to improve RAG quality.
 * Reranking happens AFTER Pinecone retrieval, BEFORE sending to LLM.
 *
 * Benefits:
 * - Filters out semantically similar but irrelevant chunks
 * - Reduces noise in LLM context
 * - Improves answer quality
 * - Reduces token costs (fewer chunks sent to LLM)
 *
 * Cost: ~$1 per 1000 searches (very cheap)
 */

import { CohereClient } from 'cohere-ai'
import { logger } from '@/lib/logger'

// Initialize Cohere client (lazy - only when API key is available)
let cohereClient: CohereClient | null = null

function getClient(): CohereClient | null {
  if (!process.env.COHERE_API_KEY) {
    return null
  }
  if (!cohereClient) {
    cohereClient = new CohereClient({
      token: process.env.COHERE_API_KEY,
    })
  }
  return cohereClient
}

/**
 * Check if Cohere reranking is available
 */
export function isRerankAvailable(): boolean {
  return !!process.env.COHERE_API_KEY
}

/**
 * Search result with rerank scores
 */
export interface RerankResult {
  /** Original chunk text */
  text: string
  /** Original Pinecone similarity score (0-1) */
  score: number
  /** Chunk position in original document */
  chunkIndex: number
  /** Cohere relevance score (0-1), higher = more relevant */
  relevanceScore: number
}

/**
 * Options for reranking
 */
export interface RerankOptions {
  /** Number of results to return after reranking (default: 7) */
  topN?: number
  /** Cohere model to use (default: 'rerank-v3.5') */
  model?: 'rerank-v3.5' | 'rerank-english-v3.0' | 'rerank-multilingual-v3.0'
  /** Minimum relevance score threshold (default: 0.1) */
  minScore?: number
}

/**
 * Rerank search results using Cohere's rerank model
 *
 * Takes raw Pinecone results and reorders them by semantic relevance
 * to the query. This is more accurate than vector similarity alone.
 *
 * @param query - The user's search query
 * @param results - Search results from Pinecone
 * @param options - Reranking options
 * @returns Reranked results with relevance scores
 */
export async function rerankResults(
  query: string,
  results: Array<{ text: string; score: number; chunkIndex: number }>,
  options: RerankOptions = {}
): Promise<RerankResult[]> {
  const {
    topN = 7,
    model = 'rerank-v3.5',
    minScore = 0.1,
  } = options

  // If no results, return empty
  if (results.length === 0) {
    return []
  }

  // If Cohere not configured, return original results with placeholder scores
  const client = getClient()
  if (!client) {
    logger.warn('[Cohere Rerank] API key not configured, returning original results')
    return results.slice(0, topN).map(r => ({
      ...r,
      relevanceScore: r.score, // Use Pinecone score as fallback
    }))
  }

  try {
    const startTime = Date.now()

    // Call Cohere rerank API
    const response = await client.v2.rerank({
      model,
      query,
      documents: results.map(r => r.text),
      topN: Math.min(topN, results.length),
      returnDocuments: false, // We already have the documents
    })

    const duration = Date.now() - startTime

    logger.info('[Cohere Rerank] Reranking complete', {
      query: query.substring(0, 50),
      inputCount: results.length,
      outputCount: response.results.length,
      topScore: response.results[0]?.relevanceScore,
      durationMs: duration,
    })

    // Map rerank results back to our format
    const rerankedResults: RerankResult[] = response.results
      .filter(r => r.relevanceScore >= minScore)
      .map(r => {
        const originalResult = results[r.index]
        return {
          text: originalResult.text,
          score: originalResult.score,
          chunkIndex: originalResult.chunkIndex,
          relevanceScore: r.relevanceScore,
        }
      })

    return rerankedResults
  } catch (error) {
    logger.error('[Cohere Rerank] Reranking failed, falling back to original results', error)

    // Fallback: return original results sorted by Pinecone score
    return results.slice(0, topN).map(r => ({
      ...r,
      relevanceScore: r.score,
    }))
  }
}

/**
 * Deduplicate and rerank results from multiple queries
 *
 * Useful when combining results from multiple semantic searches
 * (e.g., full document flashcard generation uses 5 different queries)
 *
 * @param query - The primary query for reranking context
 * @param resultSets - Array of result sets to combine
 * @param options - Reranking options
 * @returns Deduplicated and reranked results
 */
export async function deduplicateAndRerank(
  query: string,
  resultSets: Array<Array<{ text: string; score: number; chunkIndex: number }>>,
  options: RerankOptions = {}
): Promise<RerankResult[]> {
  // Combine all results
  const allResults = resultSets.flat()

  // Deduplicate by chunkIndex (keep highest scoring version)
  const uniqueMap = new Map<number, { text: string; score: number; chunkIndex: number }>()
  for (const result of allResults) {
    const existing = uniqueMap.get(result.chunkIndex)
    if (!existing || result.score > existing.score) {
      uniqueMap.set(result.chunkIndex, result)
    }
  }

  const uniqueResults = Array.from(uniqueMap.values())

  logger.info('[Cohere Rerank] Deduplicating results', {
    totalResults: allResults.length,
    uniqueResults: uniqueResults.length,
    duplicatesRemoved: allResults.length - uniqueResults.length,
  })

  // Rerank the unique results
  return rerankResults(query, uniqueResults, options)
}

/**
 * Get rerank statistics for monitoring
 */
export interface RerankStats {
  inputCount: number
  outputCount: number
  avgRelevanceScore: number
  topRelevanceScore: number
  bottomRelevanceScore: number
  scoreSpread: number
}

export function calculateRerankStats(results: RerankResult[]): RerankStats {
  if (results.length === 0) {
    return {
      inputCount: 0,
      outputCount: 0,
      avgRelevanceScore: 0,
      topRelevanceScore: 0,
      bottomRelevanceScore: 0,
      scoreSpread: 0,
    }
  }

  const scores = results.map(r => r.relevanceScore)
  const topScore = Math.max(...scores)
  const bottomScore = Math.min(...scores)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  return {
    inputCount: results.length,
    outputCount: results.length,
    avgRelevanceScore: avgScore,
    topRelevanceScore: topScore,
    bottomRelevanceScore: bottomScore,
    scoreSpread: topScore - bottomScore,
  }
}
