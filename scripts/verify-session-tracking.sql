-- ============================================================================
-- STUDY SESSION TRACKING VERIFICATION SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify session tracking is working
-- Replace 'user_YOUR_CLERK_ID' with your actual Clerk user ID

-- ============================================================================
-- STEP 1: Verify Database Schema
-- ============================================================================

-- Check if study_sessions table exists with correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'study_sessions'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, document_id, session_type, start_time, end_time,
-- duration_minutes, planned_duration_minutes, completed, breaks_taken,
-- notes, created_at, updated_at

-- ============================================================================
-- STEP 2: Verify Session Type Constraint (CRITICAL)
-- ============================================================================

-- Check session type constraint allows all 9 types
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass
  AND conname LIKE '%session_type%';

-- Expected definition:
-- CHECK (session_type IN ('pomodoro', 'custom', 'review', 'chat',
--                         'podcast', 'mindmap', 'video', 'writing', 'exam'))

-- ============================================================================
-- STEP 3: Verify RLS Policies
-- ============================================================================

-- Check Row-Level Security policies on study_sessions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'study_sessions';

-- Expected policies:
-- 1. Users can view own study sessions (SELECT)
-- 2. Users can manage own study sessions (ALL)

-- ============================================================================
-- STEP 4: Check Your User Profile
-- ============================================================================

-- Find your user profile (REPLACE with your Clerk user ID)
SELECT
  id as user_profile_id,
  email,
  clerk_user_id,
  created_at,
  learning_style
FROM user_profiles
WHERE clerk_user_id = 'user_YOUR_CLERK_ID';

-- If no results: Your user profile hasn't been created yet
-- Solution: Visit /dashboard in the app to auto-create profile

-- ============================================================================
-- STEP 5: Check Your Study Sessions
-- ============================================================================

-- Get all your study sessions (REPLACE with your Clerk user ID)
SELECT
  ss.id,
  ss.session_type,
  ss.start_time,
  ss.end_time,
  ss.duration_minutes,
  ss.planned_duration_minutes,
  ss.completed,
  ss.created_at,
  d.title as document_title
FROM study_sessions ss
LEFT JOIN documents d ON ss.document_id = d.id
WHERE ss.user_id = (
  SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
)
ORDER BY ss.start_time DESC
LIMIT 20;

-- If no results: No sessions have been created yet
-- Solution: Use any learning mode for 1+ minute and check again

-- ============================================================================
-- STEP 6: Session Statistics Summary
-- ============================================================================

-- Calculate statistics from your sessions (REPLACE with your Clerk user ID)
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
  COUNT(*) FILTER (WHERE completed = false) as incomplete_sessions,
  COUNT(DISTINCT DATE(start_time)) as unique_days_studied,
  SUM(duration_minutes) FILTER (WHERE completed = true) as total_minutes,
  ROUND(AVG(duration_minutes) FILTER (WHERE completed = true), 1) as avg_session_minutes,
  MIN(start_time) as first_session,
  MAX(start_time) as latest_session
FROM study_sessions
WHERE user_id = (
  SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
);

-- ============================================================================
-- STEP 7: Mode Breakdown
-- ============================================================================

-- Time spent per learning mode (REPLACE with your Clerk user ID)
SELECT
  session_type,
  COUNT(*) as session_count,
  SUM(duration_minutes) as total_minutes,
  ROUND(AVG(duration_minutes), 1) as avg_minutes,
  ROUND(100.0 * SUM(duration_minutes) / SUM(SUM(duration_minutes)) OVER (), 1) as percentage
FROM study_sessions
WHERE user_id = (
  SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
)
  AND completed = true
GROUP BY session_type
ORDER BY total_minutes DESC;

-- Expected: Breakdown showing which modes you've used most

-- ============================================================================
-- STEP 8: Recent Activity (Last 7 Days)
-- ============================================================================

-- Sessions per day for last 7 days (REPLACE with your Clerk user ID)
SELECT
  DATE(start_time) as session_date,
  COUNT(*) as sessions_count,
  SUM(duration_minutes) as total_minutes,
  STRING_AGG(DISTINCT session_type, ', ' ORDER BY session_type) as modes_used
FROM study_sessions
WHERE user_id = (
  SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
)
  AND completed = true
  AND start_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(start_time)
ORDER BY session_date DESC;

-- Expected: Shows daily activity with total time and modes used

-- ============================================================================
-- STEP 9: Streak Calculation (Manual)
-- ============================================================================

