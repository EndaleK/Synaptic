-- Add missing columns to user_profiles table
-- This ensures the table matches the expected schema

-- Add email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added email column';
  END IF;
END $$;

-- Add full_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE 'Added full_name column';
  END IF;
END $$;

-- Add learning_style column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'learning_style'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed'));
    RAISE NOTICE 'Added learning_style column';
  END IF;
END $$;

-- Add preferred_mode column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_mode'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_mode TEXT CHECK (preferred_mode IN ('flashcards', 'chat', 'podcast', 'mindmap'));
    RAISE NOTICE 'Added preferred_mode column';
  END IF;
END $$;

-- Add subscription_tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));
    RAISE NOTICE 'Added subscription_tier column';
  END IF;
END $$;

-- Add stripe_customer_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id TEXT UNIQUE;
    RAISE NOTICE 'Added stripe_customer_id column';
  END IF;
END $$;

-- Add subscription_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due'));
    RAISE NOTICE 'Added subscription_status column';
  END IF;
END $$;

-- Add documents_used_this_month column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'documents_used_this_month'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN documents_used_this_month INTEGER DEFAULT 0;
    RAISE NOTICE 'Added documents_used_this_month column';
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- Create updated_at trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_profiles_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    CREATE TRIGGER user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_user_profiles_updated_at();

    RAISE NOTICE 'Created updated_at trigger';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'user_profiles table columns migration completed successfully';
END $$;
