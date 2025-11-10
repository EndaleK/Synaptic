-- Migration: Add RAG (Retrieval-Augmented Generation) support columns to documents table
-- Created: 2025-11-10
-- Purpose: Track vector indexing status for large documents (>10MB) to enable semantic search

-- Add RAG tracking columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS rag_indexed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rag_collection_name TEXT,
ADD COLUMN IF NOT EXISTS rag_chunk_count INTEGER,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rag_indexing_error TEXT;

-- Add index for querying RAG-indexed documents
CREATE INDEX IF NOT EXISTS idx_documents_rag_indexed ON documents(rag_indexed) WHERE rag_indexed = TRUE;

-- Add index for collection name lookups
CREATE INDEX IF NOT EXISTS idx_documents_rag_collection ON documents(rag_collection_name) WHERE rag_collection_name IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.rag_indexed IS 'True if document has been indexed to ChromaDB vector store for semantic search';
COMMENT ON COLUMN documents.rag_collection_name IS 'ChromaDB collection name (format: doc_{uuid})';
COMMENT ON COLUMN documents.rag_chunk_count IS 'Number of chunks stored in vector database';
COMMENT ON COLUMN documents.rag_indexed_at IS 'Timestamp when RAG indexing completed successfully';
COMMENT ON COLUMN documents.rag_indexing_error IS 'Error message if RAG indexing failed';
