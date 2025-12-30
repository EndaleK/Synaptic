-- Intelligent Study System Schema
-- Creates tables for document analysis, study plans, and content generation orchestration

-- ============================================
-- 1. DOCUMENT ANALYSIS TABLE
-- Stores AI-generated document intelligence
-- ============================================
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Complexity analysis
  complexity_score INTEGER CHECK (complexity_score BETWEEN 0 AND 100),
  complexity_factors JSONB DEFAULT '{}',
  -- Example: {technicalTerms: 50, mathFormulas: 20, avgSentenceLength: 25, conceptDensity: 0.15}

  -- Time estimates
  estimated_reading_minutes INTEGER,
  estimated_study_hours DECIMAL(6,2),
  word_count INTEGER,

  -- Topic breakdown with difficulty
  topics JSONB NOT NULL DEFAULT '[]',
  -- Example: [{id, title, description, pageRange: {start, end}, difficulty, estimatedMinutes, contentType}]

  -- Content type classification (percentages)
  content_types JSONB DEFAULT '{}',
  -- Example: {concepts: 40, procedures: 30, facts: 20, formulas: 10}

  -- Recommended modes based on content (per learning style)
  recommended_modes JSONB DEFAULT '{}',
  -- Example: {visual: ["mindmap", "flashcards"], auditory: ["podcast"], ...}

  -- Prerequisites (concepts user should know first)
  prerequisites JSONB DEFAULT '[]',

  -- Metadata
  analysis_model TEXT, -- Which AI model performed the analysis
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. STUDY PLANS TABLE
-- Master study plan linking exams to documents
-- ============================================
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Plan details
  title TEXT NOT NULL,
  description TEXT,

  -- Exam linkage
  exam_event_id BIGINT REFERENCES study_schedule(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL,
  exam_title TEXT, -- Cached from event for display

  -- Documents included in plan
  documents JSONB NOT NULL DEFAULT '[]',
  -- Example: [{documentId, documentName, estimatedHours, priority, topics: [...]}]

  -- Plan status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'abandoned')),

  -- Schedule parameters
  total_estimated_hours DECIMAL(6,2),
  hours_completed DECIMAL(6,2) DEFAULT 0,
  daily_target_hours DECIMAL(4,2) DEFAULT 2,
  start_date DATE,

  -- Learning style integration
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed')),
  mode_priorities JSONB DEFAULT '{"flashcards": 1, "podcast": 2, "mindmap": 3, "exam": 4}',

  -- Progress tracking
  mastery_threshold INTEGER DEFAULT 80, -- % correct to consider topic "mastered"
  weak_topics JSONB DEFAULT '[]', -- Topics needing more attention
  sessions_completed INTEGER DEFAULT 0,
  sessions_total INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. STUDY PLAN SESSIONS TABLE
-- Individual scheduled study sessions in a plan
-- ============================================
CREATE TABLE IF NOT EXISTS study_plan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME, -- Optional specific time
  estimated_minutes INTEGER NOT NULL,

  -- Session content
  mode TEXT NOT NULL CHECK (mode IN ('flashcards', 'podcast', 'mindmap', 'exam', 'reading', 'review', 'chat')),
  topic TEXT, -- Specific topic within document
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_name TEXT, -- Cached for display

  -- Session type based on spaced repetition
  session_type TEXT DEFAULT 'new' CHECK (session_type IN ('new', 'review', 'weak_topic', 'final_review')),
  review_number INTEGER DEFAULT 1, -- Which review cycle (1st, 2nd, 3rd...)

  -- Execution tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'rescheduled')),
  actual_minutes INTEGER,
  performance_score INTEGER CHECK (performance_score BETWEEN 0 AND 100), -- Based on mode performance

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CONTENT GENERATION JOBS TABLE
-- Track auto-generation status for orchestration
-- ============================================
CREATE TABLE IF NOT EXISTS content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,

  -- Job configuration
  content_type TEXT NOT NULL CHECK (content_type IN ('flashcards', 'podcast', 'mindmap', 'exam', 'study_guide', 'analysis')),
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = highest priority

  -- Options passed to generator
  generation_options JSONB DEFAULT '{}',
  -- Example: {questionCount: 20, difficulty: "mixed", topicFilter: [...]}

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),

  -- Result reference (ID of generated content)
  result_id UUID, -- References flashcard_sets.id, podcasts.id, mindmaps.id, exams.id, etc.
  result_type TEXT, -- Type of result for polymorphic reference

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Partial unique index to prevent duplicate active jobs
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_generation_jobs_active_unique
  ON content_generation_jobs(document_id, user_id, content_type)
  WHERE status IN ('pending', 'queued', 'processing');

