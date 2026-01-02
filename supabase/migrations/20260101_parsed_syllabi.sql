-- Parsed Syllabi Table
-- Stores AI-extracted structured data from syllabus documents

CREATE TABLE IF NOT EXISTS parsed_syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  course_name TEXT,
  instructor TEXT,
  exam_dates JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  assignment_dates JSONB DEFAULT '[]',
  raw_extraction TEXT,
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one parsed syllabus per user+document combination
  CONSTRAINT unique_user_document UNIQUE (user_id, document_id)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_parsed_syllabi_user
  ON parsed_syllabi(user_id);

-- Index for document lookup
CREATE INDEX IF NOT EXISTS idx_parsed_syllabi_document
  ON parsed_syllabi(document_id)
  WHERE document_id IS NOT NULL;

-- RLS Policies
ALTER TABLE parsed_syllabi ENABLE ROW LEVEL SECURITY;

-- Users can view their own parsed syllabi
CREATE POLICY "Users can view own parsed syllabi"
  ON parsed_syllabi
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can insert their own parsed syllabi
CREATE POLICY "Users can insert own parsed syllabi"
  ON parsed_syllabi
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can update their own parsed syllabi
CREATE POLICY "Users can update own parsed syllabi"
  ON parsed_syllabi
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can delete their own parsed syllabi
CREATE POLICY "Users can delete own parsed syllabi"
  ON parsed_syllabi
  FOR DELETE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Service role has full access
CREATE POLICY "Service role has full access to parsed syllabi"
  ON parsed_syllabi
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parsed_syllabi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_parsed_syllabi_updated_at
  BEFORE UPDATE ON parsed_syllabi
  FOR EACH ROW
  EXECUTE FUNCTION update_parsed_syllabi_updated_at();

-- Add plan_data column to study_plans if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plans' AND column_name = 'plan_data'
  ) THEN
    ALTER TABLE study_plans ADD COLUMN plan_data JSONB DEFAULT '{}';
  END IF;
END
$$;

-- Create study_plan_sessions table for tracking individual sessions
CREATE TABLE IF NOT EXISTS study_plan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'mixed',
  estimated_minutes INTEGER NOT NULL DEFAULT 60,
  actual_minutes INTEGER,
  topics JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped', 'rescheduled')),
  is_buffer_day BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for study_plan_sessions
CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_plan
  ON study_plan_sessions(study_plan_id);

CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_user_date
  ON study_plan_sessions(user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_status
  ON study_plan_sessions(status);

-- RLS for study_plan_sessions
ALTER TABLE study_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study plan sessions"
  ON study_plan_sessions
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own study plan sessions"
  ON study_plan_sessions
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own study plan sessions"
  ON study_plan_sessions
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own study plan sessions"
  ON study_plan_sessions
  FOR DELETE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Service role has full access to study plan sessions"
  ON study_plan_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at for study_plan_sessions
CREATE TRIGGER trigger_study_plan_sessions_updated_at
  BEFORE UPDATE ON study_plan_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_parsed_syllabi_updated_at();

-- Comments for documentation
COMMENT ON TABLE parsed_syllabi IS 'AI-extracted structured data from syllabus documents';
COMMENT ON COLUMN parsed_syllabi.exam_dates IS 'Array of exam objects with name, date, weight, topics';
COMMENT ON COLUMN parsed_syllabi.topics IS 'Array of topic objects with name, chapters, weight, estimatedHours';
COMMENT ON COLUMN parsed_syllabi.assignment_dates IS 'Array of assignment objects with name and date';

COMMENT ON TABLE study_plan_sessions IS 'Individual study sessions within a study plan';
COMMENT ON COLUMN study_plan_sessions.topics IS 'Array of topic objects with name, minutes, activityType';
