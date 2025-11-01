-- Add stripe_subscription_id column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id
ON user_profiles(stripe_subscription_id);

-- Add comment
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe subscription ID for premium users';
