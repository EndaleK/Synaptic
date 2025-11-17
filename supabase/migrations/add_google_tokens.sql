-- Add Google OAuth token columns to user_profiles table
-- This allows storing Google access tokens for Docs and Calendar integration

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens
ON user_profiles(clerk_user_id)
WHERE google_access_token IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN user_profiles.google_access_token IS 'Google OAuth access token for Docs and Calendar API access';
COMMENT ON COLUMN user_profiles.google_refresh_token IS 'Google OAuth refresh token for renewing access';
COMMENT ON COLUMN user_profiles.google_token_expiry IS 'Expiration timestamp for the access token';
