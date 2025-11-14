-- Migration: Add chat_message tracking support
-- Created: 2025-11-14
-- Purpose: Enable tracking of chat message usage for free tier limits (50 messages/month)

-- Add comment to usage_tracking table explaining the chat_message action type
COMMENT ON TABLE usage_tracking IS 'Tracks user actions for usage limits and analytics. Action types include: document_upload, flashcard_generation, podcast_generation, mindmap_generation, exam_creation, chat_message';

-- Note: The usage_tracking table already exists with flexible action_type TEXT field
-- No schema changes needed - this migration serves as documentation

-- Verify the table structure is correct
DO $$
BEGIN
  -- Check if usage_tracking table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
  ) THEN
    RAISE EXCEPTION 'usage_tracking table does not exist!';
  END IF;

  -- Check if action_type column exists and is TEXT type
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'action_type'
    AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION 'usage_tracking.action_type column must be TEXT type!';
  END IF;

  RAISE NOTICE 'Migration verified: chat_message action type can now be tracked';
END $$;

-- Example usage query to verify chat message tracking works
-- SELECT COUNT(*) as chat_messages_this_month
-- FROM usage_tracking
-- WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'your_clerk_id')
--   AND action_type = 'chat_message'
--   AND created_at >= date_trunc('month', CURRENT_DATE);

-- Create index for efficient chat message usage queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type_created_at
ON usage_tracking(action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
ON usage_tracking(user_id, created_at);

-- Add helpful comment
COMMENT ON INDEX idx_usage_tracking_action_type_created_at IS 'Optimizes usage limit queries by action type and time period';
