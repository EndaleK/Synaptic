-- ============================================================================
-- STUDY SCHEDULER & CALENDAR MIGRATION
-- ============================================================================
-- Adds study scheduling, Pomodoro tracking, and spaced repetition features

-- ============================================================================
-- STUDY SESSIONS TABLE (Pomodoro Timer Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Optional: link to specific document
  session_type TEXT NOT NULL CHECK (session_type IN ('pomodoro', 'custom', 'review')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- Actual duration (calculated on completion)
  planned_duration_minutes INTEGER DEFAULT 25, -- Intended duration
  completed BOOLEAN DEFAULT FALSE,
  breaks_taken INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STUDY SCHEDULE TABLE (Calendar Events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('study_session', 'exam', 'assignment', 'review', 'break', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT DEFAULT '#3b82f6', -- For calendar color coding
  recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  reminder_minutes INTEGER DEFAULT 15, -- Reminder before event (in minutes)
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STUDY GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily_study_minutes', 'weekly_sessions', 'flashcard_reviews', 'streak_days', 'custom')),
  title TEXT NOT NULL,
  target_value INTEGER NOT NULL, -- Target number (e.g., 120 minutes, 10 sessions)
  current_value INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- REVIEW QUEUE TABLE (Spaced Repetition using SM-2 Algorithm)
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  ease_factor DECIMAL(4,2) DEFAULT 2.5, -- SM-2 ease factor (starts at 2.5)
  interval_days INTEGER DEFAULT 1, -- Days until next review
  repetitions INTEGER DEFAULT 0, -- Number of successful repetitions
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  quality_rating INTEGER CHECK (quality_rating >= 0 AND quality_rating <= 5), -- 0-5 scale (SM-2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flashcard_id, user_id)
);

-- ============================================================================
-- USER STUDY PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_study_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Pomodoro Settings
  pomodoro_work_minutes INTEGER DEFAULT 25,
  pomodoro_short_break_minutes INTEGER DEFAULT 5,
  pomodoro_long_break_minutes INTEGER DEFAULT 15,
  pomodoro_sessions_until_long_break INTEGER DEFAULT 4,
  auto_start_breaks BOOLEAN DEFAULT FALSE,
  auto_start_pomodoros BOOLEAN DEFAULT FALSE,

  -- Break Reminder Settings (20-20-20 Rule)
  break_reminders_enabled BOOLEAN DEFAULT TRUE,
  eye_break_interval_minutes INTEGER DEFAULT 20,
  eye_break_duration_seconds INTEGER DEFAULT 20,
  stretch_reminders_enabled BOOLEAN DEFAULT TRUE,

  -- Notification Settings
  notification_sound_enabled BOOLEAN DEFAULT TRUE,
  notification_types JSONB DEFAULT '{"study_reminders": true, "break_alerts": true, "due_flashcards": true, "streak_reminders": true}'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Study Settings
  daily_study_goal_minutes INTEGER DEFAULT 120,
  daily_flashcard_review_goal INTEGER DEFAULT 20,
  preferred_study_time TIME, -- Preferred time of day to study

  -- Calendar Settings
  calendar_week_starts_on INTEGER DEFAULT 0 CHECK (calendar_week_starts_on >= 0 AND calendar_week_starts_on <= 6), -- 0 = Sunday
  calendar_default_view TEXT DEFAULT 'week' CHECK (calendar_default_view IN ('day', 'week', 'month')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, start_time);
CREATE INDEX idx_study_schedule_user_id ON study_schedule(user_id);
CREATE INDEX idx_study_schedule_user_date_range ON study_schedule(user_id, start_time, end_time);
CREATE INDEX idx_study_goals_user_status ON study_goals(user_id, status);
CREATE INDEX idx_review_queue_user_due ON review_queue(user_id, due_date);
CREATE INDEX idx_review_queue_flashcard ON review_queue(flashcard_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_preferences ENABLE ROW LEVEL SECURITY;

-- Study Sessions Policies
CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Study Schedule Policies
CREATE POLICY "Users can view own schedule" ON study_schedule
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own schedule" ON study_schedule
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Study Goals Policies
CREATE POLICY "Users can view own goals" ON study_goals
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own goals" ON study_goals
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Review Queue Policies
CREATE POLICY "Users can view own review queue" ON review_queue
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own review queue" ON review_queue
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- User Study Preferences Policies
CREATE POLICY "Users can view own preferences" ON user_study_preferences
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own preferences" ON user_study_preferences
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_study_schedule_updated_at BEFORE UPDATE ON study_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON study_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_queue_updated_at BEFORE UPDATE ON review_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_study_preferences_updated_at BEFORE UPDATE ON user_study_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View for today's due flashcards
CREATE OR REPLACE VIEW due_flashcards_today AS
SELECT
  rq.*,
  f.front,
  f.back,
  f.difficulty,
  d.file_name as document_name
FROM review_queue rq
JOIN flashcards f ON rq.flashcard_id = f.id
LEFT JOIN documents d ON f.document_id = d.id
WHERE rq.due_date <= CURRENT_DATE
ORDER BY rq.due_date ASC, rq.created_at ASC;

-- View for study streak calculation
CREATE OR REPLACE VIEW user_study_streaks AS
SELECT
  user_id,
  COUNT(DISTINCT DATE(start_time)) as total_days_studied,
  MAX(DATE(start_time)) as last_study_date,
  (CURRENT_DATE - MAX(DATE(start_time))) as days_since_last_study
FROM study_sessions
WHERE completed = TRUE
GROUP BY user_id;
