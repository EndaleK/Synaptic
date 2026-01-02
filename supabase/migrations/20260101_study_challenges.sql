-- Study Challenges Migration
-- Enables users to create and participate in study challenges with friends/groups

-- ============================================================================
-- Study Challenges Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('flashcards', 'streak', 'study_time', 'exams', 'custom')),
  goal_value INTEGER NOT NULL, -- e.g., 100 flashcards, 7 day streak, 300 minutes
  goal_unit TEXT NOT NULL, -- 'cards', 'days', 'minutes', 'exams', 'points'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  invite_code TEXT UNIQUE, -- For sharing private challenges
  max_participants INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_goal CHECK (goal_value > 0)
);

-- ============================================================================
-- Challenge Participants Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES study_challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  rank INTEGER, -- Updated when challenge ends

  UNIQUE(challenge_id, user_id)
);

-- ============================================================================
-- Challenge Progress Log (for detailed tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  progress_delta INTEGER NOT NULL,
  activity_type TEXT NOT NULL, -- 'flashcard_review', 'study_session', 'exam_completed'
  activity_id UUID, -- Reference to the actual activity
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_study_challenges_creator ON study_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_challenges_status ON study_challenges(status);
CREATE INDEX IF NOT EXISTS idx_study_challenges_dates ON study_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_study_challenges_invite_code ON study_challenges(invite_code) WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_progress ON challenge_participants(challenge_id, current_progress DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_log_participant ON challenge_progress_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_log_time ON challenge_progress_log(logged_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE study_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress_log ENABLE ROW LEVEL SECURITY;

-- Study Challenges Policies
CREATE POLICY "Users can view public challenges"
  ON study_challenges FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can view challenges they created"
  ON study_challenges FOR SELECT
  USING (creator_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can view challenges they participate in"
  ON study_challenges FOR SELECT
  USING (id IN (
    SELECT challenge_id FROM challenge_participants
    WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text)
  ));

CREATE POLICY "Users can create challenges"
  ON study_challenges FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Creators can update their challenges"
  ON study_challenges FOR UPDATE
  USING (creator_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Creators can delete their challenges"
  ON study_challenges FOR DELETE
  USING (creator_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Challenge Participants Policies
CREATE POLICY "Users can view participants in challenges they can see"
  ON challenge_participants FOR SELECT
  USING (
    challenge_id IN (
      SELECT id FROM study_challenges
      WHERE visibility = 'public'
         OR creator_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text)
         OR id IN (
           SELECT challenge_id FROM challenge_participants
           WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text)
         )
    )
  );

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own participation"
  ON challenge_participants FOR UPDATE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can leave challenges"
  ON challenge_participants FOR DELETE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- Challenge Progress Log Policies
CREATE POLICY "Users can view their own progress logs"
  ON challenge_progress_log FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM challenge_participants
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can log their own progress"
  ON challenge_progress_log FOR INSERT
  WITH CHECK (
    participant_id IN (
      SELECT id FROM challenge_participants
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text)
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_study_challenges_updated_at
  BEFORE UPDATE ON study_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Generate invite code for private challenges
CREATE OR REPLACE FUNCTION generate_challenge_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'private' AND NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substring(md5(random()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_challenge_invite_code
  BEFORE INSERT ON study_challenges
  FOR EACH ROW
  EXECUTE FUNCTION generate_challenge_invite_code();

-- Update participant progress total when progress is logged
CREATE OR REPLACE FUNCTION update_participant_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE challenge_participants
  SET current_progress = current_progress + NEW.progress_delta
  WHERE id = NEW.participant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_progress_on_log
  AFTER INSERT ON challenge_progress_log
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_progress();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get challenge leaderboard
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(p_challenge_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id INTEGER,
  display_name TEXT,
  avatar_url TEXT,
  current_progress INTEGER,
  completed_at TIMESTAMPTZ,
  is_current_user BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY cp.current_progress DESC, cp.joined_at ASC) as rank,
    cp.user_id,
    up.display_name,
    up.avatar_url,
    cp.current_progress,
    cp.completed_at,
    (up.clerk_user_id = auth.uid()::text) as is_current_user
  FROM challenge_participants cp
  JOIN user_profiles up ON cp.user_id = up.id
  WHERE cp.challenge_id = p_challenge_id
  ORDER BY cp.current_progress DESC, cp.joined_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
