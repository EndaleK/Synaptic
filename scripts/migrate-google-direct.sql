-- Add Google OAuth token columns to user_profiles table
-- Run this in Supabase SQL Editor if the migration script doesn't work

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens
ON user_profiles(clerk_user_id)
WHERE google_access_token IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name LIKE 'google%';
