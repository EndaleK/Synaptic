/**
 * Vector Store Integration with Pinecone
 *
 * Migrated from ChromaDB to Pinecone for production-ready vector search
 * - Stores document chunks as embeddings in Pinecone serverless index
 * - Enables similarity search for relevant content retrieval
 * - Supports flashcard generation, chat, podcast, and mind map features
 * - Uses namespaces for document isolation (one namespace per document)
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

const indexName = process.env.PINECONE_INDEX_NAME || 'synaptic-embeddings'
console.log('[Vector Store] Pinecone Index:', indexName)

// Get index reference
const index = pinecone.index(indexName)

// Initialize OpenAI embeddings for all embedding operations
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small', // Cost-effective, 1536 dimensions
})

/**
 * Text splitter configuration for optimal chunking
 * - 2000 characters per chunk (approximately 500 tokens) - larger for better context
 * - 400 character overlap to preserve context across chunk boundaries
 * - Splits on paragraph/section boundaries first to preserve structure
 */
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000,
  chunkOverlap: 400,
  separators: [
    '\n\n\n',  // Multiple newlines (section breaks)
    '\n\n',    // Paragraph breaks
    '\nChapter ', '\nCHAPTER ', // Chapter headers
    '\nSection ', '\nSECTION ', // Section headers
    '\nPart ', '\nPART ',       // Part headers
    '\n',      // Line breaks
    '. ',      // Sentence endings
    '! ',
    '? ',
    '; ',
    ', ',
    ' ',
    ''
  ],
})

/**
 * Get namespace for a specific document
 * Each document gets its own namespace for isolation
 */
