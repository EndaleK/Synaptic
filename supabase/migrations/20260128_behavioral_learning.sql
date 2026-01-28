-- Migration: Behavioral Learning Style System
-- Tracks user behavior to infer learning style preferences and blend with quiz results

-- ============================================================================
-- USER BEHAVIOR SCORES TABLE
-- ============================================================================
-- Stores calculated behavioral VARK scores based on mode usage patterns
-- Note: user_profiles.id is BIGINT in the live database (not UUID as in schema.sql)
CREATE TABLE IF NOT EXISTS user_behavior_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,

  -- Behavioral VARK scores (0-100 scale)
  behavioral_visual INTEGER DEFAULT 50 CHECK (behavioral_visual BETWEEN 0 AND 100),
  behavioral_auditory INTEGER DEFAULT 50 CHECK (behavioral_auditory BETWEEN 0 AND 100),
  behavioral_kinesthetic INTEGER DEFAULT 50 CHECK (behavioral_kinesthetic BETWEEN 0 AND 100),
  behavioral_reading_writing INTEGER DEFAULT 50 CHECK (behavioral_reading_writing BETWEEN 0 AND 100),

  -- Confidence score (0-1, increases with more data)
  behavioral_confidence DECIMAL(4,3) DEFAULT 0.0 CHECK (behavioral_confidence BETWEEN 0 AND 1),

  -- Mode engagement metrics (JSON structure)
  -- Format: { "mindmap": { "sessions": 5, "totalMinutes": 120, "completionRate": 0.85 }, ... }
  mode_engagement JSONB DEFAULT '{}'::jsonb,

  -- Calculated dominant style based on behavior
  behavioral_dominant_style TEXT CHECK (behavioral_dominant_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed')),

  -- Total sessions tracked (for confidence calculation)
  total_sessions INTEGER DEFAULT 0,

  -- Timestamps
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODE SELECTION EVENTS TABLE
-- ============================================================================
-- Tracks individual mode selection events for behavioral analysis
CREATE TABLE IF NOT EXISTS mode_selection_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Mode selected (matches study tool IDs)
  mode TEXT NOT NULL CHECK (mode IN (
    'flashcards', 'chat', 'podcast', 'quick-summary', 'exam',
    'mindmap', 'writer', 'video', 'studyguide', 'classes'
  )),

  -- Source of selection (where user clicked)
  source TEXT DEFAULT 'dashboard' CHECK (source IN (
    'dashboard', 'sidebar', 'recommendation', 'bottom_nav', 'keyboard_shortcut', 'study_buddy'
  )),

  -- Associated document (if any)
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Whether this was the user's first action in the session
  is_first_action BOOLEAN DEFAULT false,

  -- Session duration in this mode (updated when leaving mode)
  duration_seconds INTEGER,

  -- Whether user completed a meaningful action (generated content, reviewed cards, etc.)
  action_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENHANCE LEARNING PROFILES TABLE
-- ============================================================================
-- Add columns for blended scores (quiz + behavioral)
ALTER TABLE learning_profiles
  ADD COLUMN IF NOT EXISTS blended_visual INTEGER,
  ADD COLUMN IF NOT EXISTS blended_auditory INTEGER,
  ADD COLUMN IF NOT EXISTS blended_kinesthetic INTEGER,
  ADD COLUMN IF NOT EXISTS blended_reading_writing INTEGER,
  ADD COLUMN IF NOT EXISTS blended_dominant_style TEXT CHECK (blended_dominant_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed')),
  ADD COLUMN IF NOT EXISTS blend_ratio DECIMAL(3,2) DEFAULT 0.3 CHECK (blend_ratio BETWEEN 0 AND 1);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_behavior_scores_user_id ON user_behavior_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_selection_events_user_id ON mode_selection_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_selection_events_created_at ON mode_selection_events(created_at);
CREATE INDEX IF NOT EXISTS idx_mode_selection_events_mode ON mode_selection_events(mode);
CREATE INDEX IF NOT EXISTS idx_mode_selection_events_user_mode ON mode_selection_events(user_id, mode);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Note: Since Clerk handles auth at the API level (not Supabase auth),
-- we use permissive policies. User filtering happens in API routes.
ALTER TABLE user_behavior_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_selection_events ENABLE ROW LEVEL SECURITY;

-- User behavior scores: Permissive policies (auth handled at API level via Clerk)
CREATE POLICY "Allow all operations on user_behavior_scores" ON user_behavior_scores
  FOR ALL USING (true) WITH CHECK (true);

-- Mode selection events: Permissive policies (auth handled at API level via Clerk)
CREATE POLICY "Allow all operations on mode_selection_events" ON mode_selection_events
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp for user_behavior_scores
CREATE TRIGGER update_user_behavior_scores_updated_at
  BEFORE UPDATE ON user_behavior_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE user_behavior_scores IS 'Stores behavioral learning style scores inferred from user mode usage patterns';
COMMENT ON TABLE mode_selection_events IS 'Tracks individual mode selection events for behavioral learning style analysis';
COMMENT ON COLUMN user_behavior_scores.behavioral_confidence IS 'Confidence level (0-1) based on amount of data collected. Formula: 1 - e^(-0.05 * total_sessions)';
COMMENT ON COLUMN user_behavior_scores.mode_engagement IS 'JSON object with per-mode engagement metrics: sessions, totalMinutes, completionRate';
COMMENT ON COLUMN learning_profiles.blend_ratio IS 'Ratio of behavioral vs quiz scores (0=quiz only, 1=behavioral only). Adjusted by confidence.';
