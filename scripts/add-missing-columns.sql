-- =====================================================
-- ADD ALL MISSING COLUMNS TO LOCAL DATABASE
-- =====================================================
-- This script adds columns that may be missing from your local database
-- All operations use IF NOT EXISTS to be idempotent (safe to run multiple times)
-- =====================================================

-- 1. Add import metadata columns (from 002_add_import_metadata.sql)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('arxiv', 'youtube', 'web', 'medium', 'pdf-url', 'unknown')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add folder support (from 20251109_folders_system.sql)
-- First create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, parent_id)
);

-- Then add folder_id to documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- 3. Add RAG indexing columns (from 20251110_add_rag_columns.sql)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS rag_chunk_count INTEGER,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rag_collection_name TEXT;

-- 4. Add processing progress tracking (from 20251112_add_processing_progress.sql)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processing_progress JSONB DEFAULT NULL;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for source URL lookups
CREATE INDEX IF NOT EXISTS idx_documents_source_url ON documents(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type) WHERE source_type IS NOT NULL;

-- Index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);

-- Index for folder filtering
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id) WHERE folder_id IS NOT NULL;

-- Index for RAG indexed documents
CREATE INDEX IF NOT EXISTS idx_documents_rag_indexed ON documents(rag_indexed_at) WHERE rag_indexed_at IS NOT NULL;

-- Index for processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

-- Index for folders by user
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id) WHERE parent_id IS NOT NULL;

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN documents.source_url IS 'Original URL if content was imported from web (arXiv, blog, etc.)';
COMMENT ON COLUMN documents.source_type IS 'Type of imported content (arxiv, youtube, web, medium, pdf-url, unknown)';
COMMENT ON COLUMN documents.metadata IS 'Rich metadata for imported content (author, tags, reading time, etc.)';
COMMENT ON COLUMN documents.folder_id IS 'Folder this document belongs to (NULL = root level)';
COMMENT ON COLUMN documents.rag_chunk_count IS 'Number of chunks indexed in vector database';
COMMENT ON COLUMN documents.rag_indexed_at IS 'Timestamp when document was indexed for RAG';
COMMENT ON COLUMN documents.rag_collection_name IS 'Name of ChromaDB collection for this document';
COMMENT ON COLUMN documents.processing_progress IS 'Stores detailed processing progress: {current_step, total_steps, step_name, progress_percent, updated_at}';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify all columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
-- ORDER BY ordinal_position;
