-- Fix podcasts table user_id column type to match user_profiles.id
-- The API inserts profile.id (which is the same type as user_profiles.id)
-- This migration ensures podcasts.user_id matches user_profiles.id type

-- ============================================
-- STEP 1: Check current user_profiles.id type
-- ============================================

DO $$
DECLARE
  user_profiles_id_type TEXT;
  podcasts_user_id_type TEXT;
BEGIN
  -- Get user_profiles.id data type
  SELECT data_type INTO user_profiles_id_type
  FROM information_schema.columns
  WHERE table_name = 'user_profiles' AND column_name = 'id';

  -- Get podcasts.user_id data type (if exists)
  SELECT data_type INTO podcasts_user_id_type
  FROM information_schema.columns
  WHERE table_name = 'podcasts' AND column_name = 'user_id';

  RAISE NOTICE 'user_profiles.id type: %', user_profiles_id_type;
  RAISE NOTICE 'podcasts.user_id type: %', COALESCE(podcasts_user_id_type, 'COLUMN MISSING');

  -- If types don't match, we need to fix podcasts.user_id
  IF podcasts_user_id_type IS NOT NULL AND podcasts_user_id_type != user_profiles_id_type THEN
    RAISE NOTICE 'Type mismatch detected! Fixing podcasts.user_id to match user_profiles.id (%)...', user_profiles_id_type;

    -- Drop the column and recreate with correct type
    ALTER TABLE podcasts DROP COLUMN user_id;

    IF user_profiles_id_type = 'uuid' THEN
      ALTER TABLE podcasts ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
    ELSE
      ALTER TABLE podcasts ADD COLUMN user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'Fixed podcasts.user_id column type';
  ELSIF podcasts_user_id_type IS NULL THEN
    -- Column doesn't exist, create it with correct type
    RAISE NOTICE 'podcasts.user_id missing, creating with type %...', user_profiles_id_type;

    IF user_profiles_id_type = 'uuid' THEN
      ALTER TABLE podcasts ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
    ELSE
      ALTER TABLE podcasts ADD COLUMN user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
  ELSE
    RAISE NOTICE 'Types already match, no changes needed';
  END IF;
END $$;

-- ============================================
-- STEP 2: Recreate index
-- ============================================

DROP INDEX IF EXISTS podcasts_user_id_idx;
CREATE INDEX podcasts_user_id_idx ON podcasts(user_id);

-- ============================================
-- STEP 3: Ensure RLS policies allow inserts
-- (using TRUE since Clerk auth is at API level)
-- ============================================

ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can insert their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can create their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can update their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "Users can delete their own podcasts" ON podcasts;
DROP POLICY IF EXISTS "podcasts_select_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_insert_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_update_policy" ON podcasts;
DROP POLICY IF EXISTS "podcasts_delete_policy" ON podcasts;

CREATE POLICY "podcasts_select_policy" ON podcasts FOR SELECT USING (true);
CREATE POLICY "podcasts_insert_policy" ON podcasts FOR INSERT WITH CHECK (true);
CREATE POLICY "podcasts_update_policy" ON podcasts FOR UPDATE USING (true);
CREATE POLICY "podcasts_delete_policy" ON podcasts FOR DELETE USING (true);

-- ============================================
-- STEP 4: Verify the fix
-- ============================================

DO $$
DECLARE
  user_profiles_id_type TEXT;
  podcasts_user_id_type TEXT;
BEGIN
  SELECT data_type INTO user_profiles_id_type
  FROM information_schema.columns
  WHERE table_name = 'user_profiles' AND column_name = 'id';

  SELECT data_type INTO podcasts_user_id_type
  FROM information_schema.columns
  WHERE table_name = 'podcasts' AND column_name = 'user_id';

  IF podcasts_user_id_type = user_profiles_id_type THEN
    RAISE NOTICE '✅ SUCCESS: podcasts.user_id (%) now matches user_profiles.id (%)', podcasts_user_id_type, user_profiles_id_type;
  ELSE
    RAISE EXCEPTION '❌ FAILED: Type mismatch still exists. podcasts.user_id=%, user_profiles.id=%', podcasts_user_id_type, user_profiles_id_type;
  END IF;
END $$;
