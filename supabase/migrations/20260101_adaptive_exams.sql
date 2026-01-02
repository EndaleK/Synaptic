-- Adaptive Exams Migration
-- Adds columns to support adaptive difficulty exams

-- Add adaptive exam columns to exam_attempts table
ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS adaptive_state TEXT,
ADD COLUMN IF NOT EXISTS adaptive_questions UUID[],
ADD COLUMN IF NOT EXISTS topic_scores JSONB DEFAULT '{}';

-- Add index for adaptive exams
CREATE INDEX IF NOT EXISTS idx_exam_attempts_adaptive
  ON exam_attempts(user_id, is_adaptive)
  WHERE is_adaptive = TRUE;

-- Add weighted_score column for adaptive scoring
ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS weighted_score NUMERIC(5,2);

-- Create cram_sessions table for "Week Before Exam" mode
CREATE TABLE IF NOT EXISTS cram_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  focus_topics JSONB DEFAULT '[]',
  daily_progress JSONB DEFAULT '{}',
  total_minutes_studied INTEGER DEFAULT 0,
  flashcards_reviewed INTEGER DEFAULT 0,
  mini_exams_completed INTEGER DEFAULT 0,
  weak_topics_improved JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user cram sessions
CREATE INDEX IF NOT EXISTS idx_cram_sessions_user
  ON cram_sessions(user_id, status);

-- Index for active cram sessions by exam date
CREATE INDEX IF NOT EXISTS idx_cram_sessions_exam_date
  ON cram_sessions(user_id, exam_date)
  WHERE status = 'active';

-- RLS for cram_sessions
ALTER TABLE cram_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own cram sessions" ON cram_sessions;
DROP POLICY IF EXISTS "Users can insert own cram sessions" ON cram_sessions;
DROP POLICY IF EXISTS "Users can update own cram sessions" ON cram_sessions;
DROP POLICY IF EXISTS "Service role has full access to cram sessions" ON cram_sessions;

CREATE POLICY "Users can view own cram sessions"
  ON cram_sessions
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own cram sessions"
  ON cram_sessions
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own cram sessions"
  ON cram_sessions
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Service role has full access to cram sessions"
  ON cram_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_cram_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cram_sessions_updated_at
  BEFORE UPDATE ON cram_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_cram_sessions_updated_at();

-- Comments
COMMENT ON TABLE cram_sessions IS 'Tracks intensive study sessions before exams (cram mode)';
COMMENT ON COLUMN cram_sessions.focus_topics IS 'Array of weak topic names to focus on';
COMMENT ON COLUMN cram_sessions.daily_progress IS 'Object with date keys and daily stats';

COMMENT ON COLUMN exam_attempts.is_adaptive IS 'Whether this attempt uses adaptive difficulty';
COMMENT ON COLUMN exam_attempts.adaptive_state IS 'Serialized adaptive engine state';
COMMENT ON COLUMN exam_attempts.topic_scores IS 'Per-topic performance breakdown';
