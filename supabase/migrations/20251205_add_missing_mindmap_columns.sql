-- Migration: Ensure mindmaps table has all required columns
-- Date: 2025-12-05
-- Description: Adds map_type, document_text, and layout_config columns if missing
-- These columns may not exist if earlier migrations weren't applied before the user_id type fix

-- ============================================================================
-- ADD MISSING COLUMNS TO MINDMAPS TABLE
-- ============================================================================

-- Add map_type column with CHECK constraint
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS map_type TEXT DEFAULT 'hierarchical'
CHECK (map_type IN ('hierarchical', 'radial', 'concept'));

-- Add layout_config column for type-specific settings
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'::jsonb;

-- Add document_text column for node expansion feature
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS document_text TEXT;

-- ============================================================================
-- ADD DESCRIPTION COLUMN (from 20250119_add_mindmap_description.sql)
-- ============================================================================

ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- VERIFY PODCASTS TABLE HAS METADATA COLUMN
-- ============================================================================

ALTER TABLE podcasts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- ADD INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mindmaps_type
ON mindmaps(user_id, map_type);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN mindmaps.map_type IS 'Type of mind map: hierarchical (tree), radial (circular), or concept (network)';
COMMENT ON COLUMN mindmaps.document_text IS 'Source document text for AI-powered node expansion feature';
COMMENT ON COLUMN mindmaps.layout_config IS 'Type-specific layout configuration';
COMMENT ON COLUMN mindmaps.description IS 'Optional description of the mind map';
COMMENT ON COLUMN podcasts.metadata IS 'Additional metadata for podcast (e.g., summary_type for quick summaries)';