-- Get unique study dates to calculate streak (REPLACE with your Clerk user ID)
WITH study_dates AS (
  SELECT DISTINCT DATE(start_time) as study_date
  FROM study_sessions
  WHERE user_id = (
    SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
  )
    AND completed = true
  ORDER BY study_date DESC
)
SELECT
  study_date,
  CURRENT_DATE - study_date as days_ago,
  LAG(study_date) OVER (ORDER BY study_date DESC) - study_date as gap_to_previous
FROM study_dates
LIMIT 30;

-- How to read:
-- - days_ago: 0 = today, 1 = yesterday, etc.
-- - gap_to_previous: Should be -1 for consecutive days
-- - If gap is NULL or > -1, streak is broken

-- ============================================================================
-- STEP 10: Troubleshooting - Find Incomplete Sessions
-- ============================================================================

-- Find sessions that started but never completed (REPLACE with your Clerk user ID)
SELECT
  id,
  session_type,
  start_time,
  planned_duration_minutes,
  NOW() - start_time as time_since_start,
  CASE
    WHEN NOW() - start_time < INTERVAL '1 minute' THEN 'Too short (<1 min)'
    WHEN NOW() - start_time < INTERVAL '1 hour' THEN 'Recently started'
    ELSE 'Likely abandoned'
  END as status
FROM study_sessions
WHERE user_id = (
  SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
)
  AND completed = false
ORDER BY start_time DESC;

-- ============================================================================
-- STEP 11: Test Insert (Optional - Advanced Users)
-- ============================================================================

-- WARNING: Only run this if you understand SQL transactions
-- Test if you can insert a new session (will be rolled back)

BEGIN;

-- Try to insert a test session
INSERT INTO study_sessions (
  user_id,
  session_type,
  start_time,
  planned_duration_minutes,
  completed
)
VALUES (
  (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'),
  'chat',
  NOW(),
  30,
  false
);

-- If this succeeds, permissions are OK
SELECT 'SUCCESS: Test session inserted' as result;

-- Check the test session
SELECT * FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
ORDER BY created_at DESC LIMIT 1;

-- Rollback to undo the test insert
ROLLBACK;

SELECT 'Test session rolled back - no data was modified' as result;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
GREEN FLAGS (Everything working):
- Step 2: Constraint shows all 9 session types
- Step 4: Your user profile exists
- Step 5: You have sessions with completed = true
- Step 6: total_sessions > 0, total_minutes > 0
- Step 7: Mode breakdown shows realistic distribution
- Step 11: Test insert succeeds

RED FLAGS (Issues detected):
- Step 2: Constraint only shows 3 types → Apply migration (see STATISTICS-TROUBLESHOOTING.md)
- Step 4: No user profile → Visit /dashboard to create profile
- Step 5: No sessions → Session tracking not working, check browser console
- Step 5: All completed = false → Sessions not completing, check client-side logic
- Step 6: total_sessions = 0 → No sessions created, check authentication
- Step 10: Many incomplete sessions → Users switching modes too quickly OR keepalive issues
- Step 11: Test insert fails → RLS policy issue or authentication problem

NEXT STEPS:
1. If constraint only has 3 types → Apply migration from 20251116_add_session_types.sql
2. If no sessions exist → Test session tracking in browser with console open
3. If sessions incomplete → Ensure you use modes for 1+ minute before switching
4. If test insert fails → Check Clerk authentication and RLS policies
*/

-- ============================================================================
-- QUICK VERIFICATION (Run this first)
-- ============================================================================

-- One query to check everything at once (REPLACE with your Clerk user ID)
SELECT
  'User Profile' as check_type,
  CASE WHEN EXISTS(SELECT 1 FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
    THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END as status,
  NULL::text as details
UNION ALL
SELECT
  'Study Sessions',
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' sessions' ELSE '❌ NO SESSIONS' END,
  NULL
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
UNION ALL
SELECT
  'Completed Sessions',
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' completed' ELSE '⚠️ NONE COMPLETED' END,
  NULL
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
  AND completed = true
UNION ALL
SELECT
  'Session Constraint',
  CASE WHEN pg_get_constraintdef(oid) LIKE '%chat%' THEN '✅ ALL 9 TYPES'
    ELSE '❌ ONLY 3 TYPES' END,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass
  AND conname LIKE '%session_type%';

-- ============================================================================
-- DONE
-- ============================================================================
-- Save this output and compare with expected results in troubleshooting guide
