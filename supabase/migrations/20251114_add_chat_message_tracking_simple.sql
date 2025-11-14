-- Migration: Add chat_message tracking support (SIMPLE VERSION - NO VALIDATION)
-- Created: 2025-11-14
-- Purpose: Enable tracking of chat message usage for free tier limits (50 messages/month)

-- Add comment to usage_tracking table explaining the chat_message action type
COMMENT ON TABLE usage_tracking IS 'Tracks user actions for usage limits and analytics. Action types include: document_upload, flashcard_generation, podcast_generation, mindmap_generation, exam_creation, chat_message';

-- Create index for efficient chat message usage queries (if not exists)
-- This allows fast lookups by action type and time period
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type_created_at
ON usage_tracking(action_type, created_at);

-- Create index for efficient user-based usage queries (if not exists)
-- This allows fast lookups of all actions for a specific user in a time period
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
ON usage_tracking(user_id, created_at);

-- Add helpful comment to the indexes
COMMENT ON INDEX idx_usage_tracking_action_type_created_at IS 'Optimizes usage limit queries by action type and time period';
COMMENT ON INDEX idx_usage_tracking_user_created IS 'Optimizes user-specific usage queries';

-- Success message
SELECT 'Migration completed successfully. Indexes created for chat_message tracking.' as status;
