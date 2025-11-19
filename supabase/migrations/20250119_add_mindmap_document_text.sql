-- Migration: Add document_text column to mindmaps table
-- Date: 2025-01-19
-- Description: Enables node expansion feature by storing document text with mind maps

-- ============================================================================
-- ADD DOCUMENT_TEXT COLUMN
-- ============================================================================

-- Add document_text column (nullable for backward compatibility)
-- This stores the source document text to enable AI-powered node expansion
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS document_text TEXT;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN mindmaps.document_text IS 'Source document text for AI-powered node expansion feature (detailed explanations, quotes, examples)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the migration worked, run:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'mindmaps' AND column_name = 'document_text';
