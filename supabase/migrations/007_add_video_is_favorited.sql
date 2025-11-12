-- Migration: Add is_favorited field to videos table
-- This allows users to bookmark/favorite videos for quick access

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering by favorited videos
CREATE INDEX IF NOT EXISTS idx_videos_user_id_favorited ON videos(user_id, is_favorited) WHERE is_favorited = TRUE;
