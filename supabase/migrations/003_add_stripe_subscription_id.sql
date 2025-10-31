-- Add stripe_subscription_id column to user_profiles table
-- This stores the Stripe Subscription ID for premium/enterprise users

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription
ON user_profiles(stripe_subscription_id);

-- Update subscription_status check constraint to include 'canceled' (consistent with Stripe)
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_subscription_status_check
CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due'));

-- Comment
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe Subscription ID for premium/enterprise users';
