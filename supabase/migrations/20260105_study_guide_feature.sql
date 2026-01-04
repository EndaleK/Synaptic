-- Study Guide Feature Migration
-- Adds tables and columns to support integrated study guide with auto-generated content

-- ============================================================================
-- 1. New Table: study_guide_days
-- Stores day-by-day breakdown of study content for each plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS study_guide_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL DEFAULT 0, -- 0=Sunday, 1=Monday, etc.

  -- Topics for the day (derived from sessions)
  topics JSONB NOT NULL DEFAULT '[]',
  -- Format: [{topicId, title, documentId, documentName, pageRange: {start, end}, estimatedMinutes}]

  -- Overall status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'partial', 'skipped')),
  estimated_total_minutes INTEGER DEFAULT 0,
  actual_minutes_spent INTEGER DEFAULT 0,

  -- Content availability flags (quick lookup)
  has_flashcards BOOLEAN DEFAULT false,
  has_podcast BOOLEAN DEFAULT false,
  has_mindmap BOOLEAN DEFAULT false,
  has_daily_quiz BOOLEAN DEFAULT false,
  has_chat BOOLEAN DEFAULT false,

  -- Content IDs for quick reference
  flashcard_set_id UUID,
  podcast_id UUID,
  mindmap_id UUID,
  daily_quiz_id UUID,

  -- Timestamps
  generated_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_id, date)
);

-- Indexes for study_guide_days
CREATE INDEX IF NOT EXISTS idx_study_guide_days_plan ON study_guide_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_guide_days_user ON study_guide_days(user_id);
CREATE INDEX IF NOT EXISTS idx_study_guide_days_date ON study_guide_days(date);
CREATE INDEX IF NOT EXISTS idx_study_guide_days_status ON study_guide_days(status);
CREATE INDEX IF NOT EXISTS idx_study_guide_days_plan_date ON study_guide_days(plan_id, date);

-- RLS Policies for study_guide_days
ALTER TABLE study_guide_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study guide days"
  ON study_guide_days FOR SELECT
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert own study guide days"
  ON study_guide_days FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update own study guide days"
  ON study_guide_days FOR UPDATE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can delete own study guide days"
  ON study_guide_days FOR DELETE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- ============================================================================
-- 2. Modify study_plan_sessions: Add chapter tracking
-- ============================================================================

