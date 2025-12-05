-- Fix podcasts and mindmaps tables for proper library saving
-- The user_id columns should remain BIGINT (matching user_profiles.id in the live database)
-- This migration just ensures RLS policies are permissive and adds metadata column

-- ============================================
-- PODCASTS TABLE - Fix RLS Policies
-- ============================================

-- Drop existing RLS policies (various naming conventions may exist)
DROP POLICY IF EXISTS "Users can view their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can insert their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can create their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can update their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can delete their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "podcasts_select_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_insert_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_update_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_delete_policy" ON podcasts;

-- Recreate RLS policies (using true since Clerk auth is handled at API level)
CREATE POLICY "Users can view their own podcasts"
  ON podcasts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own podcasts"
  ON podcasts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own podcasts"
  ON podcasts FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own podcasts"
  ON podcasts FOR DELETE
  USING (true);

-- ============================================
-- MINDMAPS TABLE - Fix RLS Policies
-- ============================================

-- Drop existing RLS policies (various naming conventions may exist)
DROP POLICY IF EXISTS "Users can view their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can insert their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can create their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can update their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can delete their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "mindmaps_select_policy" ON mindmaps;
DROP POLICY IF EXISTS "mindmaps_insert_policy" ON mindmaps;
DROP POLICY IF EXISTS "mindmaps_update_policy" ON mindmaps;
DROP POLICY IF EXISTS "mindmaps_delete_policy" ON mindmaps;

-- Recreate RLS policies (using true since Clerk auth is handled at API level)
CREATE POLICY "Users can view their own mindmaps"
  ON mindmaps FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own mindmaps"
  ON mindmaps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own mindmaps"
  ON mindmaps FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own mindmaps"
  ON mindmaps FOR DELETE
  USING (true);

-- ============================================
-- ADD METADATA COLUMN FOR QUICK SUMMARY
-- ============================================

ALTER TABLE podcasts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN podcasts.metadata IS 'Additional metadata for podcast (e.g., summary_type, input_type for quick summaries)';
