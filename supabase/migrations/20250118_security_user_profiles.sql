-- Migration: Security Hardening for User Profiles
-- Date: 2025-01-18
-- Description: Adds validation triggers and strict RLS policies to prevent unauthorized user creation

-- ============================================================================
-- VALIDATION FUNCTION FOR CLERK USER IDS
-- ============================================================================

-- Create a function to validate Clerk user IDs format
CREATE OR REPLACE FUNCTION validate_clerk_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure clerk_user_id follows the expected format: user_[27 alphanumeric characters]
  IF NEW.clerk_user_id !~ '^user_[a-zA-Z0-9]{27}$' THEN
    RAISE EXCEPTION 'Invalid clerk_user_id format: %. Expected format: user_[27 alphanumeric chars]', NEW.clerk_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_profiles table
DROP TRIGGER IF EXISTS validate_clerk_user_trigger ON user_profiles;
CREATE TRIGGER validate_clerk_user_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_clerk_user_id();

-- Create a function to prevent changing clerk_user_id and id
CREATE OR REPLACE FUNCTION prevent_id_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing clerk_user_id
  IF NEW.clerk_user_id IS DISTINCT FROM OLD.clerk_user_id THEN
    RAISE EXCEPTION 'clerk_user_id cannot be changed';
  END IF;

  -- Prevent changing id
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id cannot be changed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to prevent id changes
DROP TRIGGER IF EXISTS prevent_id_changes_trigger ON user_profiles;
CREATE TRIGGER prevent_id_changes_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_id_changes();

-- ============================================================================
-- STRENGTHEN ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with stricter rules
DROP POLICY IF EXISTS "Users can only see their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Prevent manual inserts" ON user_profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles
  FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 2: Users can update their own profile (but not clerk_user_id or id)
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (
    clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Policy 3: Service role has full access (for middleware and admin operations)
CREATE POLICY "service_role_full_access"
  ON user_profiles
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Policy 4: Prevent regular users from inserting profiles
-- (Only service role can insert via Policy 3)
CREATE POLICY "prevent_user_inserts"
  ON user_profiles
  FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- AUDIT LOGGING FOR USER PROFILE CHANGES
-- ============================================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS user_profiles_audit (
  id BIGSERIAL PRIMARY KEY,
  user_profile_id BIGINT,
  clerk_user_id TEXT,
  action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  changed_by TEXT,  -- Who made the change
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_profiles_audit (user_profile_id, clerk_user_id, action, changed_by, new_data)
    VALUES (NEW.id, NEW.clerk_user_id, 'INSERT', current_user, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO user_profiles_audit (user_profile_id, clerk_user_id, action, changed_by, old_data, new_data)
    VALUES (NEW.id, NEW.clerk_user_id, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_profiles_audit (user_profile_id, clerk_user_id, action, changed_by, old_data)
    VALUES (OLD.id, OLD.clerk_user_id, 'DELETE', current_user, row_to_json(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_profile_changes();

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id
ON user_profiles(clerk_user_id);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_audit_profile_id
ON user_profiles_audit(user_profile_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_audit_changed_at
ON user_profiles_audit(changed_at DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION validate_clerk_user_id() IS 'Validates that clerk_user_id follows the expected format: user_[27 alphanumeric characters]';
COMMENT ON FUNCTION audit_user_profile_changes() IS 'Logs all changes to user_profiles table for security auditing';
COMMENT ON TABLE user_profiles_audit IS 'Audit log for tracking all changes to user profiles (inserts, updates, deletes)';
COMMENT ON POLICY "users_can_view_own_profile" ON user_profiles IS 'Users can only view their own profile based on JWT sub claim';
COMMENT ON POLICY "users_can_update_own_profile" ON user_profiles IS 'Users can update their own profile but cannot change clerk_user_id or id';
COMMENT ON POLICY "service_role_full_access" ON user_profiles IS 'Service role has full access for middleware and admin operations';
COMMENT ON POLICY "prevent_user_inserts" ON user_profiles IS 'Prevents regular users from inserting profiles directly - only service role can insert';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the migration worked, run these queries:

-- 1. Check that RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 2. View all RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- 3. Check for orphaned user profiles (invalid clerk_user_id format)
-- SELECT id, clerk_user_id, email, created_at
-- FROM user_profiles
-- WHERE clerk_user_id !~ '^user_[a-zA-Z0-9]{27}$'
-- ORDER BY created_at DESC;

-- 4. View recent audit log entries
-- SELECT * FROM user_profiles_audit ORDER BY changed_at DESC LIMIT 10;