function getNamespace(documentId: string): string {
  return `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

/**
 * Process and store a document in the vector database
 * Splits text into chunks, generates embeddings, and stores in Pinecone
 */
export async function indexDocument(
  documentId: string,
  text: string,
  metadata: Record<string, string> = {}
): Promise<{ chunks: number; success: boolean }> {
  try {
    console.log(`[Vector Store] Starting indexing for document ${documentId}`)

    // Split document into chunks
    const chunks = await textSplitter.splitText(text)
    console.log(`[Vector Store] Split into ${chunks.length} chunks`)

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document')
    }

    // Generate embeddings for all chunks
    console.log(`[Vector Store] Generating embeddings for ${chunks.length} chunks...`)
    const embeddingVectors = await embeddings.embedDocuments(chunks)
    console.log(`[Vector Store] Embeddings generated: ${embeddingVectors.length} vectors`)

    // Prepare vectors for Pinecone
    const namespace = getNamespace(documentId)
    const vectors = chunks.map((chunk, i) => ({
      id: `${documentId}_chunk_${i}`,
      values: embeddingVectors[i],
      metadata: {
        documentId,
        chunkIndex: i,
        chunkText: chunk,
        text: chunk, // For compatibility
        ...metadata,
      },
    }))

    // Store in Pinecone with batching (100 vectors per batch recommended by Pinecone)
    const BATCH_SIZE = 100
    const totalChunks = chunks.length
    console.log(
      `[Vector Store] Storing ${totalChunks} chunks in Pinecone namespace "${namespace}" (batch size: ${BATCH_SIZE})...`
    )

    const ns = index.namespace(namespace)

    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalChunks)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(totalChunks / BATCH_SIZE)

      console.log(
        `[Vector Store] Upserting batch ${batchNumber}/${totalBatches} (chunks ${i + 1}-${batchEnd})...`
      )

      await ns.upsert(vectors.slice(i, batchEnd))
    }

    console.log(`✅ Indexed ${totalChunks} chunks for document ${documentId}`)

    return { chunks: chunks.length, success: true }
  } catch (error) {
    console.error('[Vector Store] Indexing error details:', error)
    if (error instanceof Error) {
      console.error('[Vector Store] Error message:', error.message)
      console.error('[Vector Store] Error stack:', error.stack)
    }
    throw new Error(
      `Failed to index document in vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Detect if a query is asking about document structure or broad content
 * (chapters, sections, table of contents, outline, full access, etc.)
 */
function isStructuralQuery(query: string): boolean {
  const structuralKeywords = [
    'chapter', 'chapters', 'section', 'sections',
    'table of contents', 'toc', 'outline', 'structure',
    'topics', 'parts', 'part', 'contents', 'index',
    'what is covered', 'what does it cover', 'overview',
    'how many', 'list of', 'list all', 'main topics', 'headings',
    'what are the', 'show me the', 'tell me the',
    // Additional keywords for broad access questions
    'full access', 'all access', 'complete access', 'everything',
    'all specialties', 'all topics', 'entire document', 'whole document',
    'what can you', 'what do you have', 'have access to'
  ]
  const lowerQuery = query.toLowerCase()
  return structuralKeywords.some(keyword => lowerQuery.includes(keyword))
}

/**
 * Check if a chunk likely contains chapter headers or TOC content
 * Returns a score indicating how many chapter references are found
 */
function getChapterContentScore(text: string): number {
  let score = 0

  // Count chapter references (main indicator)
  const chapterMatches = text.match(/chapter\s+\d+/gi) || []
  score += chapterMatches.length * 2

  // Count numbered sections like "1. Introduction"
  const numberedSections = text.match(/^\d+\.\s+[A-Z]/gm) || []
  score += numberedSections.length

  // Check for TOC indicators
  if (/table of contents/gi.test(text)) score += 5
  if (/contents/gi.test(text) && /\d+/g.test(text)) score += 3

  // Check for Part headers
  const partMatches = text.match(/Part\s+[IVX]+/gi) || []
  score += partMatches.length

  return score
}

/**
 * Check if a chunk likely contains chapter headers or TOC content
 */
function containsChapterContent(text: string): boolean {
  return getChapterContentScore(text) > 0
}

/**
 * Enhance query for better semantic matching
 * Adds context keywords to help find structural content
 */
function enhanceQuery(query: string): string {
  if (isStructuralQuery(query)) {
    // Add structural keywords to help match table of contents, chapter headers, etc.
    return `${query} table of contents chapters sections outline structure topics covered`
  }
  return query
}

/**
 * Find all chunks that contain chapter/TOC content by scanning early chunks
 * This is crucial for structural queries about chapter lists
 */
async function findChapterChunks(
  documentId: string,
  maxChunksToScan: number = 50
): Promise<Array<{ text: string; chunkIndex: number; score: number }>> {
  const namespace = getNamespace(documentId)
  const ns = index.namespace(namespace)

  // Get stats to know how many chunks exist
  const stats = await index.describeIndexStats()
  const namespaceStats = stats.namespaces?.[namespace]

  if (!namespaceStats || namespaceStats.recordCount === 0) {
    return []
  }

  const totalChunks = namespaceStats.recordCount
  const chunksToScan = Math.min(maxChunksToScan, totalChunks)

  // Fetch early chunks (TOC is usually in first 20-50 chunks of a book)
  const indicesToFetch = Array.from({ length: chunksToScan }, (_, i) => i)
  const ids = indicesToFetch.map((i) => `${documentId}_chunk_${i}`)

  const results = await ns.fetch(ids)

  // Score each chunk for chapter content
  const scoredChunks: Array<{ text: string; chunkIndex: number; score: number }> = []

  for (let i = 0; i < indicesToFetch.length; i++) {
    const id = ids[i]
    const vector = results.records?.[id]
    const text = (vector?.metadata?.chunkText as string) || (vector?.metadata?.text as string) || ''

    if (text) {
      const score = getChapterContentScore(text)
      if (score > 0) {
        scoredChunks.push({
          text,
          chunkIndex: i,
          score,
        })
      }
    }
  }

  // Sort by score (highest first) to prioritize chunks with most chapter references
  return scoredChunks.sort((a, b) => b.score - a.score)
}

/**
 * Search for relevant chunks using semantic similarity
 * Returns top K most similar chunks for a given query
 *
 * SECURITY: Optional userId parameter for ownership verification (defense-in-depth)
 * While calling routes should verify ownership, this provides additional protection
 */
export async function searchDocument(
  documentId: string,
  query: string,
  topK: number = 5,
  userId?: string // Optional: Clerk user ID for ownership verification
): Promise<Array<{ text: string; score: number; chunkIndex: number }>> {
  try {
    // SECURITY: Verify document ownership if userId provided (defense-in-depth)
    if (userId) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (!profile) {
        console.error('[Vector Store] User profile not found for ownership check', {
          userId,
          documentId,
        })
        return []
      }

      // Verify document ownership
      const { data: document } = await supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (!document) {
        console.error('[Vector Store] Document ownership verification failed', {
          userId,
          documentId,
          message: 'User does not own this document',
        })
        return []
      }

      console.log('[Vector Store] Document ownership verified', { userId, documentId })
    }

    // Get namespace for this document
    const namespace = getNamespace(documentId)
    const ns = index.namespace(namespace)

    // Detect if this is a structural query and adjust retrieval accordingly
    const isStructural = isStructuralQuery(query)
    const enhancedQuery = enhanceQuery(query)

    // For structural queries, retrieve more chunks (25) to capture table of contents
    // Structural queries need more context to find all chapters and specialties
    const effectiveTopK = isStructural ? Math.max(topK, 25) : topK

    console.log('[Vector Store] Search query:', {
      original: query,
      enhanced: enhancedQuery,
      isStructural,
      effectiveTopK,
    })

    // For structural queries about chapters/TOC, use dedicated chapter finder
    // This scans early chunks for chapter patterns (much more reliable than semantic search)
    if (isStructural) {
      console.log('[Vector Store] Structural query detected, scanning for chapter content...')

      // Find all chunks with chapter content (scans first 50 chunks)
      const chapterChunks = await findChapterChunks(documentId, 50)

      if (chapterChunks.length > 0) {
        console.log(`[Vector Store] Found ${chapterChunks.length} chunks with chapter content`)

        // Sort by chunk index to preserve document order (TOC appears sequentially)
        const sortedChunks = chapterChunks
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map(chunk => ({
            text: chunk.text,
            score: 0.9, // High score since these are direct pattern matches
            chunkIndex: chunk.chunkIndex,
          }))

        // Also do semantic search and merge results for completeness
        const queryEmbedding = await embeddings.embedQuery(enhancedQuery)
        const semanticResults = await ns.query({
          vector: queryEmbedding,
          topK: effectiveTopK,
          includeMetadata: true,
        })

        if (semanticResults.matches && semanticResults.matches.length > 0) {
          const existingIndices = new Set(sortedChunks.map(c => c.chunkIndex))

          const additionalResults = semanticResults.matches
            .filter(match => !existingIndices.has((match.metadata?.chunkIndex as number) || 0))
            .map(match => ({
              text: (match.metadata?.chunkText as string) || (match.metadata?.text as string) || '',
              score: match.score || 0,
              chunkIndex: (match.metadata?.chunkIndex as number) || 0,
            }))

          // Combine pattern-matched chunks with semantic results, sorted by chunk index
          const allResults = [...sortedChunks, ...additionalResults]
            .sort((a, b) => a.chunkIndex - b.chunkIndex)

          console.log(`[Vector Store] Returning ${allResults.length} total chunks for structural query`)
          return allResults
        }

        return sortedChunks
      }

      // Fallback: if no chapter patterns found, fetch first 20 early chunks
      console.log('[Vector Store] No chapter patterns found, fetching early chunks as fallback')
      const earlyIndices = Array.from({ length: 20 }, (_, i) => i)
      const earlyChunks = await getChunksByIndices(documentId, earlyIndices)

      if (earlyChunks.length > 0) {
        return earlyChunks.map((text, idx) => ({
          text,
          score: 0.5,
          chunkIndex: idx,
        }))
      }
    }

    // Standard semantic search for non-structural queries
    const queryEmbedding = await embeddings.embedQuery(enhancedQuery)

    // Search Pinecone
    const results = await ns.query({
      vector: queryEmbedding,
      topK: effectiveTopK,
      includeMetadata: true,
    })

    // Format results
    if (!results.matches || results.matches.length === 0) {
      return []
    }

    const formattedResults = results.matches.map((match) => ({
      text: (match.metadata?.chunkText as string) || (match.metadata?.text as string) || '',
      score: match.score || 0,
      chunkIndex: (match.metadata?.chunkIndex as number) || 0,
    }))

    return formattedResults
  } catch (error) {
    console.error('Vector search error:', error)
    return []
  }
}

