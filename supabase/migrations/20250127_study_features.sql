-- Create study features tables for Pomodoro timer, study sessions, and calendar
-- This migration depends on user_profiles table being created first

-- Ensure user_profiles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'user_profiles table must exist before creating study features';
  END IF;
END $$;

-- ============================================================================
-- Table: user_study_preferences
-- Purpose: Store user preferences for Pomodoro timer and study settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_study_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Pomodoro Settings
  pomodoro_work_minutes INTEGER DEFAULT 25 CHECK (pomodoro_work_minutes > 0 AND pomodoro_work_minutes <= 120),
  pomodoro_short_break_minutes INTEGER DEFAULT 5 CHECK (pomodoro_short_break_minutes > 0 AND pomodoro_short_break_minutes <= 60),
  pomodoro_long_break_minutes INTEGER DEFAULT 15 CHECK (pomodoro_long_break_minutes > 0 AND pomodoro_long_break_minutes <= 60),
  pomodoro_sessions_until_long_break INTEGER DEFAULT 4 CHECK (pomodoro_sessions_until_long_break > 0 AND pomodoro_sessions_until_long_break <= 10),
  auto_start_breaks BOOLEAN DEFAULT true,
  auto_start_pomodoros BOOLEAN DEFAULT false,

  -- Notification Settings
  notification_sound_enabled BOOLEAN DEFAULT true,
  break_reminders_enabled BOOLEAN DEFAULT true,
  eye_break_interval_minutes INTEGER DEFAULT 20 CHECK (eye_break_interval_minutes >= 10 AND eye_break_interval_minutes <= 60),

  -- Daily Goals
  daily_study_goal_minutes INTEGER DEFAULT 120 CHECK (daily_study_goal_minutes > 0 AND daily_study_goal_minutes <= 1440),
  daily_flashcard_review_goal INTEGER DEFAULT 20 CHECK (daily_flashcard_review_goal > 0 AND daily_flashcard_review_goal <= 500),

  -- Study Schedule Preferences
  preferred_study_start_time TIME,
  preferred_study_end_time TIME,
  enable_study_reminders BOOLEAN DEFAULT true,
  enable_review_reminders BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One preferences record per user
  UNIQUE (user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_study_preferences_user_id
  ON user_study_preferences(user_id);

-- ============================================================================
-- Table: study_sessions
-- Purpose: Track study sessions for analytics and Pomodoro tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Session Details
  session_type TEXT NOT NULL CHECK (session_type IN ('pomodoro', 'custom', 'review')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  planned_duration_minutes INTEGER CHECK (planned_duration_minutes > 0),
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id
  ON study_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time
  ON study_sessions(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date
  ON study_sessions(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_document
  ON study_sessions(document_id);

-- ============================================================================
-- Table: study_schedule
-- Purpose: Store calendar events for study planning
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_schedule (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN ('study_session', 'exam', 'assignment', 'review', 'break', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,

  -- Optional Fields
  location TEXT,
  color TEXT DEFAULT '#3b82f6',

  -- Recurrence (for future implementation)
  recurrence TEXT, -- JSON or RRULE format

  -- Google Calendar Integration
  google_event_id TEXT,

  -- Status
  completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validation
  CHECK (end_time > start_time)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_study_schedule_user_id
  ON study_schedule(user_id);

CREATE INDEX IF NOT EXISTS idx_study_schedule_start_time
  ON study_schedule(start_time);

CREATE INDEX IF NOT EXISTS idx_study_schedule_user_date
  ON study_schedule(user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_study_schedule_event_type
  ON study_schedule(event_type);

CREATE INDEX IF NOT EXISTS idx_study_schedule_google_event_id
  ON study_schedule(google_event_id)
  WHERE google_event_id IS NOT NULL;

-- ============================================================================
-- Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_study_preferences
CREATE POLICY "Users can view their own study preferences"
  ON user_study_preferences
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own study preferences"
  ON user_study_preferences
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update their own study preferences"
  ON user_study_preferences
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can delete their own study preferences"
  ON user_study_preferences
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for study_sessions
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for study_schedule
CREATE POLICY "Users can view their own study schedule"
  ON study_schedule
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own study schedule"
  ON study_schedule
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update their own study schedule"
  ON study_schedule
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can delete their own study schedule"
  ON study_schedule
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ============================================================================
-- Updated_at Triggers
-- ============================================================================

-- Trigger for user_study_preferences
CREATE OR REPLACE FUNCTION update_user_study_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_study_preferences_updated_at
  BEFORE UPDATE ON user_study_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_study_preferences_updated_at();

-- Trigger for study_sessions
CREATE OR REPLACE FUNCTION update_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sessions_updated_at();

-- Trigger for study_schedule
CREATE OR REPLACE FUNCTION update_study_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_schedule_updated_at
  BEFORE UPDATE ON study_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_study_schedule_updated_at();

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Study features tables created successfully!';
  RAISE NOTICE '  - user_study_preferences: User Pomodoro and study settings';
  RAISE NOTICE '  - study_sessions: Study session tracking and analytics';
  RAISE NOTICE '  - study_schedule: Calendar events and planning';
  RAISE NOTICE 'All tables have RLS policies and updated_at triggers enabled.';
END $$;
