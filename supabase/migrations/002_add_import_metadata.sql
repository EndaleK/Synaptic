-- =====================================================
-- ADD IMPORT METADATA TO DOCUMENTS TABLE
-- =====================================================
-- This migration adds support for web-imported content
-- (arXiv papers, web articles, etc.)
-- =====================================================

-- Add new columns for imported content
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('arxiv', 'youtube', 'web', 'medium', 'pdf-url', 'unknown')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for source URL lookups (prevent duplicate imports)
CREATE INDEX IF NOT EXISTS idx_documents_source_url ON documents(source_url) WHERE source_url IS NOT NULL;

-- Create index for source type filtering
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type) WHERE source_type IS NOT NULL;

-- Create GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);

-- Add comments for new columns
COMMENT ON COLUMN documents.source_url IS 'Original URL if content was imported from web (arXiv, blog, etc.)';
COMMENT ON COLUMN documents.source_type IS 'Type of imported content (arxiv, youtube, web, medium, pdf-url, unknown)';
COMMENT ON COLUMN documents.metadata IS 'Rich metadata for imported content (author, tags, reading time, etc.)';
