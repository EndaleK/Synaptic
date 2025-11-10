/**
 * RAG Indexing Endpoint
 * POST /api/documents/[id]/index
 *
 * Indexes a large document (>10MB) to ChromaDB vector store for semantic search.
 * Streams progress updates via Server-Sent Events (SSE).
 *
 * Flow:
 * 1. Verify user owns document
 * 2. Fetch PDF from Supabase Storage
 * 3. Extract text using parseServerPDF
 * 4. Chunk text (1000 chars, 200 overlap)
 * 5. Generate embeddings via OpenAI
 * 6. Store in ChromaDB
 * 7. Update database with indexing metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { indexDocument } from '@/lib/vector-store'
import { parseServerPDF } from '@/lib/server-pdf-parser'
import { createSSEStream, createSSEHeaders, ProgressTracker } from '@/lib/sse-utils'

// Increase timeout for large document processing
export const maxDuration = 300 // 5 minutes (Vercel Pro limit)
export const runtime = 'nodejs' // Required for pdf2json

interface IndexParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: IndexParams
) {
  // Get document ID
  const documentId = (await params).id

  // Verify authentication
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create SSE stream for progress updates
    const stream = createSSEStream(async (send) => {
      try {
        // Step 1: Verify user owns document and get metadata
        send({ type: 'progress', progress: 0, message: 'Verifying document ownership...' })

        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (!profile) {
          throw new Error('User profile not found')
        }

        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .eq('user_id', profile.id)
          .single()

        if (docError || !document) {
          throw new Error('Document not found or access denied')
        }

        // Check if already indexed
        if (document.rag_indexed) {
          send({
            type: 'complete',
            data: {
              documentId,
              collectionName: document.rag_collection_name,
              chunkCount: document.rag_chunk_count,
              alreadyIndexed: true
            }
          })
          return
        }

        // Step 2: Get document text (from storage or existing extracted_text)
        let extractedText: string

        // Check if document already has extracted_text (legacy documents)
        if (document.extracted_text && document.extracted_text.trim().length > 0) {
          send({ type: 'progress', progress: 20, message: 'Using existing extracted text...' })
          extractedText = document.extracted_text

          console.log('[RAG Indexing] Using existing extracted_text for indexing', {
            documentId,
            textLength: extractedText.length
          })
        } else if (document.storage_path) {
          // New documents: Download from storage and extract
          send({ type: 'progress', progress: 10, message: 'Downloading document from storage...' })

          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('documents')
            .download(document.storage_path)

          if (downloadError || !fileData) {
            throw new Error('Failed to download document from storage')
          }

          // Convert blob to File object
          const file = new File([fileData], document.file_name, { type: document.file_type })

          // Extract text
          send({ type: 'progress', progress: 20, message: 'Extracting text from PDF...' })

          const parseResult = await parseServerPDF(file)

          if (parseResult.error || !parseResult.text) {
            throw new Error(`Text extraction failed: ${parseResult.error || 'No text extracted'}`)
          }

          extractedText = parseResult.text

          console.log('[RAG Indexing] Extracted text from storage file', {
            documentId,
            textLength: extractedText.length
          })
        } else {
          // No text and no storage path - cannot index
          throw new Error('Document has no extracted text and no storage path. Please re-upload the document.')
        }

        // Step 4: Index to vector store
        send({ type: 'progress', progress: 40, message: 'Chunking document...' })
        send({ type: 'progress', progress: 50, message: 'Generating embeddings... (this may take 1-2 minutes)' })

        // Check if ChromaDB and OpenAI are configured
        if (!process.env.CHROMA_URL) {
          throw new Error('ChromaDB not configured. Set CHROMA_URL environment variable.')
        }

        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.')
        }

        const indexResult = await indexDocument(documentId, extractedText, {
          fileName: document.file_name,
          fileType: document.file_type
        })

        if (!indexResult.success) {
          throw new Error('Indexing to vector store failed')
        }

        const collectionName = `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}`

        // Step 5: Update database
        send({ type: 'progress', progress: 90, message: 'Updating database...' })

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            rag_indexed: true,
            rag_collection_name: collectionName,
            rag_chunk_count: indexResult.chunks,
            rag_indexed_at: new Date().toISOString(),
            rag_indexing_error: null,
            // Store preview of extracted text if not already present
            extracted_text: document.extracted_text || extractedText.substring(0, 50000)
          })
          .eq('id', documentId)

        if (updateError) {
          console.error('Database update error:', updateError)
          throw new Error('Failed to update document metadata')
        }

        // Success!
        send({ type: 'progress', progress: 100, message: 'Indexing complete!' })
        send({
          type: 'complete',
          data: {
            documentId,
            collectionName,
            chunkCount: indexResult.chunks
          }
        })

      } catch (error) {
        console.error('RAG indexing error:', error)

        // Try to save error to database
        try {
          const supabase = await createClient()
          await supabase
            .from('documents')
            .update({
              rag_indexing_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', documentId)
        } catch (dbError) {
          console.error('Failed to save error to database:', dbError)
        }

        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Indexing failed'
        })
      }
    })

    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error) {
    console.error('RAG indexing endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to index document' },
      { status: 500 }
    )
  }
}
