-- Migration: Add Progressive Indexing support to documents table
-- Created: 2026-01-03
-- Purpose: Enable progressive RAG indexing with priority chunks for immediate chat access

-- Add progressive indexing columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS rag_indexed_chunks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rag_total_chunks INTEGER,
ADD COLUMN IF NOT EXISTS rag_indexing_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS rag_priority_chunks_indexed BOOLEAN DEFAULT FALSE;

-- Update existing rag_indexed documents to have consistent state
-- Set rag_total_chunks = rag_chunk_count for already indexed documents
UPDATE documents
SET rag_total_chunks = rag_chunk_count,
    rag_indexed_chunks = rag_chunk_count,
    rag_indexing_status = 'completed',
    rag_priority_chunks_indexed = TRUE
WHERE rag_indexed = TRUE AND rag_chunk_count IS NOT NULL;

-- Add index for querying by indexing status
CREATE INDEX IF NOT EXISTS idx_documents_rag_indexing_status
ON documents(rag_indexing_status)
WHERE rag_indexing_status IN ('priority_indexing', 'priority_complete', 'full_indexing');

-- Add index for finding documents with priority chunks ready
CREATE INDEX IF NOT EXISTS idx_documents_priority_indexed
ON documents(rag_priority_chunks_indexed)
WHERE rag_priority_chunks_indexed = TRUE;

-- Add composite index for progress queries
CREATE INDEX IF NOT EXISTS idx_documents_rag_progress
ON documents(rag_indexing_status, rag_indexed_chunks, rag_total_chunks);

-- Comments for documentation
COMMENT ON COLUMN documents.rag_indexed_chunks IS 'Number of chunks currently indexed (for progress tracking)';
COMMENT ON COLUMN documents.rag_total_chunks IS 'Total number of chunks to be indexed';
COMMENT ON COLUMN documents.rag_indexing_status IS 'Current indexing phase: not_started, priority_indexing, priority_complete, full_indexing, completed, failed';
COMMENT ON COLUMN documents.rag_priority_chunks_indexed IS 'True when first 20% of chunks are indexed (enables early chat)';

-- Create a type for indexing status (for stricter typing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rag_indexing_status_enum') THEN
        CREATE TYPE rag_indexing_status_enum AS ENUM (
            'not_started',
            'priority_indexing',
            'priority_complete',
            'full_indexing',
            'completed',
            'failed'
        );
    END IF;
END $$;

-- Add constraint to validate status values
ALTER TABLE documents
ADD CONSTRAINT check_rag_indexing_status
CHECK (rag_indexing_status IS NULL OR rag_indexing_status IN (
    'not_started',
    'priority_indexing',
    'priority_complete',
    'full_indexing',
    'completed',
    'failed'
));
