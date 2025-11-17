-- ============================================================================
-- ADD NEW SESSION TYPES TO STUDY_SESSIONS TABLE
-- ============================================================================
-- Adds support for chat, podcast, mindmap, video, writing, and exam session types
-- to enable comprehensive study tracking across all learning modes

-- Drop the old constraint
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

-- Add new constraint with all session types
ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_session_type_check
  CHECK (session_type IN (
    'pomodoro',    -- Pomodoro timer sessions
    'custom',      -- Custom study sessions
    'review',      -- Flashcard review sessions
    'chat',        -- Document chat sessions
    'podcast',     -- Podcast listening/generation sessions
    'mindmap',     -- Mind map viewing/creation sessions
    'video',       -- Video learning sessions
    'writing',     -- Essay writing sessions
    'exam'         -- Exam practice sessions
  ));
