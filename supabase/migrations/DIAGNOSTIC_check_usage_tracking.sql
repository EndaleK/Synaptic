-- DIAGNOSTIC QUERY: Check current usage_tracking table schema
-- Run this to see what columns currently exist in the table
-- DO NOT RUN AS MIGRATION - This is just for information

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
) as table_exists;

-- List all columns in the table
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usage_tracking'
ORDER BY ordinal_position;

-- Check current row count
SELECT COUNT(*) as total_records FROM usage_tracking;

-- Check what values exist in action_type (if column exists)
-- SELECT action_type, COUNT(*) as count
-- FROM usage_tracking
-- GROUP BY action_type;
