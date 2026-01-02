-- Referral Program Migration
-- Enables users to refer friends and earn rewards

-- ============================================================================
-- Add referral columns to user_profiles
-- ============================================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- Generate unique referral codes for existing users
UPDATE user_profiles
SET referral_code = upper(substring(md5(id::text || random()::text) from 1 for 8))
WHERE referral_code IS NULL;

-- ============================================================================
-- Referrals Table - Track individual referrals
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
  reward_type TEXT, -- 'free_month', 'bonus_credits', 'premium_features'
  reward_amount INTEGER, -- e.g., 1 month, 100 credits
  referrer_rewarded_at TIMESTAMPTZ,
  referred_rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ, -- When referred user completes qualifying action

  UNIQUE(referred_id), -- Each user can only be referred once
  CONSTRAINT different_users CHECK (referrer_id != referred_id)
);

-- ============================================================================
-- Referral Rewards Table - Track rewards earned
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_month', 'bonus_credits', 'premium_features', 'bonus_uploads')),
  reward_value INTEGER NOT NULL, -- Amount/duration of reward
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Referral Milestones Table - Track milestone achievements
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- 'first_referral', '5_referrals', '10_referrals', '25_referrals'
  referral_count INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, milestone_type)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_milestones_user ON referral_milestones(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;

-- Referrals Policies
CREATE POLICY "Users can view their own referrals as referrer"
  ON referrals FOR SELECT
  USING (referrer_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can view referrals where they are referred"
  ON referrals FOR SELECT
  USING (referred_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Referral Rewards Policies
CREATE POLICY "Users can view their own rewards"
  ON referral_rewards FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Referral Milestones Policies
CREATE POLICY "Users can view their own milestones"
  ON referral_milestones FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- ============================================================================
-- Functions
-- ============================================================================

-- Generate unique referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(NEW.id::text || random()::text || now()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Process referral when user completes qualifying action
CREATE OR REPLACE FUNCTION process_referral_completion(p_referred_user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referrer_id INTEGER;
  v_referrer_total INTEGER;
  v_milestone_reward JSONB;
BEGIN
  -- Find pending referral
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_user_id
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No pending referral found');
  END IF;

  v_referrer_id := v_referral.referrer_id;

  -- Update referral status
  UPDATE referrals
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = v_referral.id;

  -- Update referrer's total count
  UPDATE user_profiles
  SET total_referrals = COALESCE(total_referrals, 0) + 1,
      referral_credits = COALESCE(referral_credits, 0) + 100 -- Base reward
  WHERE id = v_referrer_id
  RETURNING total_referrals INTO v_referrer_total;

  -- Give referred user a bonus too
  UPDATE user_profiles
  SET referral_credits = COALESCE(referral_credits, 0) + 50
  WHERE id = p_referred_user_id;

  -- Create reward records
  INSERT INTO referral_rewards (user_id, referral_id, reward_type, reward_value, status)
  VALUES
    (v_referrer_id, v_referral.id, 'bonus_credits', 100, 'applied'),
    (p_referred_user_id, v_referral.id, 'bonus_credits', 50, 'applied');

  -- Check for milestones
  v_milestone_reward := NULL;

  IF v_referrer_total = 1 THEN
    INSERT INTO referral_milestones (user_id, milestone_type, referral_count, reward_type, reward_value)
    VALUES (v_referrer_id, 'first_referral', 1, 'bonus_credits', 50)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
    v_milestone_reward := jsonb_build_object('type', 'first_referral', 'bonus', 50);

    UPDATE user_profiles SET referral_credits = referral_credits + 50 WHERE id = v_referrer_id;
  ELSIF v_referrer_total = 5 THEN
    INSERT INTO referral_milestones (user_id, milestone_type, referral_count, reward_type, reward_value)
    VALUES (v_referrer_id, '5_referrals', 5, 'free_month', 1)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
    v_milestone_reward := jsonb_build_object('type', '5_referrals', 'reward', '1 free month');
  ELSIF v_referrer_total = 10 THEN
    INSERT INTO referral_milestones (user_id, milestone_type, referral_count, reward_type, reward_value)
    VALUES (v_referrer_id, '10_referrals', 10, 'free_month', 3)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
    v_milestone_reward := jsonb_build_object('type', '10_referrals', 'reward', '3 free months');
  ELSIF v_referrer_total = 25 THEN
    INSERT INTO referral_milestones (user_id, milestone_type, referral_count, reward_type, reward_value)
    VALUES (v_referrer_id, '25_referrals', 25, 'premium_features', 12)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
    v_milestone_reward := jsonb_build_object('type', '25_referrals', 'reward', '1 year premium');
  END IF;

  -- Update referral as rewarded
  UPDATE referrals
  SET status = 'rewarded',
      referrer_rewarded_at = NOW(),
      referred_rewarded_at = NOW(),
      reward_type = 'bonus_credits',
      reward_amount = 100
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'total_referrals', v_referrer_total,
    'milestone', v_milestone_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get referral statistics for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'referral_code', up.referral_code,
    'total_referrals', COALESCE(up.total_referrals, 0),
    'referral_credits', COALESCE(up.referral_credits, 0),
    'pending_referrals', (
      SELECT COUNT(*) FROM referrals
      WHERE referrer_id = p_user_id AND status = 'pending'
    ),
    'completed_referrals', (
      SELECT COUNT(*) FROM referrals
      WHERE referrer_id = p_user_id AND status IN ('completed', 'rewarded')
    ),
    'milestones', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'type', milestone_type,
        'achieved_at', achieved_at,
        'reward', reward_type || ': ' || reward_value
      )), '[]'::jsonb)
      FROM referral_milestones
      WHERE user_id = p_user_id
    ),
    'next_milestone', CASE
      WHEN COALESCE(up.total_referrals, 0) < 1 THEN jsonb_build_object('target', 1, 'reward', '50 bonus credits')
      WHEN COALESCE(up.total_referrals, 0) < 5 THEN jsonb_build_object('target', 5, 'reward', '1 free month')
      WHEN COALESCE(up.total_referrals, 0) < 10 THEN jsonb_build_object('target', 10, 'reward', '3 free months')
      WHEN COALESCE(up.total_referrals, 0) < 25 THEN jsonb_build_object('target', 25, 'reward', '1 year premium')
      ELSE NULL
    END
  ) INTO v_stats
  FROM user_profiles up
  WHERE up.id = p_user_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
