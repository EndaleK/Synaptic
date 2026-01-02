-- Achievements and Leaderboards Migration
-- Q2 2025: Social & Engagement Features

-- =====================================================
-- ACHIEVEMENTS SYSTEM
-- =====================================================

-- Achievement definitions table
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'flashcards', 'exams', 'documents', 'podcasts', 'social', 'special')),
  icon TEXT NOT NULL, -- Icon name from lucide-react
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points INTEGER NOT NULL DEFAULT 10,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('count', 'streak', 'score', 'special')),
  requirement_value INTEGER NOT NULL,
  requirement_description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User achievements (unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  is_displayed BOOLEAN DEFAULT FALSE, -- User can showcase up to 3 badges
  UNIQUE(user_id, achievement_id)
);

-- Achievement progress tracking (for partially completed achievements)
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_displayed ON user_achievements(user_id, is_displayed) WHERE is_displayed = TRUE;
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category ON achievement_definitions(category, tier);

-- =====================================================
-- LEADERBOARD SYSTEM
-- =====================================================

-- Weekly leaderboard snapshots (computed every Sunday)
CREATE TABLE IF NOT EXISTS leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Start of the week (Sunday)
  points INTEGER NOT NULL DEFAULT 0,
  flashcards_reviewed INTEGER DEFAULT 0,
  exams_completed INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- All-time leaderboard (updated in real-time)
