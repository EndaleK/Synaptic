-- Migration: Writing Mode Enhancements - AI Transparency & Writing-to-Learn Support
-- Description: Adds writing stages, AI contribution tracking, progress tracking, and collaboration features
-- Based on: 2024 research on AI writing assistants in education
-- Created: 2025-11-14

-- ============================================================================
-- ENHANCE ESSAYS TABLE
-- ============================================================================

-- Add writing stage support (writing-to-learn pedagogy)
ALTER TABLE essays
ADD COLUMN IF NOT EXISTS writing_stage TEXT DEFAULT 'drafting'
CHECK (writing_stage IN ('planning', 'drafting', 'revising', 'editing', 'publishing'));

-- Add AI contribution tracking (student agency & transparency)
ALTER TABLE essays
ADD COLUMN IF NOT EXISTS ai_contribution_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (ai_contribution_percentage >= 0 AND ai_contribution_percentage <= 100),
ADD COLUMN IF NOT EXISTS original_word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_assisted_word_count INTEGER DEFAULT 0;

-- Add writing goals and progress tracking
ALTER TABLE essays
ADD COLUMN IF NOT EXISTS writing_goals JSONB DEFAULT '{}'::jsonb;
-- Structure: { target_word_count?: number, target_date?: string, daily_word_count_goal?: number }

-- Add submission metadata
ALTER TABLE essays
ADD COLUMN IF NOT EXISTS submission_metadata JSONB DEFAULT '{}'::jsonb;
-- Structure: { submitted_at?: string, submitted_to?: string, ai_disclosure?: string, turnitin_score?: number }

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_essays_writing_stage ON essays(writing_stage);
CREATE INDEX IF NOT EXISTS idx_essays_ai_contribution ON essays(ai_contribution_percentage);

-- Comments
COMMENT ON COLUMN essays.writing_stage IS 'Current stage in writing-to-learn process (planning → drafting → revising → editing → publishing)';
COMMENT ON COLUMN essays.ai_contribution_percentage IS 'Percentage of content created/modified using AI assistance (0-100)';
COMMENT ON COLUMN essays.original_word_count IS 'Number of words written without AI assistance';
COMMENT ON COLUMN essays.ai_assisted_word_count IS 'Number of words written with AI assistance';
COMMENT ON COLUMN essays.writing_goals IS 'Student-set writing goals (word count targets, deadlines)';
COMMENT ON COLUMN essays.submission_metadata IS 'Submission tracking (LMS platform, AI disclosure statement, plagiarism scores)';

