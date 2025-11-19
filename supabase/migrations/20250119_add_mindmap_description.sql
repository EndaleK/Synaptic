-- Migration: Add description column to mindmaps table
-- Date: 2025-01-19
-- Description: Adds optional description field for mind maps (used by RAG route)

-- ============================================================================
-- ADD DESCRIPTION COLUMN
-- ============================================================================

-- Add description column (nullable for backward compatibility)
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- UPDATE EXISTING MIND MAPS
-- ============================================================================

-- Set default description for existing mind maps based on title
UPDATE mindmaps
SET description = 'Mind map: ' || title
WHERE description IS NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN mindmaps.description IS 'Optional description or summary of the mind map content';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the migration worked, run:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'mindmaps' AND column_name = 'description';
