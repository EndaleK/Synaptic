-- Migration: Add Database Indexes for Statistics Performance
-- Created: 2025-11-16
-- Description: Adds indexes to improve query performance for study statistics endpoints
-- Related to: /api/study-statistics route optimization

-- ==========================================
-- STUDY SESSIONS INDEXES
-- ==========================================

-- Index for streak calculation and session filtering by user and date
-- Used in: Streak calculation (lines 90-135), session statistics (lines 172-189)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_study_sessions_user_start_time
    ON study_sessions(user_id, start_time DESC);

    -- Index for completed sessions queries
    -- Used in: Session filtering (line 104)
    CREATE INDEX IF NOT EXISTS idx_study_sessions_completed
    ON study_sessions(user_id, completed)
    WHERE completed = true;

    RAISE NOTICE 'Created indexes on study_sessions table';
  ELSE
    RAISE NOTICE 'Skipping study_sessions indexes - table does not exist';
  END IF;
END $$;

-- ==========================================
-- REVIEW QUEUE INDEXES
-- ==========================================

-- Index for flashcard review counts by user and review date
-- Used in: Flashcard reviews today/week queries (lines 210-228)
-- Note: review_queue table is created in 002_study_scheduler.sql migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'review_queue') THEN
    CREATE INDEX IF NOT EXISTS idx_review_queue_user_reviewed_at
    ON review_queue(user_id, last_reviewed_at DESC);

    RAISE NOTICE 'Created indexes on review_queue table';
  ELSE
    RAISE NOTICE 'Skipping review_queue indexes - table does not exist. Apply 002_study_scheduler.sql migration first.';
  END IF;
END $$;

-- ==========================================
-- FLASHCARDS INDEXES
-- ==========================================

-- Index for flashcard statistics aggregation
-- Used in: Flashcard statistics queries (lines 193-204)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flashcards') THEN
    CREATE INDEX IF NOT EXISTS idx_flashcards_user_id
    ON flashcards(user_id);

    -- Composite index for review statistics
    -- Used in: Accuracy and review count calculations (lines 203-207)
    CREATE INDEX IF NOT EXISTS idx_flashcards_user_review_stats
    ON flashcards(user_id, times_reviewed, times_correct);

    RAISE NOTICE 'Created indexes on flashcards table';
  ELSE
    RAISE NOTICE 'Skipping flashcards indexes - table does not exist';
  END IF;
END $$;

-- ==========================================
-- USAGE TRACKING INDEXES
-- ==========================================

-- Index for mode breakdown calculations
-- Used in: Learning mode breakdown queries (lines 290-319)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_tracking') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
    ON usage_tracking(user_id, created_at DESC);

    -- Partial index for action type filtering
    -- Used in: Mode-specific queries
    CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type
    ON usage_tracking(user_id, action_type, created_at DESC);

    RAISE NOTICE 'Created indexes on usage_tracking table';
  ELSE
    RAISE NOTICE 'Skipping usage_tracking indexes - table does not exist';
  END IF;
END $$;

-- ==========================================
-- USER PROFILES INDEXES
-- ==========================================

-- Index for user profile lookup by Clerk ID
-- Used in: User authentication and profile queries (lines 29-42)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id
    ON user_profiles(clerk_user_id);

    -- Check if streak columns exist before creating index
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'current_streak'
    ) THEN
      -- Index for streak tracking columns
      -- Used in: Streak update and display queries
      CREATE INDEX IF NOT EXISTS idx_user_profiles_streak
      ON user_profiles(current_streak, longest_streak, last_login_date);

      RAISE NOTICE 'Created streak index on user_profiles table';
    ELSE
      RAISE NOTICE 'Skipping streak index - columns do not exist. Apply 003_add_streak_tracking.sql migration first.';
    END IF;

    RAISE NOTICE 'Created indexes on user_profiles table';
  ELSE
    RAISE NOTICE 'Skipping user_profiles indexes - table does not exist';
  END IF;
END $$;

-- ==========================================
-- PERFORMANCE NOTES
-- ==========================================

-- Expected improvements:
-- 1. study_sessions queries: 10-50x faster (from full table scan to index scan)
-- 2. review_queue counts: 5-20x faster (count aggregation with index)
-- 3. flashcards aggregation: 3-10x faster (indexed access)
-- 4. usage_tracking queries: 5-15x faster (date range filtering)
--
-- Index maintenance cost:
-- - Minimal write overhead (<5%) due to B-tree indexes
-- - Automatic maintenance by PostgreSQL
-- - May need REINDEX if data volume exceeds 1M rows per table
--
-- Monitoring:
-- - Use EXPLAIN ANALYZE to verify index usage
-- - Check pg_stat_user_indexes for index hit rates
-- - Monitor query performance via Supabase dashboard
