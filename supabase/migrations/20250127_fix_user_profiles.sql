-- Fix user_profiles table to ensure clerk_user_id exists
-- This migration ensures the table matches the expected schema

-- Add clerk_user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN clerk_user_id TEXT UNIQUE;
    RAISE NOTICE 'Added clerk_user_id column to user_profiles';
  ELSE
    RAISE NOTICE 'clerk_user_id column already exists';
  END IF;
END $$;

-- Ensure the column is NOT NULL (if there are no existing rows, we can make it required)
-- If there are existing rows, you may need to populate clerk_user_id first
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM user_profiles;

  IF row_count = 0 THEN
    -- No rows, safe to add NOT NULL constraint
    ALTER TABLE user_profiles ALTER COLUMN clerk_user_id SET NOT NULL;
    RAISE NOTICE 'Set clerk_user_id as NOT NULL (table was empty)';
  ELSE
    -- Rows exist, check if any have NULL clerk_user_id
    SELECT COUNT(*) INTO row_count FROM user_profiles WHERE clerk_user_id IS NULL;

    IF row_count = 0 THEN
      -- All rows have clerk_user_id, safe to add constraint
      ALTER TABLE user_profiles ALTER COLUMN clerk_user_id SET NOT NULL;
      RAISE NOTICE 'Set clerk_user_id as NOT NULL (all rows have values)';
    ELSE
      RAISE WARNING 'Cannot set clerk_user_id as NOT NULL - % rows have NULL values. Please populate these first.', row_count;
    END IF;
  END IF;
END $$;

-- Add RLS policies for user_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON user_profiles
      FOR SELECT USING (clerk_user_id = auth.jwt()->>'sub');
    RAISE NOTICE 'Created SELECT policy for user_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (clerk_user_id = auth.jwt()->>'sub');
    RAISE NOTICE 'Created UPDATE policy for user_profiles';
  END IF;
END $$;

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'user_profiles table fix completed successfully';
END $$;
