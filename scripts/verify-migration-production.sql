-- ============================================================================
-- VERIFY DATABASE MIGRATION - Run this in Supabase SQL Editor
-- ============================================================================
-- This script verifies that the study_sessions constraint includes all 9 session types

-- 1. Check current constraint definition
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass
  AND conname LIKE '%session_type%';

-- Expected Result:
-- constraint_name: study_sessions_session_type_check
-- constraint_definition: CHECK ((session_type = ANY (ARRAY['pomodoro'::text, 'custom'::text, 'review'::text, 'chat'::text, 'podcast'::text, 'mindmap'::text, 'video'::text, 'writing'::text, 'exam'::text])))

-- 2. Count sessions by type (to see which types are actually being used)
SELECT
  session_type,
  COUNT(*) as session_count,
  SUM(duration_minutes) as total_minutes
FROM study_sessions
WHERE completed = true
GROUP BY session_type
ORDER BY total_minutes DESC;

-- 3. Check for any failed session inserts (these would indicate constraint violations)
-- Note: This only works if you have logging enabled
SELECT
  session_type,
  COUNT(*) as count
FROM study_sessions
WHERE completed = false
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY session_type;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If constraint is missing or wrong, reapply the migration:
/*
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_session_type_check
  CHECK (session_type IN (
    'pomodoro', 'custom', 'review', 'chat', 'podcast',
    'mindmap', 'video', 'writing', 'exam'
  ));
*/
