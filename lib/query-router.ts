/**
 * Hybrid Query Router
 *
 * Automatically routes queries to the optimal backend:
 * - Summary/overview questions → Gemini (full context)
 * - Specific/detail questions → Pinecone vector search
 * - Structural questions → Gemini (TOC, sections)
 *
 * Benefits:
 * - Better response quality for each query type
 * - Cost optimization (vector search for specific queries)
 * - Handles large documents with Gemini's 2M token context
 */

import { logger } from './logger'
import { createClient } from '@/lib/supabase/server'
import type { Document } from '@/lib/supabase/types'

// ============================================================================
// TYPES
// ============================================================================

export type QueryIntent =
  | 'summary'      // Overview, main ideas, general understanding
  | 'specific'     // Find particular info, page/section references
  | 'structural'   // TOC, chapters, organization
  | 'comparison'   // Compare concepts, contrast ideas
  | 'definition'   // What is X, define Y
  | 'unknown'      // Fallback

export type QueryBackend = 'gemini' | 'pinecone' | 'hybrid'

export interface QueryClassification {
  intent: QueryIntent
  confidence: number  // 0-1
  backend: QueryBackend
  reasoning: string
}

export interface RoutingDecision {
  backend: QueryBackend
  intent: QueryIntent
  confidence: number
  documentSize: number  // chars
  isPartiallyIndexed: boolean
  reason: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Gemini is preferred for documents over this size (for full context)
const GEMINI_SIZE_THRESHOLD = 500_000  // 500K chars (~125K words)

// Patterns for query intent classification
const SUMMARY_PATTERNS = [
  /\b(summarize|summary|overview|main\s+(ideas?|points?|concepts?|themes?))\b/i,
  /\b(what\s+is\s+(this|the)\s+(book|document|paper|article)\s+about)\b/i,
  /\b(give\s+me\s+(a|an)\s+(brief|quick|short)\s+(summary|overview))\b/i,
  /\b(explain\s+the\s+(main|key|central)\s+(idea|point|theme|argument))\b/i,
  /\b(in\s+(a\s+)?nutshell|big\s+picture|overall|generally)\b/i,
  /\b(tldr|tl;dr|eli5)\b/i,
]

const SPECIFIC_PATTERNS = [
  /\b(where\s+(is|are|can\s+I\s+find)|find\s+(the|a|where))\b/i,
  /\b(page\s+\d+|chapter\s+\d+|section\s+\d+)\b/i,
  /\b(quote|citation|reference|source)\b/i,
  /\b(specific(ally)?|exact(ly)?|precise(ly)?)\b/i,
  /\b(what\s+does\s+.+\s+say\s+about)\b/i,
  /\b(according\s+to|as\s+stated|mentions?)\b/i,
]

const STRUCTURAL_PATTERNS = [
  /\b(table\s+of\s+contents|toc|chapters?|sections?|outline)\b/i,
  /\b(how\s+is\s+(this|the)\s+(book|document)\s+organized)\b/i,
  /\b(structure|organization|layout|format)\b/i,
  /\b(list\s+(the|all)\s+(chapters?|sections?|parts?))\b/i,
]

const COMPARISON_PATTERNS = [
  /\b(compare|contrast|difference|differ|versus|vs\.?)\b/i,
  /\b(similar(ity|ities)?|alike|same|different)\b/i,
  /\b(pros?\s+and\s+cons?|advantages?\s+and\s+disadvantages?)\b/i,
]

const DEFINITION_PATTERNS = [
  /\b(what\s+is|what\s+are|define|definition|meaning\s+of)\b/i,
  /\b(explain\s+what|describe\s+what)\b/i,
]

// ============================================================================
// QUERY CLASSIFICATION
// ============================================================================

/**
 * Classify query intent based on patterns
 */
export function classifyQueryIntent(query: string): QueryClassification {
  const normalizedQuery = query.toLowerCase().trim()

  // Check patterns in order of specificity
  for (const pattern of STRUCTURAL_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        intent: 'structural',
        confidence: 0.9,
        backend: 'gemini',  // Structural queries need full context
        reasoning: 'Query asks about document structure/organization',
      }
    }
  }

  for (const pattern of SUMMARY_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        intent: 'summary',
        confidence: 0.9,
        backend: 'gemini',  // Summaries need full context
        reasoning: 'Query asks for summary or overview',
      }
    }
  }

  for (const pattern of SPECIFIC_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        intent: 'specific',
        confidence: 0.85,
        backend: 'pinecone',  // Specific queries benefit from vector search
        reasoning: 'Query asks for specific information or location',
      }
    }
  }

  for (const pattern of COMPARISON_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        intent: 'comparison',
        confidence: 0.85,
        backend: 'hybrid',  // Comparisons may need both
        reasoning: 'Query compares or contrasts concepts',
      }
    }
  }

  for (const pattern of DEFINITION_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        intent: 'definition',
        confidence: 0.8,
        backend: 'pinecone',  // Definitions are usually localized
        reasoning: 'Query asks for definition or explanation',
      }
    }
  }

  // Default to hybrid for unknown queries
  return {
    intent: 'unknown',
    confidence: 0.5,
    backend: 'hybrid',
    reasoning: 'Query intent unclear, using hybrid approach',
  }
}