-- ============================================
-- 5. EXTEND STUDY_SCHEDULE FOR EXAM DATES
-- ============================================
DO $$
BEGIN
  -- Add exam_date column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_schedule' AND column_name = 'exam_date'
  ) THEN
    ALTER TABLE study_schedule ADD COLUMN exam_date DATE;
  END IF;

  -- Add linked_plan_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_schedule' AND column_name = 'linked_plan_id'
  ) THEN
    ALTER TABLE study_schedule ADD COLUMN linked_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Document Analysis policies
DROP POLICY IF EXISTS "Users can view own document_analysis" ON document_analysis;
DROP POLICY IF EXISTS "Users can insert own document_analysis" ON document_analysis;
DROP POLICY IF EXISTS "Users can update own document_analysis" ON document_analysis;
DROP POLICY IF EXISTS "Users can delete own document_analysis" ON document_analysis;

CREATE POLICY "Users can view own document_analysis" ON document_analysis
  FOR SELECT USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own document_analysis" ON document_analysis
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own document_analysis" ON document_analysis
  FOR UPDATE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own document_analysis" ON document_analysis
  FOR DELETE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Study Plans policies
DROP POLICY IF EXISTS "Users can view own study_plans" ON study_plans;
DROP POLICY IF EXISTS "Users can insert own study_plans" ON study_plans;
DROP POLICY IF EXISTS "Users can update own study_plans" ON study_plans;
DROP POLICY IF EXISTS "Users can delete own study_plans" ON study_plans;

CREATE POLICY "Users can view own study_plans" ON study_plans
  FOR SELECT USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own study_plans" ON study_plans
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own study_plans" ON study_plans
  FOR UPDATE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own study_plans" ON study_plans
  FOR DELETE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Study Plan Sessions policies
DROP POLICY IF EXISTS "Users can view own study_plan_sessions" ON study_plan_sessions;
DROP POLICY IF EXISTS "Users can insert own study_plan_sessions" ON study_plan_sessions;
DROP POLICY IF EXISTS "Users can update own study_plan_sessions" ON study_plan_sessions;
DROP POLICY IF EXISTS "Users can delete own study_plan_sessions" ON study_plan_sessions;

CREATE POLICY "Users can view own study_plan_sessions" ON study_plan_sessions
  FOR SELECT USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own study_plan_sessions" ON study_plan_sessions
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own study_plan_sessions" ON study_plan_sessions
  FOR UPDATE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own study_plan_sessions" ON study_plan_sessions
  FOR DELETE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Content Generation Jobs policies
DROP POLICY IF EXISTS "Users can view own content_generation_jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can insert own content_generation_jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can update own content_generation_jobs" ON content_generation_jobs;
DROP POLICY IF EXISTS "Users can delete own content_generation_jobs" ON content_generation_jobs;

CREATE POLICY "Users can view own content_generation_jobs" ON content_generation_jobs
  FOR SELECT USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own content_generation_jobs" ON content_generation_jobs
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own content_generation_jobs" ON content_generation_jobs
  FOR UPDATE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own content_generation_jobs" ON content_generation_jobs
  FOR DELETE USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_user_id ON document_analysis(user_id);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_exam_date ON study_plans(exam_date);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);

CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_plan_id ON study_plan_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_user_id ON study_plan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_scheduled_date ON study_plan_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_status ON study_plan_sessions(status);

CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_document_id ON content_generation_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_user_id ON content_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_status ON content_generation_jobs(status);

-- ============================================
-- 8. TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_study_plans_updated_at ON study_plans;
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
