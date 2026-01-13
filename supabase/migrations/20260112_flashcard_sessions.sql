-- Migration: Add flashcard generation sessions
-- Purpose: Track each flashcard generation as a distinct session for better organization

-- ============================================================
-- 1. Create flashcard_generation_sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcard_generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Session metadata
  title TEXT, -- User-friendly title (auto-generated or custom)
  description TEXT, -- Optional description

  -- Generation details
  generation_type TEXT DEFAULT 'full', -- 'full', 'topic', 'pages', 'chapters'
  selection_info JSONB, -- {topic: "Chapter 5", pages: {start: 50, end: 75}, etc.}
  source_text_preview TEXT, -- First 200 chars of source for context

  -- Stats
  cards_count INTEGER DEFAULT 0,
  cards_reviewed INTEGER DEFAULT 0,
  cards_mastered INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_studied_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 2. Add generation_session_id to flashcards table
-- ============================================================
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS generation_session_id UUID REFERENCES flashcard_generation_sessions(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_user_id ON flashcard_generation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_document_id ON flashcard_generation_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_created_at ON flashcard_generation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_generation_session_id ON flashcards(generation_session_id);

-- ============================================================
-- 4. Enable Row Level Security
-- ============================================================
ALTER TABLE flashcard_generation_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view own flashcard sessions" ON flashcard_generation_sessions;
DROP POLICY IF EXISTS "Users can insert own flashcard sessions" ON flashcard_generation_sessions;
DROP POLICY IF EXISTS "Users can update own flashcard sessions" ON flashcard_generation_sessions;
DROP POLICY IF EXISTS "Users can delete own flashcard sessions" ON flashcard_generation_sessions;

-- Users can only see their own sessions
CREATE POLICY "Users can view own flashcard sessions"
  ON flashcard_generation_sessions FOR SELECT
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert own flashcard sessions"
  ON flashcard_generation_sessions FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update own flashcard sessions"
  ON flashcard_generation_sessions FOR UPDATE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can delete own flashcard sessions"
  ON flashcard_generation_sessions FOR DELETE
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

-- ============================================================
-- 5. Create trigger to update session stats when flashcards change
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_card_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count when cards added/removed
  IF TG_OP = 'INSERT' AND NEW.generation_session_id IS NOT NULL THEN
    UPDATE flashcard_generation_sessions
    SET cards_count = cards_count + 1,
        updated_at = NOW()
    WHERE id = NEW.generation_session_id;
  ELSIF TG_OP = 'DELETE' AND OLD.generation_session_id IS NOT NULL THEN
    UPDATE flashcard_generation_sessions
    SET cards_count = GREATEST(0, cards_count - 1),
        updated_at = NOW()
    WHERE id = OLD.generation_session_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_session_stats ON flashcards;
CREATE TRIGGER trigger_update_session_stats
AFTER INSERT OR DELETE ON flashcards
FOR EACH ROW EXECUTE FUNCTION update_session_card_stats();

-- ============================================================
-- 6. Create function to update mastery stats
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_mastery_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generation_session_id IS NOT NULL THEN
    -- Update mastery counts for the session
    UPDATE flashcard_generation_sessions
    SET
      cards_reviewed = (
        SELECT COUNT(*) FROM flashcards
        WHERE generation_session_id = NEW.generation_session_id
        AND times_reviewed > 0
      ),
      cards_mastered = (
        SELECT COUNT(*) FROM flashcards
        WHERE generation_session_id = NEW.generation_session_id
        AND maturity_level = 'mature'
      ),
      last_studied_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.generation_session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_mastery ON flashcards;
CREATE TRIGGER trigger_update_session_mastery
AFTER UPDATE OF times_reviewed, maturity_level ON flashcards
FOR EACH ROW EXECUTE FUNCTION update_session_mastery_stats();

-- ============================================================
-- 7. Migrate existing flashcards to sessions (optional)
-- This creates one session per document for existing cards
-- ============================================================
-- Note: Run this manually if you want to migrate existing data
-- INSERT INTO flashcard_generation_sessions (user_id, document_id, title, cards_count, created_at)
-- SELECT DISTINCT
--   f.user_id,
--   f.document_id,
--   COALESCE(d.name, 'Imported Flashcards'),
--   COUNT(*),
--   MIN(f.created_at)
-- FROM flashcards f
-- LEFT JOIN documents d ON f.document_id = d.id
-- WHERE f.generation_session_id IS NULL
-- GROUP BY f.user_id, f.document_id, d.name;
