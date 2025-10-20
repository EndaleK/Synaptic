-- Migration: Add sections support to documents table
-- Purpose: Store parsed document structure for section-based navigation

-- Add sections column to store hierarchical document structure
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '{"sections":[],"totalSections":0,"maxDepth":0}'::jsonb;

-- Add index for sections queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_documents_sections ON documents USING GIN (sections);

-- Add comment explaining the sections column structure
COMMENT ON COLUMN documents.sections IS 'Hierarchical document structure with sections extracted from markdown headings or arXiv patterns. Format: {sections: DocumentSection[], totalSections: number, maxDepth: number}';
