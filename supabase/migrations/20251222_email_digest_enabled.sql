-- Add email_digest_enabled column to user_profiles
-- Controls whether users receive daily digest emails

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT true;

-- Add index for efficient querying of users who should receive emails
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_digest ON user_profiles(email_digest_enabled)
WHERE email_digest_enabled = true;

COMMENT ON COLUMN user_profiles.email_digest_enabled IS 'Whether user receives daily study reminder emails';