// ============================================================================
// ROUTING DECISION
// ============================================================================

/**
 * Make routing decision based on query and document
 */
export async function routeQuery(
  documentId: string,
  query: string,
  userId: string
): Promise<RoutingDecision> {
  // Classify query intent
  const classification = classifyQueryIntent(query)

  // Get document metadata
  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('documents')
    .select(`
      extracted_text,
      rag_indexed,
      rag_priority_chunks_indexed,
      rag_indexing_status,
      rag_indexed_chunks,
      rag_total_chunks
    `)
    .eq('id', documentId)
    .single()

  const documentSize = doc?.extracted_text?.length || 0
  const isFullyIndexed = doc?.rag_indexed === true || doc?.rag_indexing_status === 'completed'
  const isPartiallyIndexed = doc?.rag_priority_chunks_indexed === true
  const hasGemini = !!process.env.GEMINI_API_KEY

  // Determine backend based on multiple factors
  let backend = classification.backend
  let reason = classification.reasoning

  // Override logic based on document state and size
  if (!hasGemini && backend === 'gemini') {
    // No Gemini configured, fall back to Pinecone
    backend = 'pinecone'
    reason = 'Gemini not configured, using vector search'
  } else if (documentSize > GEMINI_SIZE_THRESHOLD && classification.intent === 'summary') {
    // Large document summary → Gemini for full context
    backend = 'gemini'
    reason = 'Large document summary query, using Gemini full context'
  } else if (!isFullyIndexed && !isPartiallyIndexed) {
    // No indexing available, must use Gemini
    if (hasGemini) {
      backend = 'gemini'
      reason = 'Document not indexed, using Gemini'
    } else {
      // Neither option available - this shouldn't happen normally
      logger.warn('[QueryRouter] No backend available', { documentId })
    }
  } else if (isPartiallyIndexed && !isFullyIndexed) {
    // Partially indexed - use Pinecone for specific, Gemini for summary
    if (classification.intent === 'specific') {
      backend = 'pinecone'
      reason = 'Using partial index for specific query'
    } else if (classification.intent === 'summary' && hasGemini) {
      backend = 'gemini'
      reason = 'Using Gemini for summary (partial index may miss context)'
    }
  }

  // Log decision
  logger.info('[QueryRouter] Routing decision', {
    documentId,
    intent: classification.intent,
    backend,
    documentSize,
    isFullyIndexed,
    isPartiallyIndexed,
    reason,
  })

  return {
    backend,
    intent: classification.intent,
    confidence: classification.confidence,
    documentSize,
    isPartiallyIndexed: isPartiallyIndexed && !isFullyIndexed,
    reason,
  }
}

// ============================================================================
// HELPER: GET DOCUMENT INFO FOR ROUTING
// ============================================================================

/**
 * Get document info needed for routing decisions
 */
export async function getDocumentRoutingInfo(documentId: string): Promise<{
  size: number
  isIndexed: boolean
  isPartiallyIndexed: boolean
  indexProgress: number
} | null> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select(`
      extracted_text,
      rag_indexed,
      rag_priority_chunks_indexed,
      rag_indexed_chunks,
      rag_total_chunks
    `)
    .eq('id', documentId)
    .single()

  if (error || !doc) {
    return null
  }

  const isIndexed = doc.rag_indexed === true
  const isPartiallyIndexed = doc.rag_priority_chunks_indexed === true && !isIndexed

  return {
    size: doc.extracted_text?.length || 0,
    isIndexed,
    isPartiallyIndexed,
    indexProgress: doc.rag_total_chunks
      ? Math.round((doc.rag_indexed_chunks || 0) / doc.rag_total_chunks * 100)
      : 0,
  }
}

// ============================================================================
// HELPER: CHECK IF GEMINI SHOULD BE USED
// ============================================================================

/**
 * Quick check if Gemini should be used for this document/query
 */
export function shouldUseGemini(
  documentSize: number,
  queryIntent: QueryIntent,
  isGeminiConfigured: boolean
): boolean {
  if (!isGeminiConfigured) return false

  // Always use Gemini for summary and structural queries on large docs
  if (documentSize > GEMINI_SIZE_THRESHOLD) {
    return queryIntent === 'summary' || queryIntent === 'structural'
  }

  // For very large docs, prefer Gemini for most queries
  if (documentSize > GEMINI_SIZE_THRESHOLD * 2) {
    return queryIntent !== 'specific'
  }

  return false
}
