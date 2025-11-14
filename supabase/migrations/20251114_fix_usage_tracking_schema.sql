-- Migration: Fix usage_tracking table schema
-- Created: 2025-11-14
-- Purpose: Add missing columns to usage_tracking table for free tier limits

-- First, create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add each column individually if it doesn't exist
DO $$
BEGIN
  -- Add user_id column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN user_id UUID;
    -- Add foreign key constraint separately
    ALTER TABLE usage_tracking ADD CONSTRAINT fk_usage_tracking_user
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to usage_tracking table';
  ELSE
    RAISE NOTICE 'user_id column already exists';
  END IF;

  -- Add action_type column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'action_type'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN action_type TEXT;
    -- Update existing rows to have a default value
    UPDATE usage_tracking SET action_type = 'unknown' WHERE action_type IS NULL;
    -- Make it NOT NULL after setting defaults
    ALTER TABLE usage_tracking ALTER COLUMN action_type SET NOT NULL;
    RAISE NOTICE 'Added action_type column to usage_tracking table';
  ELSE
    RAISE NOTICE 'action_type column already exists';
  END IF;

  -- Add tokens_used column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN tokens_used INTEGER;
    RAISE NOTICE 'Added tokens_used column to usage_tracking table';
  ELSE
    RAISE NOTICE 'tokens_used column already exists';
  END IF;

  -- Add credits_used column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN credits_used INTEGER DEFAULT 1;
    RAISE NOTICE 'Added credits_used column to usage_tracking table';
  ELSE
    RAISE NOTICE 'credits_used column already exists';
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN metadata JSONB;
    RAISE NOTICE 'Added metadata column to usage_tracking table';
  ELSE
    RAISE NOTICE 'metadata column already exists';
  END IF;

  -- Ensure created_at exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to usage_tracking table';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;

END $$;

-- Add helpful comment to table
COMMENT ON TABLE usage_tracking IS 'Tracks user actions for usage limits and analytics. Action types include: document_upload, flashcard_generation, podcast_generation, mindmap_generation, exam_creation, chat_message';

-- Create optimized indexes for usage limit queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type_created_at
ON usage_tracking(action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
ON usage_tracking(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date
ON usage_tracking(user_id, created_at);

-- Add helpful comments to indexes
COMMENT ON INDEX idx_usage_tracking_action_type_created_at IS 'Optimizes usage limit queries by action type and time period';
COMMENT ON INDEX idx_usage_tracking_user_created IS 'Optimizes user-specific usage queries';
COMMENT ON INDEX idx_usage_tracking_user_date IS 'Optimizes user usage queries by date';

-- Enable Row Level Security
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to view their own usage
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;

  -- Create policy
  CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

  RAISE NOTICE 'RLS policy created for usage_tracking';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'RLS policy already exists';
END $$;

-- Success message with table info
SELECT
  'Migration completed successfully!' as status,
  (SELECT column_name FROM information_schema.columns
   WHERE table_name = 'usage_tracking' AND table_schema = 'public'
   ORDER BY ordinal_position) as columns_in_table;
