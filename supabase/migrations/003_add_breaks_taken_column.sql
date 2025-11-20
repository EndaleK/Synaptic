-- ============================================================================
-- ADD MISSING COLUMNS TO STUDY_SESSIONS
-- ============================================================================
-- This migration ensures breaks_taken and notes columns exist in study_sessions table

-- Add breaks_taken column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'study_sessions'
        AND column_name = 'breaks_taken'
    ) THEN
        ALTER TABLE study_sessions ADD COLUMN breaks_taken INTEGER DEFAULT 0;
        RAISE NOTICE 'Column breaks_taken added to study_sessions table';
    ELSE
        RAISE NOTICE 'Column breaks_taken already exists in study_sessions table';
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'study_sessions'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE study_sessions ADD COLUMN notes TEXT;
        RAISE NOTICE 'Column notes added to study_sessions table';
    ELSE
        RAISE NOTICE 'Column notes already exists in study_sessions table';
    END IF;
END $$;
