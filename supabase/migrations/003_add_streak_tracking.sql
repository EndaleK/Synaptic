-- Migration: Add streak tracking to user_profiles
-- This migration adds fields to track daily login streaks for gamification

-- Add streak tracking columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Create index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login
ON user_profiles(last_login_date);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.last_login_date IS 'Date of last login (used for streak calculation)';
COMMENT ON COLUMN user_profiles.current_streak IS 'Current consecutive days logged in';
COMMENT ON COLUMN user_profiles.longest_streak IS 'Longest streak ever achieved';
