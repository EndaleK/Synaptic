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

    // Generate query embedding
    const queryEmbedding = await embeddings.embedQuery(query)

    // Search Pinecone
    const results = await ns.query({
      vector: queryEmbedding,
      topK,
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
