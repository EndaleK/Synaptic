-- Study Guide Schedule Sync Migration
-- Links study_plan_sessions to study_guides and tracks schedule sync status

-- ============================================================================
-- 1. Add study_guide_id to study_plan_sessions
-- Links generated sessions back to the Study Guide they came from
-- ============================================================================

ALTER TABLE study_plan_sessions
  ADD COLUMN IF NOT EXISTS study_guide_id UUID REFERENCES study_guides(id) ON DELETE SET NULL;

-- Index for quick lookups by study guide
CREATE INDEX IF NOT EXISTS idx_study_plan_sessions_study_guide
  ON study_plan_sessions(study_guide_id)
  WHERE study_guide_id IS NOT NULL;

-- ============================================================================
-- 2. Add schedule sync tracking to study_guides
-- Tracks whether a study guide has been synced to the planner calendar
-- ============================================================================

ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS schedule_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS synced_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Index for finding unsynced guides
CREATE INDEX IF NOT EXISTS idx_study_guides_schedule_synced
  ON study_guides(schedule_synced, user_id)
  WHERE schedule_synced = FALSE;

-- ============================================================================
-- 3. Add page range tracking to study_plan_sessions
-- For topic-specific content generation from page ranges
-- ============================================================================

ALTER TABLE study_plan_sessions
  ADD COLUMN IF NOT EXISTS page_start INTEGER,
  ADD COLUMN IF NOT EXISTS page_end INTEGER;

-- ============================================================================
-- 4. Function to sync study guide milestones to sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_study_guide_to_sessions(
  p_study_guide_id UUID,
  p_study_plan_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_guide RECORD;
  v_milestone JSONB;
  v_session_date DATE;
  v_sessions_created INTEGER := 0;
  v_day_offset INTEGER;
  v_user_id BIGINT;
  v_document_id UUID;
BEGIN
  -- Get the study guide
  SELECT
    sg.id, sg.content, sg.user_id, sg.document_id
  INTO v_guide
  FROM study_guides sg
  WHERE sg.id = p_study_guide_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Study guide not found: %', p_study_guide_id;
  END IF;

  v_user_id := v_guide.user_id;
  v_document_id := v_guide.document_id;

  -- Extract milestones from study guide content
  -- Content structure: { studySchedule: { milestones: [{day: 1, topic: "...", activities: [...]}] } }
  FOR v_milestone IN SELECT jsonb_array_elements(v_guide.content->'studySchedule'->'milestones')
  LOOP
    v_day_offset := (v_milestone->>'day')::INTEGER - 1; -- day 1 is start_date
    v_session_date := p_start_date + v_day_offset;

    -- Skip weekends (optional - based on common study patterns)
    -- If you want to include weekends, remove this check
    -- IF EXTRACT(DOW FROM v_session_date) IN (0, 6) THEN
    --   v_session_date := v_session_date + INTERVAL '1 day';
    -- END IF;

    -- Insert session for this milestone
    INSERT INTO study_plan_sessions (
      study_plan_id,
      user_id,
      document_id,
      study_guide_id,
      scheduled_date,
      topic,
      session_type,
      estimated_minutes,
      status,
      mode
    )
    VALUES (
      p_study_plan_id,
      v_user_id,
      v_document_id,
      p_study_guide_id,
      v_session_date,
      v_milestone->>'topic',
      'study',
      COALESCE((v_milestone->'estimatedMinutes')::INTEGER, 45),
      'scheduled',
      'flashcards' -- Default mode, can be changed per activity
    )
    ON CONFLICT DO NOTHING;

    v_sessions_created := v_sessions_created + 1;
  END LOOP;

  -- Mark study guide as synced
  UPDATE study_guides
  SET
    schedule_synced = TRUE,
    synced_plan_id = p_study_plan_id,
    synced_at = NOW()
  WHERE id = p_study_guide_id;

  RETURN v_sessions_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Add current_plan_session_id to usePomodoroStore tracking
-- For linking timer sessions to plan sessions
-- ============================================================================

-- This is handled in frontend Zustand store, no DB changes needed

-- ============================================================================
-- Done!
-- ============================================================================