/**
 * Delete a document's vector embeddings from the store
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    const namespace = getNamespace(documentId)
    const ns = index.namespace(namespace)

    // Delete all vectors in the namespace
    await ns.deleteAll()

    console.log(`✅ Deleted vectors for document ${documentId} from namespace ${namespace}`)
  } catch (error) {
    console.error('Vector deletion error:', error)
    // Don't throw - namespace might not exist
  }
}

/**
 * Get document statistics from vector store
 */
export async function getDocumentStats(documentId: string): Promise<{
  exists: boolean
  chunkCount: number
}> {
  try {
    const namespace = getNamespace(documentId)

    // Get namespace stats
    const stats = await index.describeIndexStats()
    const namespaceStats = stats.namespaces?.[namespace]

    if (!namespaceStats || namespaceStats.recordCount === 0) {
      return {
        exists: false,
        chunkCount: 0,
      }
    }

    return {
      exists: true,
      chunkCount: namespaceStats.recordCount || 0,
    }
  } catch (error) {
    console.error('Stats retrieval error:', error)
    return {
      exists: false,
      chunkCount: 0,
    }
  }
}

/**
 * Retrieve specific chunks by their indices
 * Useful for reconstructing context around a specific section
 */
export async function getChunksByIndices(
  documentId: string,
  indices: number[]
): Promise<string[]> {
  try {
    const namespace = getNamespace(documentId)
    const ns = index.namespace(namespace)

    const ids = indices.map((i) => `${documentId}_chunk_${i}`)

    // Fetch vectors by ID
    const results = await ns.fetch(ids)

    // Extract text from metadata
    const chunks = ids
      .map((id) => {
        const vector = results.records?.[id]
        return (vector?.metadata?.chunkText as string) || (vector?.metadata?.text as string) || ''
      })
      .filter((text) => text.length > 0)

    return chunks
  } catch (error) {
    console.error('Chunk retrieval error:', error)
    return []
  }
}

