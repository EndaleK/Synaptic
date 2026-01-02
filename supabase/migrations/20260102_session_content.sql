-- Migration: Enhanced Study Plan Sessions with Content Tracking
-- This migration adds support for:
-- 1. Tracking generated content per session (flashcards, podcasts, mindmaps, quizzes)
-- 2. Daily quizzes and weekly exam markers
-- 3. Session rescheduling for missed sessions
-- 4. Topic page ranges for focused content generation

-- ============================================
-- Table: study_session_content
-- ============================================
-- Tracks generated content (flashcards, podcasts, mindmaps, quizzes) for each session
CREATE TABLE IF NOT EXISTS study_session_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_plan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('flashcards', 'podcast', 'mindmap', 'daily_quiz', 'weekly_exam')),
  content_id UUID, -- Reference to the actual content (flashcard_sets.id, podcasts.id, mindmaps.id, or exams.id)
  topic_focus TEXT, -- The specific topic/section this content covers
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed', 'skipped')),
  error_message TEXT, -- Error details if generation failed
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each session can only have one of each content type
  UNIQUE(session_id, content_type)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_session_content_session_id ON study_session_content(session_id);
CREATE INDEX IF NOT EXISTS idx_session_content_user_id ON study_session_content(user_id);
CREATE INDEX IF NOT EXISTS idx_session_content_status ON study_session_content(status);
CREATE INDEX IF NOT EXISTS idx_session_content_content_type ON study_session_content(content_type);

-- ============================================
-- Alter: study_plan_sessions
-- ============================================
-- Add columns for quiz/exam tracking and rescheduling

-- Check if columns exist before adding (idempotent migration)
DO $$
BEGIN
  -- has_daily_quiz: Marks sessions that should have a daily quiz
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_sessions' AND column_name = 'has_daily_quiz'
  ) THEN
    ALTER TABLE study_plan_sessions ADD COLUMN has_daily_quiz BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- has_weekly_exam: Marks sessions that are at week boundaries for comprehensive exams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_sessions' AND column_name = 'has_weekly_exam'
  ) THEN
    ALTER TABLE study_plan_sessions ADD COLUMN has_weekly_exam BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- rescheduled_from: Reference to original session if this was auto-rescheduled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_sessions' AND column_name = 'rescheduled_from'
  ) THEN
    ALTER TABLE study_plan_sessions ADD COLUMN rescheduled_from UUID REFERENCES study_plan_sessions(id);
  END IF;

  -- topic_pages: JSON storing page ranges for focused content generation
  -- Format: {"startPage": 1, "endPage": 50, "sections": ["Section A", "Section B"]}
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_sessions' AND column_name = 'topic_pages'
  ) THEN
    ALTER TABLE study_plan_sessions ADD COLUMN topic_pages JSONB;
  END IF;

  -- week_number: Which week of the study plan this session belongs to
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_sessions' AND column_name = 'week_number'
  ) THEN
    ALTER TABLE study_plan_sessions ADD COLUMN week_number INTEGER;
  END IF;
END $$;

-- Index for rescheduled sessions lookup
CREATE INDEX IF NOT EXISTS idx_sessions_rescheduled_from ON study_plan_sessions(rescheduled_from);

-- Index for week-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_week_number ON study_plan_sessions(study_plan_id, week_number);

-- ============================================
-- RLS Policies for study_session_content
-- ============================================
ALTER TABLE study_session_content ENABLE ROW LEVEL SECURITY;

-- Users can only view their own session content
CREATE POLICY "Users can view own session content"
  ON study_session_content
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can insert content for their own sessions
CREATE POLICY "Users can insert own session content"
  ON study_session_content
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can update their own session content
CREATE POLICY "Users can update own session content"
  ON study_session_content
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can delete their own session content
CREATE POLICY "Users can delete own session content"
  ON study_session_content
  FOR DELETE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_session_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_content_updated_at ON study_session_content;
CREATE TRIGGER trigger_session_content_updated_at
  BEFORE UPDATE ON study_session_content
  FOR EACH ROW
  EXECUTE FUNCTION update_session_content_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE study_session_content IS 'Tracks generated learning content (flashcards, podcasts, mindmaps, quizzes) for each study plan session';
COMMENT ON COLUMN study_session_content.content_type IS 'Type of content: flashcards, podcast, mindmap, daily_quiz, or weekly_exam';
COMMENT ON COLUMN study_session_content.content_id IS 'UUID reference to the actual content in its respective table';
COMMENT ON COLUMN study_session_content.status IS 'Generation status: pending (not started), generating (in progress), ready (complete), failed (error), skipped (user skipped)';
COMMENT ON COLUMN study_session_content.topic_focus IS 'The specific topic or section this content covers from the document';

COMMENT ON COLUMN study_plan_sessions.has_daily_quiz IS 'Whether this session includes a daily quiz (5-10 quick questions)';
COMMENT ON COLUMN study_plan_sessions.has_weekly_exam IS 'Whether this session includes a weekly comprehensive exam';
COMMENT ON COLUMN study_plan_sessions.rescheduled_from IS 'If this session was auto-rescheduled, references the original missed session';
COMMENT ON COLUMN study_plan_sessions.topic_pages IS 'JSON containing page ranges and sections to focus on for this session';
COMMENT ON COLUMN study_plan_sessions.week_number IS 'Which week of the study plan this session belongs to (1-indexed)';