CREATE TABLE IF NOT EXISTS leaderboard_alltime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_flashcards INTEGER DEFAULT 0,
  total_exams INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  rank INTEGER,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_week ON leaderboard_weekly(week_start, points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_user ON leaderboard_weekly(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_alltime_points ON leaderboard_alltime(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_alltime_streak ON leaderboard_alltime(longest_streak DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_alltime ENABLE ROW LEVEL SECURITY;

-- Achievement definitions are public (read-only)
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON achievement_definitions;
CREATE POLICY "Anyone can view achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (is_active = TRUE);

-- Users can view all unlocked achievements (for leaderboards)
DROP POLICY IF EXISTS "Anyone can view unlocked achievements" ON user_achievements;
CREATE POLICY "Anyone can view unlocked achievements"
  ON user_achievements FOR SELECT
  USING (TRUE);

-- Only users can insert/update their own achievements
DROP POLICY IF EXISTS "Users can manage own achievements" ON user_achievements;
CREATE POLICY "Users can manage own achievements"
  ON user_achievements FOR ALL
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Achievement progress is private
DROP POLICY IF EXISTS "Users can view own progress" ON achievement_progress;
CREATE POLICY "Users can view own progress"
  ON achievement_progress FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own progress" ON achievement_progress;
CREATE POLICY "Users can update own progress"
  ON achievement_progress FOR ALL
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Leaderboards are public
DROP POLICY IF EXISTS "Anyone can view weekly leaderboard" ON leaderboard_weekly;
CREATE POLICY "Anyone can view weekly leaderboard"
  ON leaderboard_weekly FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view alltime leaderboard" ON leaderboard_alltime;
CREATE POLICY "Anyone can view alltime leaderboard"
  ON leaderboard_alltime FOR SELECT
  USING (TRUE);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access achievements" ON user_achievements;
CREATE POLICY "Service role full access achievements"
  ON user_achievements FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access progress" ON achievement_progress;
CREATE POLICY "Service role full access progress"
  ON achievement_progress FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access weekly" ON leaderboard_weekly;
CREATE POLICY "Service role full access weekly"
  ON leaderboard_weekly FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access alltime" ON leaderboard_alltime;
CREATE POLICY "Service role full access alltime"
  ON leaderboard_alltime FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- SEED DEFAULT ACHIEVEMENTS
-- =====================================================

INSERT INTO achievement_definitions (slug, name, description, category, icon, tier, points, requirement_type, requirement_value, requirement_description, sort_order)
VALUES
  -- Streak achievements
  ('streak_7', 'Week Warrior', 'Maintain a 7-day study streak', 'streak', 'Flame', 'bronze', 10, 'streak', 7, 'Study for 7 consecutive days', 1),
  ('streak_14', 'Dedicated Learner', 'Maintain a 14-day study streak', 'streak', 'Zap', 'silver', 25, 'streak', 14, 'Study for 14 consecutive days', 2),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day study streak', 'streak', 'Star', 'gold', 50, 'streak', 30, 'Study for 30 consecutive days', 3),
  ('streak_60', 'Study Champion', 'Maintain a 60-day study streak', 'streak', 'Trophy', 'platinum', 100, 'streak', 60, 'Study for 60 consecutive days', 4),
  ('streak_100', 'Legendary Scholar', 'Maintain a 100-day study streak', 'streak', 'Crown', 'diamond', 200, 'streak', 100, 'Study for 100 consecutive days', 5),

  -- Flashcard achievements
  ('flashcards_100', 'Card Collector', 'Review 100 flashcards', 'flashcards', 'BookOpen', 'bronze', 10, 'count', 100, 'Review 100 flashcards total', 10),
  ('flashcards_500', 'Card Enthusiast', 'Review 500 flashcards', 'flashcards', 'BookOpen', 'silver', 25, 'count', 500, 'Review 500 flashcards total', 11),
  ('flashcards_1000', 'Card Master', 'Review 1,000 flashcards', 'flashcards', 'BookOpen', 'gold', 50, 'count', 1000, 'Review 1,000 flashcards total', 12),
  ('flashcards_5000', 'Card Legend', 'Review 5,000 flashcards', 'flashcards', 'BookOpen', 'platinum', 100, 'count', 5000, 'Review 5,000 flashcards total', 13),
  ('flashcards_10000', 'Memory Champion', 'Review 10,000 flashcards', 'flashcards', 'Brain', 'diamond', 200, 'count', 10000, 'Review 10,000 flashcards total', 14),

  -- Exam achievements
  ('exams_first', 'Test Taker', 'Complete your first practice exam', 'exams', 'GraduationCap', 'bronze', 10, 'count', 1, 'Complete 1 practice exam', 20),
  ('exams_10', 'Exam Pro', 'Complete 10 practice exams', 'exams', 'GraduationCap', 'silver', 25, 'count', 10, 'Complete 10 practice exams', 21),
  ('exams_perfect', 'Perfect Score', 'Score 100% on any exam', 'exams', 'Target', 'gold', 50, 'score', 100, 'Get a perfect score on any exam', 22),
  ('exams_streak_5', 'Exam Streak', 'Pass 5 exams in a row (70%+)', 'exams', 'Zap', 'gold', 50, 'streak', 5, 'Pass 5 consecutive exams', 23),

  -- Document achievements
  ('docs_first', 'First Upload', 'Upload your first document', 'documents', 'FileText', 'bronze', 5, 'count', 1, 'Upload 1 document', 30),
  ('docs_10', 'Document Collector', 'Upload 10 documents', 'documents', 'Files', 'silver', 25, 'count', 10, 'Upload 10 documents', 31),
  ('docs_explorer', 'Knowledge Explorer', 'Upload documents in 3+ categories', 'documents', 'FolderTree', 'gold', 50, 'count', 3, 'Upload documents from different subjects', 32),

  -- Podcast achievements
  ('podcast_first', 'First Listen', 'Generate your first podcast', 'podcasts', 'Headphones', 'bronze', 10, 'count', 1, 'Generate 1 podcast', 40),
  ('podcast_10', 'Audio Learner', 'Generate 10 podcasts', 'podcasts', 'Mic', 'silver', 25, 'count', 10, 'Generate 10 podcasts', 41),
  ('podcast_marathon', 'Podcast Marathon', 'Listen to 10 hours of content', 'podcasts', 'Clock', 'gold', 50, 'count', 600, 'Listen to 600 minutes of podcasts', 42),

  -- Special achievements
  ('early_bird', 'Early Bird', 'Study before 7 AM', 'special', 'Sunrise', 'bronze', 15, 'special', 1, 'Complete a study session before 7 AM', 50),
  ('night_owl', 'Night Owl', 'Study after 11 PM', 'special', 'Moon', 'bronze', 15, 'special', 1, 'Complete a study session after 11 PM', 51),
  ('weekend_warrior', 'Weekend Warrior', 'Study on both Saturday and Sunday', 'special', 'Calendar', 'silver', 20, 'special', 1, 'Study on consecutive weekend days', 52),
  ('speed_learner', 'Speed Learner', 'Review 50 cards in under 10 minutes', 'special', 'Rocket', 'gold', 40, 'special', 1, 'Complete 50 flashcard reviews in under 10 minutes', 53),
  ('all_modes', 'Renaissance Learner', 'Use all 9 learning modes', 'special', 'Sparkles', 'platinum', 75, 'count', 9, 'Try every learning mode at least once', 54)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update leaderboard points
CREATE OR REPLACE FUNCTION update_leaderboard_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all-time leaderboard
  INSERT INTO leaderboard_alltime (user_id, achievements_count, updated_at)
  VALUES (NEW.user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    achievements_count = leaderboard_alltime.achievements_count + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update leaderboard when achievement unlocked
DROP TRIGGER IF EXISTS trigger_achievement_unlocked ON user_achievements;
CREATE TRIGGER trigger_achievement_unlocked
  AFTER INSERT ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_points();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE achievement_definitions IS 'Defines all available achievements/badges';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements each user has unlocked';
COMMENT ON TABLE achievement_progress IS 'Tracks progress toward incomplete achievements';
COMMENT ON TABLE leaderboard_weekly IS 'Weekly leaderboard snapshots for rankings';
COMMENT ON TABLE leaderboard_alltime IS 'All-time cumulative stats for global rankings';

COMMENT ON COLUMN achievement_definitions.tier IS 'Badge tier: bronze < silver < gold < platinum < diamond';
COMMENT ON COLUMN achievement_definitions.is_secret IS 'If true, achievement is hidden until unlocked';
COMMENT ON COLUMN user_achievements.is_displayed IS 'If true, badge is shown on user profile (max 3)';
