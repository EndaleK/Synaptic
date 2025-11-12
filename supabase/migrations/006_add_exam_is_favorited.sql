-- Migration: Add is_favorited field to exams table
-- This allows users to bookmark/favorite exams for quick access

ALTER TABLE exams
ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering by favorited exams
CREATE INDEX IF NOT EXISTS idx_exams_user_id_favorited ON exams(user_id, is_favorited) WHERE is_favorited = TRUE;
