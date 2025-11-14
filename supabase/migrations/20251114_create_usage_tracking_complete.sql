-- Migration: Create or update usage_tracking table for chat message tracking
-- Created: 2025-11-14
-- Purpose: Ensure usage_tracking table exists with proper schema for free tier limits

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- flashcard_generation, podcast_generation, chat_message, etc.
  tokens_used INTEGER,
  credits_used INTEGER DEFAULT 1,
  metadata JSONB, -- Additional tracking data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add action_type column if table exists but column doesn't
DO $$
BEGIN
  -- Check if action_type column exists, add it if not
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'action_type'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN action_type TEXT NOT NULL DEFAULT 'unknown';
    RAISE NOTICE 'Added action_type column to usage_tracking table';
  ELSE
    RAISE NOTICE 'action_type column already exists';
  END IF;
END $$;

-- Add helpful comment to table
COMMENT ON TABLE usage_tracking IS 'Tracks user actions for usage limits and analytics. Action types include: document_upload, flashcard_generation, podcast_generation, mindmap_generation, exam_creation, chat_message';

-- Create optimized indexes for usage limit queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type_created_at
ON usage_tracking(action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
ON usage_tracking(user_id, created_at);

-- Add existing index if not present
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
END $$;

-- Success message
SELECT
  'Migration completed successfully!' as status,
  COUNT(*) as existing_records,
  (SELECT COUNT(DISTINCT action_type) FROM usage_tracking) as unique_action_types
FROM usage_tracking;
