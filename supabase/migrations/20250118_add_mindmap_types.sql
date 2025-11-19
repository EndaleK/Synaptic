-- Migration: Add Mind Map Types Support
-- Date: 2025-01-18
-- Description: Adds support for hierarchical, radial, and concept map types

-- ============================================================================
-- ADD MIND MAP TYPE COLUMN
-- ============================================================================

-- Add type column with default 'hierarchical' for backward compatibility
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS map_type TEXT DEFAULT 'hierarchical'
CHECK (map_type IN ('hierarchical', 'radial', 'concept'));

-- Add layout configuration for type-specific settings
ALTER TABLE mindmaps
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- UPDATE EXISTING MIND MAPS
-- ============================================================================

-- Set all existing mind maps to 'hierarchical' type (backward compatibility)
UPDATE mindmaps
SET map_type = 'hierarchical'
WHERE map_type IS NULL;

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering mind maps by type
CREATE INDEX IF NOT EXISTS idx_mindmaps_type
ON mindmaps(user_id, map_type);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN mindmaps.map_type IS 'Type of mind map: hierarchical (tree), radial (circular), or concept (network with labeled edges)';
COMMENT ON COLUMN mindmaps.layout_config IS 'Type-specific layout configuration (spacing, angles, force parameters, etc.)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the migration worked, run these queries:

-- 1. Check that map_type column exists
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'mindmaps' AND column_name IN ('map_type', 'layout_config');

-- 2. View mind map type distribution
-- SELECT map_type, COUNT(*) as count
-- FROM mindmaps
-- GROUP BY map_type;

-- 3. Check that existing mind maps are set to 'hierarchical'
-- SELECT id, title, map_type
-- FROM mindmaps
-- LIMIT 10;
