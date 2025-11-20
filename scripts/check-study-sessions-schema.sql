-- ============================================================================
-- CHECK STUDY_SESSIONS TABLE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the table structure

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'study_sessions'
) AS table_exists;

-- List all columns in study_sessions table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'study_sessions'
ORDER BY ordinal_position;

-- Check specifically for breaks_taken column
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'study_sessions'
  AND column_name = 'breaks_taken'
) AS breaks_taken_column_exists;

-- Check specifically for notes column
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'study_sessions'
  AND column_name = 'notes'
) AS notes_column_exists;
