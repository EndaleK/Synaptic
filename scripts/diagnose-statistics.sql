-- Diagnostic Queries for Study Statistics Issues
-- Run these in Supabase SQL Editor to check data state

-- 1. Check if study_sessions table exists and has data
SELECT
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN completed = true THEN 1 END) as completed_sessions,
  MAX(start_time) as last_session_start
FROM study_sessions;

-- 2. Check if review_queue table exists and has data
SELECT
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN last_reviewed_at IS NOT NULL THEN 1 END) as reviewed_count,
  MAX(last_reviewed_at) as last_review_time
FROM review_queue;

-- 3. Check flashcards table for review data
SELECT
  COUNT(*) as total_cards,
  SUM(times_reviewed) as total_reviews,
  SUM(times_correct) as total_correct,
  COUNT(CASE WHEN times_reviewed > 0 THEN 1 END) as cards_with_reviews,
  MAX(last_reviewed_at) as last_review_time
FROM flashcards;

-- 4. Check usage_tracking table
SELECT
  action_type,
  COUNT(*) as action_count,
  MAX(created_at) as last_action
FROM usage_tracking
GROUP BY action_type
ORDER BY action_count DESC;

-- 5. Check if there are flashcards ready for review
SELECT
  COUNT(*) as total_flashcards,
  COUNT(CASE WHEN last_reviewed_at IS NULL THEN 1 END) as never_reviewed,
  COUNT(CASE WHEN times_reviewed > 0 THEN 1 END) as has_reviews
FROM flashcards;

-- 6. Check user_study_preferences
SELECT
  daily_study_goal_minutes,
  daily_flashcard_review_goal,
  created_at
FROM user_study_preferences
LIMIT 1;
