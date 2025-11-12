-- Add missing user_id and document_id columns to podcasts and mindmaps tables
-- These tables need user_id for proper RLS and user-based filtering

-- Add user_id to podcasts table if it doesn't exist
DO $$
BEGIN
  -- Drop the column if it exists with wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE podcasts DROP COLUMN user_id CASCADE;
  END IF;

  -- Add the column with correct type
  ALTER TABLE podcasts ADD COLUMN user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS podcasts_user_id_idx ON podcasts(user_id);
  RAISE NOTICE 'Added user_id column to podcasts table';
END $$;

-- Add document_id to podcasts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE podcasts
    ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE CASCADE;

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS podcasts_document_id_idx ON podcasts(document_id);
    RAISE NOTICE 'Added document_id column to podcasts table';
  END IF;
END $$;

-- Add user_id to mindmaps table if it doesn't exist
DO $$
BEGIN
  -- Drop the column if it exists with wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mindmaps' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE mindmaps DROP COLUMN user_id CASCADE;
  END IF;

  -- Add the column with correct type
  ALTER TABLE mindmaps ADD COLUMN user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS mindmaps_user_id_idx ON mindmaps(user_id);
  RAISE NOTICE 'Added user_id column to mindmaps table';
END $$;

-- Add document_id to mindmaps table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mindmaps' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE mindmaps
    ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE CASCADE;

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS mindmaps_document_id_idx ON mindmaps(document_id);
    RAISE NOTICE 'Added document_id column to mindmaps table';
  END IF;
END $$;

-- Add RLS policies for podcasts
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own podcasts" ON podcasts;
CREATE POLICY "Users can view their own podcasts"
  ON podcasts FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can create their own podcasts" ON podcasts;
CREATE POLICY "Users can create their own podcasts"
  ON podcasts FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can update their own podcasts" ON podcasts;
CREATE POLICY "Users can update their own podcasts"
  ON podcasts FOR UPDATE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can delete their own podcasts" ON podcasts;
CREATE POLICY "Users can delete their own podcasts"
  ON podcasts FOR DELETE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Add RLS policies for mindmaps
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mindmaps" ON mindmaps;
CREATE POLICY "Users can view their own mindmaps"
  ON mindmaps FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can create their own mindmaps" ON mindmaps;
CREATE POLICY "Users can create their own mindmaps"
  ON mindmaps FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can update their own mindmaps" ON mindmaps;
CREATE POLICY "Users can update their own mindmaps"
  ON mindmaps FOR UPDATE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can delete their own mindmaps" ON mindmaps;
CREATE POLICY "Users can delete their own mindmaps"
  ON mindmaps FOR DELETE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));
