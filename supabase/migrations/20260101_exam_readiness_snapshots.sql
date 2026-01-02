-- Exam Readiness Snapshots Table
-- Stores historical readiness scores for trend tracking

CREATE TABLE IF NOT EXISTS exam_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  readiness_score INTEGER NOT NULL CHECK (readiness_score >= 0 AND readiness_score <= 100),
  topic_scores JSONB DEFAULT '{}',
  factors JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching user's readiness history
CREATE INDEX IF NOT EXISTS idx_exam_readiness_user_date
  ON exam_readiness_snapshots(user_id, calculated_at DESC);

-- Index for exam-specific readiness
CREATE INDEX IF NOT EXISTS idx_exam_readiness_exam
  ON exam_readiness_snapshots(exam_id, calculated_at DESC)
  WHERE exam_id IS NOT NULL;

-- RLS Policies
ALTER TABLE exam_readiness_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only see their own readiness data
CREATE POLICY "Users can view own readiness snapshots"
  ON exam_readiness_snapshots
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can insert their own readiness data
CREATE POLICY "Users can insert own readiness snapshots"
  ON exam_readiness_snapshots
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Service role can do anything (for API routes)
CREATE POLICY "Service role has full access to readiness snapshots"
  ON exam_readiness_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE exam_readiness_snapshots IS 'Historical exam readiness scores for trend tracking';
COMMENT ON COLUMN exam_readiness_snapshots.readiness_score IS 'Overall readiness score 0-100';
COMMENT ON COLUMN exam_readiness_snapshots.topic_scores IS 'Per-topic scores as JSON object';
COMMENT ON COLUMN exam_readiness_snapshots.factors IS 'Breakdown of score factors (coverage, mastery, exam, consistency)';