/**
 * Get all chunks for a document (for complete reconstruction)
 * WARNING: Use sparingly for large documents
 * Note: Pinecone doesn't support listing all vectors, so this queries with a dummy vector
 */
export async function getAllChunks(documentId: string): Promise<string[]> {
  try {
    const namespace = getNamespace(documentId)
    const ns = index.namespace(namespace)

    // Get stats to know how many chunks exist
    const stats = await index.describeIndexStats()
    const namespaceStats = stats.namespaces?.[namespace]

    if (!namespaceStats || namespaceStats.recordCount === 0) {
      return []
    }

    const totalChunks = namespaceStats.recordCount

    // Generate a dummy query vector to get all results
    // This is a workaround since Pinecone doesn't have a "list all" operation
    const dummyVector = Array(1536).fill(0) // 1536-dimensional zero vector

    const results = await ns.query({
      vector: dummyVector,
      topK: Math.min(totalChunks, 10000), // Pinecone max is 10000
      includeMetadata: true,
    })

    // Extract and sort chunks by index
    const chunks = results.matches
      ?.map((match) => ({
        index: (match.metadata?.chunkIndex as number) || 0,
        text: (match.metadata?.chunkText as string) || (match.metadata?.text as string) || '',
      }))
      .sort((a, b) => a.index - b.index)
      .map((chunk) => chunk.text)
      .filter((text) => text.length > 0)

    return chunks || []
  } catch (error) {
    console.error('Full document retrieval error:', error)
    return []
  }
}

/**
 * Get index statistics (useful for monitoring)
 */
export async function getIndexStats() {
  try {
    const stats = await index.describeIndexStats()
    return stats
  } catch (error) {
    console.error('Index stats error:', error)
    return null
  }
}
