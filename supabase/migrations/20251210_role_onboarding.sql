-- ============================================================================
-- ROLE-BASED ONBOARDING MIGRATION
-- ============================================================================
-- This migration adds role selection and onboarding tracking to user_profiles
-- It enables:
-- 1. Primary role selection (learner/parent/educator/institution)
-- 2. Multiple roles per user (array of roles)
-- 3. Onboarding completion tracking
-- 4. Managed child accounts for parents
--
-- It is ADDITIVE ONLY - no existing tables are modified destructively
-- ============================================================================

-- ============================================================================
-- ADD ROLE COLUMNS TO USER_PROFILES
-- ============================================================================

-- Primary role determines which dashboard the user sees by default
-- 'learner' = individual student (default)
-- 'parent' = homeschool parent managing children
-- 'educator' = teacher/tutor within an organization
-- 'institution' = org admin managing a school/co-op
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'learner'
CHECK (primary_role IN ('learner', 'parent', 'educator', 'institution'));

-- Array of all roles this user has (for multi-role users)
-- User can be both parent and educator, for example
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['learner'];

-- Onboarding tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Current onboarding step (for resuming incomplete onboarding)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_step TEXT;

-- For managed accounts: who created this account
-- NULL for self-created accounts
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS managed_by BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Is this a child/managed account?
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_managed_account BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- SET EXISTING USERS AS ONBOARDED
-- Existing users should not be forced through onboarding
-- ============================================================================
UPDATE user_profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_role ON user_profiles(primary_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_managed_by ON user_profiles(managed_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_managed ON user_profiles(is_managed_account);

-- ============================================================================
-- HELPER FUNCTION: Add role to user
-- ============================================================================
CREATE OR REPLACE FUNCTION add_user_role(
  p_user_id BIGINT,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate role
  IF p_role NOT IN ('learner', 'parent', 'educator', 'institution') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Add role if not already present
  UPDATE user_profiles
  SET roles = array_append(roles, p_role)
  WHERE id = p_user_id
  AND NOT (p_role = ANY(roles));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Remove role from user
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_user_role(
  p_user_id BIGINT,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Can't remove if it's the only role
  IF (SELECT array_length(roles, 1) FROM user_profiles WHERE id = p_user_id) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove last role from user';
  END IF;

  -- Remove role
  UPDATE user_profiles
  SET roles = array_remove(roles, p_role)
  WHERE id = p_user_id;

  -- If we removed their primary role, set to first available
  UPDATE user_profiles
  SET primary_role = roles[1]
  WHERE id = p_user_id
  AND NOT (primary_role = ANY(roles));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON COLUMN user_profiles.primary_role IS 'Primary role determines default dashboard: learner (individual), parent (homeschool), educator (teacher), institution (admin)';
COMMENT ON COLUMN user_profiles.roles IS 'Array of all roles this user has. Users can have multiple roles (e.g., both parent and educator)';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed initial role selection and setup';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current step in onboarding flow for resuming incomplete onboarding';
COMMENT ON COLUMN user_profiles.managed_by IS 'For child accounts: ID of parent who created this account';
COMMENT ON COLUMN user_profiles.is_managed_account IS 'True for child accounts created by parents';
