/**
 * Vector Store Integration with ChromaDB
 *
 * Provides semantic search and retrieval for large documents using RAG
 * - Stores document chunks as embeddings
 * - Enables similarity search for relevant content retrieval
 * - Supports flashcard generation, chat, podcast, and mind map features
 */

import { ChromaClient, Collection } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// Initialize ChromaDB client (no embedding function - we'll use OpenAI directly)
// chromadb v3.x uses a simple { path: "url" } format
const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000'
console.log('[Vector Store] ChromaDB URL:', chromaUrl)

const chromaClient = new ChromaClient({
  path: chromaUrl
})

// Initialize OpenAI embeddings for all embedding operations
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small', // Cost-effective, 1536 dimensions
})

/**
 * Text splitter configuration for optimal chunking
 * - 1000 characters per chunk (approximately 250 tokens)
 * - 200 character overlap to preserve context
 * - Splits on sentence boundaries when possible
 */
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
})

/**
 * Get or create a collection for a specific document
 * Each document gets its own collection for isolation
 */
async function getOrCreateCollection(
  documentId: string
): Promise<Collection> {
  const collectionName = `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}`

  try {
    // Try to get existing collection
    // IMPORTANT: Set embeddingFunction to undefined to indicate we're providing our own embeddings
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: undefined,
    })
    return collection
  } catch (error) {
    // Create new collection if it doesn't exist
    // IMPORTANT: Set embeddingFunction to undefined to indicate we're providing our own embeddings
    const collection = await chromaClient.createCollection({
      name: collectionName,
      metadata: { documentId },
      embeddingFunction: undefined,
    })
    return collection
  }
}

/**
 * Process and store a document in the vector database
 * Splits text into chunks, generates embeddings, and stores in ChromaDB
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

    // Get or create collection for this document
    console.log(`[Vector Store] Getting/creating collection for ${documentId}`)
    const collection = await getOrCreateCollection(documentId)
    console.log(`[Vector Store] Collection ready`)

    // Generate embeddings for all chunks
    console.log(`[Vector Store] Generating embeddings for ${chunks.length} chunks...`)
    const embeddingVectors = await embeddings.embedDocuments(chunks)
    console.log(`[Vector Store] Embeddings generated: ${embeddingVectors.length} vectors`)

    // Prepare data for ChromaDB
    const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`)
    const metadatas = chunks.map((chunk, i) => ({
      documentId,
      chunkIndex: i,
      chunkText: chunk,
      ...metadata,
    }))

    // Store in ChromaDB with batching (1000 chunks per batch to avoid request size limits)
    // ChromaDB has both a count limit (~5461) and a request size limit
    // With embeddings (1536 dims × 4 bytes = ~6KB each), 1000 chunks ≈ 6-10MB per request
    const BATCH_SIZE = 1000
    const totalChunks = chunks.length
    console.log(`[Vector Store] Storing ${totalChunks} chunks in ChromaDB (batch size: ${BATCH_SIZE})...`)

    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalChunks)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(totalChunks / BATCH_SIZE)

      console.log(`[Vector Store] Adding batch ${batchNumber}/${totalBatches} (chunks ${i + 1}-${batchEnd})...`)

      await collection.add({
        ids: ids.slice(i, batchEnd),
        embeddings: embeddingVectors.slice(i, batchEnd),
        metadatas: metadatas.slice(i, batchEnd),
        documents: chunks.slice(i, batchEnd),
      })
    }

    console.log(`✅ Indexed ${totalChunks} chunks for document ${documentId}`)

    return { chunks: chunks.length, success: true }
  } catch (error) {
    console.error('[Vector Store] Indexing error details:', error)
    if (error instanceof Error) {
      console.error('[Vector Store] Error message:', error.message)
      console.error('[Vector Store] Error stack:', error.stack)
    }
    throw new Error(`Failed to index document in vector store: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
  userId?: string  // Optional: Clerk user ID for ownership verification
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
        console.error('[Vector Store] User profile not found for ownership check', { userId, documentId })
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
          message: 'User does not own this document'
        })
        return []
      }

      console.log('[Vector Store] Document ownership verified', { userId, documentId })
    }

    // Get collection for this document
    const collection = await getOrCreateCollection(documentId)

    // Generate query embedding
    const queryEmbedding = await embeddings.embedQuery(query)

    // Search ChromaDB
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    })

    // Format results
    if (!results.documents[0] || !results.distances[0] || !results.metadatas[0]) {
      return []
    }

    const formattedResults = results.documents[0].map((doc, i) => ({
      text: doc || '',
      score: 1 - (results.distances![0][i] || 0), // Convert distance to similarity score
      chunkIndex: (results.metadatas![0][i] as { chunkIndex?: number })?.chunkIndex || i,
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
    const collectionName = `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}`
    await chromaClient.deleteCollection({ name: collectionName })
    console.log(`✅ Deleted vector collection for document ${documentId}`)
  } catch (error) {
    console.error('Vector deletion error:', error)
    // Don't throw - collection might not exist
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
    const collection = await getOrCreateCollection(documentId)
    const count = await collection.count()

    return {
      exists: count > 0,
      chunkCount: count,
    }
  } catch (error) {
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
    const collection = await getOrCreateCollection(documentId)

    const ids = indices.map((i) => `${documentId}_chunk_${i}`)

    const results = await collection.get({
      ids,
    })

    return (results.documents || []).filter((doc): doc is string => doc !== null)
  } catch (error) {
    console.error('Chunk retrieval error:', error)
    return []
  }
}

/**
 * Get all chunks for a document (for complete reconstruction)
 * WARNING: Use sparingly for large documents
 */
export async function getAllChunks(documentId: string): Promise<string[]> {
  try {
    const collection = await getOrCreateCollection(documentId)
    const count = await collection.count()

    // Get all chunks
    const results = await collection.get({
      limit: count,
    })

    return (results.documents || []).filter((doc): doc is string => doc !== null)
  } catch (error) {
    console.error('Full document retrieval error:', error)
    return []
  }
}