-- ============================================================================
-- WRITING SESSIONS TABLE (Activity Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS writing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  writing_stage TEXT NOT NULL CHECK (writing_stage IN ('planning', 'drafting', 'revising', 'editing', 'publishing')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  words_written INTEGER DEFAULT 0,
  ai_suggestions_accepted INTEGER DEFAULT 0,
  ai_suggestions_dismissed INTEGER DEFAULT 0,
  duration_seconds INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INTEGER) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_writing_sessions_essay_id ON writing_sessions(essay_id);
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_writing_sessions_started_at ON writing_sessions(started_at DESC);

-- RLS policies
ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own writing sessions" ON writing_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own writing sessions" ON writing_sessions
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update own writing sessions" ON writing_sessions
  FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

COMMENT ON TABLE writing_sessions IS 'Tracks individual writing sessions for analytics and progress monitoring';
COMMENT ON COLUMN writing_sessions.duration_seconds IS 'Auto-calculated session duration in seconds';

-- ============================================================================
-- WRITING MILESTONES TABLE (Gamification & Motivation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS writing_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES essays(id) ON DELETE SET NULL, -- NULL for global milestones
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('word_count', 'stage_complete', 'streak', 'first_draft', 'revision_count', 'ai_independence', 'session_duration')),
  metadata JSONB DEFAULT '{}'::jsonb, -- { words?: number, stage?: string, streak_days?: number, etc. }
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_writing_milestones_user_id ON writing_milestones(user_id);
CREATE INDEX idx_writing_milestones_essay_id ON writing_milestones(essay_id);
CREATE INDEX idx_writing_milestones_type ON writing_milestones(milestone_type);
CREATE INDEX idx_writing_milestones_achieved_at ON writing_milestones(achieved_at DESC);

-- RLS policies
ALTER TABLE writing_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON writing_milestones
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own milestones" ON writing_milestones
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

COMMENT ON TABLE writing_milestones IS 'Tracks writing achievements for motivation and engagement';
COMMENT ON COLUMN writing_milestones.milestone_type IS 'Type of achievement (word_count, stage_complete, streak, etc.)';
COMMENT ON COLUMN writing_milestones.metadata IS 'Achievement-specific data (words written, streak days, stage name, etc.)';

-- ============================================================================
-- COMMENTS TABLE (Peer Review & Instructor Feedback)
-- ============================================================================
CREATE TABLE IF NOT EXISTS essay_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  commenter_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES essay_comments(id) ON DELETE CASCADE, -- For threaded replies
  text_selection_start INTEGER, -- Character offset for highlighted text
  text_selection_end INTEGER,   -- Character offset for highlighted text
  comment_text TEXT NOT NULL,
  status TEXT DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_essay_comments_essay_id ON essay_comments(essay_id);
CREATE INDEX idx_essay_comments_commenter_id ON essay_comments(commenter_id);
CREATE INDEX idx_essay_comments_parent_id ON essay_comments(parent_comment_id);
CREATE INDEX idx_essay_comments_status ON essay_comments(status);
CREATE INDEX idx_essay_comments_created_at ON essay_comments(created_at DESC);

-- RLS policies
ALTER TABLE essay_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on essays they own or comments they made
CREATE POLICY "Users can view relevant comments" ON essay_comments
  FOR SELECT USING (
    commenter_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    OR
    essay_id IN (SELECT id FROM essays WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'))
  );

-- Users can insert comments on any essay they have access to
CREATE POLICY "Users can insert comments" ON essay_comments
  FOR INSERT WITH CHECK (commenter_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can update their own comments or resolve comments on their essays
CREATE POLICY "Users can update relevant comments" ON essay_comments
  FOR UPDATE USING (
    commenter_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    OR
    essay_id IN (SELECT id FROM essays WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'))
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON essay_comments
  FOR DELETE USING (commenter_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_essay_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER essay_comments_updated_at
  BEFORE UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_comments_updated_at();

COMMENT ON TABLE essay_comments IS 'Stores comments and feedback on essays (peer review, instructor feedback)';
COMMENT ON COLUMN essay_comments.parent_comment_id IS 'For threaded replies (NULL for top-level comments)';
COMMENT ON COLUMN essay_comments.text_selection_start IS 'Character offset where comment starts (for inline comments)';
COMMENT ON COLUMN essay_comments.text_selection_end IS 'Character offset where comment ends (for inline comments)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate AI contribution percentage
CREATE OR REPLACE FUNCTION calculate_ai_contribution(essay_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_words INTEGER;
  ai_words INTEGER;
BEGIN
  SELECT word_count, ai_assisted_word_count
  INTO total_words, ai_words
  FROM essays
  WHERE id = essay_id_param;

  IF total_words = 0 THEN
    RETURN 0.00;
  END IF;

  RETURN ROUND((ai_words::DECIMAL / total_words::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get current writing streak
CREATE OR REPLACE FUNCTION get_writing_streak(user_id_param BIGINT)
RETURNS INTEGER AS $$
DECLARE
  streak_count INTEGER := 0;
  current_date_check DATE := CURRENT_DATE;
  found_session BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM writing_sessions
      WHERE user_id = user_id_param
      AND DATE(started_at) = current_date_check
    ) INTO found_session;

    IF NOT found_session THEN
      EXIT;
    END IF;

    streak_count := streak_count + 1;
    current_date_check := current_date_check - INTERVAL '1 day';
  END LOOP;

  RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_ai_contribution IS 'Calculates percentage of AI-assisted content in an essay';
COMMENT ON FUNCTION get_writing_streak IS 'Calculates current writing streak in days';

-- ============================================================================
-- SAMPLE DATA (For testing - remove in production)
-- ============================================================================
-- Uncomment below to test milestone types and metadata structures:

-- INSERT INTO writing_milestones (user_id, milestone_type, metadata) VALUES
-- (1, 'word_count', '{"words": 1000, "achievement": "First 1000 words"}'::jsonb),
-- (1, 'streak', '{"streak_days": 7, "achievement": "7-day writing streak"}'::jsonb),
-- (1, 'stage_complete', '{"stage": "drafting", "achievement": "Completed first draft"}'::jsonb);

