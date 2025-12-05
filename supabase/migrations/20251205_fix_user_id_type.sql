-- Fix user_id column type from BIGINT to UUID for podcasts and mindmaps tables
-- The original migration 008 incorrectly used BIGINT, but user_profiles.id is UUID
-- This migration converts the columns to match the schema

-- ============================================
-- STEP 1: Drop all constraints and policies
-- ============================================

-- Podcasts: Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can insert their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can create their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can update their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can delete their own podcasts" ON podcasts;

-- Mindmaps: Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can insert their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can create their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can update their own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can delete their own mindmaps" ON mindmaps;

-- Drop foreign key constraints
ALTER TABLE podcasts DROP CONSTRAINT IF EXISTS podcasts_user_id_fkey;
ALTER TABLE mindmaps DROP CONSTRAINT IF EXISTS mindmaps_user_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS podcasts_user_id_idx;
DROP INDEX IF EXISTS mindmaps_user_id_idx;

-- ============================================
-- STEP 2: Convert columns from BIGINT to UUID
-- ============================================

-- For podcasts: Drop old column and add new UUID column
ALTER TABLE podcasts DROP COLUMN IF EXISTS user_id;
ALTER TABLE podcasts ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

-- For mindmaps: Drop old column and add new UUID column
ALTER TABLE mindmaps DROP COLUMN IF EXISTS user_id;
ALTER TABLE mindmaps ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

-- ============================================
-- STEP 3: Recreate indexes
-- ============================================

CREATE INDEX IF NOT EXISTS podcasts_user_id_idx ON podcasts(user_id);
CREATE INDEX IF NOT EXISTS mindmaps_user_id_idx ON mindmaps(user_id);

-- ============================================
-- STEP 4: Recreate RLS policies (permissive since Clerk handles auth)
-- ============================================

-- Podcasts RLS
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

-- Mindmaps RLS
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
-- STEP 5: Add metadata column for Quick Summary (if not exists)
-- ============================================

ALTER TABLE podcasts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN podcasts.metadata IS 'Additional metadata for podcast (e.g., summary_type, input_type for quick summaries)';