ALTER TABLE study_plan_sessions
  ADD COLUMN IF NOT EXISTS chapter_id TEXT,
  ADD COLUMN IF NOT EXISTS chapter_title TEXT,
  ADD COLUMN IF NOT EXISTS is_chapter_final BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sessions_chapter ON study_plan_sessions(study_plan_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_sessions_chapter_final ON study_plan_sessions(study_plan_id, is_chapter_final) WHERE is_chapter_final = true;

-- ============================================================================
-- 3. Modify study_session_content: Add guide_day reference
-- ============================================================================

ALTER TABLE study_session_content
  ADD COLUMN IF NOT EXISTS guide_day_id UUID REFERENCES study_guide_days(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_content_guide_day ON study_session_content(guide_day_id);

-- ============================================================================
-- 4. Modify exams: Add exam_type, chapter tracking, study_plan reference
-- ============================================================================

-- First check if exam_type column exists, if not add it with constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'exam_type') THEN
    ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'custom';
    ALTER TABLE exams ADD CONSTRAINT exams_exam_type_check
      CHECK (exam_type IN ('daily_quiz', 'weekly_exam', 'chapter_completion', 'custom', 'mock', 'practice'));
  END IF;
END $$;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS chapter_id TEXT,
  ADD COLUMN IF NOT EXISTS chapter_title TEXT,
  ADD COLUMN IF NOT EXISTS study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guide_day_id UUID REFERENCES study_guide_days(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_exams_study_plan ON exams(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_exams_chapter ON exams(study_plan_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_exams_guide_day ON exams(guide_day_id);

-- ============================================================================
-- 5. New Table: content_generation_queue
-- For background processing of auto-generated content
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  guide_day_id UUID REFERENCES study_guide_days(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_plan_sessions(id) ON DELETE CASCADE,

  -- Generation details
  content_type TEXT NOT NULL CHECK (content_type IN ('flashcards', 'podcast', 'mindmap', 'daily_quiz', 'chapter_exam', 'chat_context')),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  topic_focus TEXT,
  topic_pages JSONB, -- {startPage, endPage, sections}

  -- Queue management
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=highest, 10=lowest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Results
  result_id UUID, -- ID of generated content (flashcard_set_id, podcast_id, etc.)
  result_type TEXT, -- Type of result for polymorphic lookup
  error_message TEXT,

  -- Timestamps
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates for same guide_day + content_type
  UNIQUE(guide_day_id, content_type)
);

-- Indexes for content_generation_queue
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON content_generation_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_generation_queue_user ON content_generation_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_priority ON content_generation_queue(priority, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_generation_queue_guide_day ON content_generation_queue(guide_day_id);

-- RLS Policies for content_generation_queue
ALTER TABLE content_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation queue"
  ON content_generation_queue FOR SELECT
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert own generation queue"
  ON content_generation_queue FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update own generation queue"
  ON content_generation_queue FOR UPDATE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can delete own generation queue"
  ON content_generation_queue FOR DELETE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- ============================================================================
-- 6. Trigger: Auto-update updated_at for study_guide_days
-- ============================================================================

CREATE OR REPLACE FUNCTION update_study_guide_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_study_guide_days_updated_at ON study_guide_days;
CREATE TRIGGER trigger_study_guide_days_updated_at
  BEFORE UPDATE ON study_guide_days
  FOR EACH ROW
  EXECUTE FUNCTION update_study_guide_days_updated_at();

-- ============================================================================
-- 7. Function: Get study guide for a plan with week/day breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_study_guide_breakdown(p_plan_id UUID)
RETURNS TABLE (
  week_number INTEGER,
  week_start DATE,
  week_end DATE,
  days JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH week_days AS (
    SELECT
      sgd.week_number,
      MIN(sgd.date) as week_start,
      MAX(sgd.date) as week_end,
      jsonb_agg(
        jsonb_build_object(
          'id', sgd.id,
          'date', sgd.date,
          'dayOfWeek', sgd.day_of_week,
          'status', sgd.status,
          'topics', sgd.topics,
          'estimatedMinutes', sgd.estimated_total_minutes,
          'hasFlashcards', sgd.has_flashcards,
          'hasPodcast', sgd.has_podcast,
          'hasMindmap', sgd.has_mindmap,
          'hasDailyQuiz', sgd.has_daily_quiz,
          'hasChat', sgd.has_chat,
          'flashcardSetId', sgd.flashcard_set_id,
          'podcastId', sgd.podcast_id,
          'mindmapId', sgd.mindmap_id,
          'dailyQuizId', sgd.daily_quiz_id,
          'generatedAt', sgd.generated_at
        ) ORDER BY sgd.date
      ) as days
    FROM study_guide_days sgd
    WHERE sgd.plan_id = p_plan_id
    GROUP BY sgd.week_number
    ORDER BY sgd.week_number
  )
  SELECT
    wd.week_number,
    wd.week_start,
    wd.week_end,
    wd.days
  FROM week_days wd;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Function: Get today's content generation status for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_today_content_status(p_user_id BIGINT)
RETURNS TABLE (
  plan_id UUID,
  plan_title TEXT,
  guide_day_id UUID,
  guide_day_date DATE,
  overall_status TEXT,
  content_statuses JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id as plan_id,
    sp.title as plan_title,
    sgd.id as guide_day_id,
    sgd.date as guide_day_date,
    sgd.status as overall_status,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'contentType', cgq.content_type,
          'status', cgq.status,
          'progress', CASE
            WHEN cgq.status = 'completed' THEN 100
            WHEN cgq.status = 'processing' THEN 50
            ELSE 0
          END,
          'resultId', cgq.result_id,
          'error', cgq.error_message
        )
      )
      FROM content_generation_queue cgq
      WHERE cgq.guide_day_id = sgd.id
    ) as content_statuses
  FROM study_plans sp
  JOIN study_guide_days sgd ON sgd.plan_id = sp.id AND sgd.date = CURRENT_DATE
  WHERE sp.user_id = p_user_id
    AND sp.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Done!
-- ============================================================================
