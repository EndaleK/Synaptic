-- Migration: Enhanced Flashcard System with Source References and Better Spaced Repetition
-- Date: 2025-01-18
-- Description: Adds source references, enhanced SM-2 fields, and review quality tracking

-- ============================================================================
-- ADD SOURCE REFERENCE FIELDS TO FLASHCARDS
-- ============================================================================

-- Add source reference columns
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS source_page INTEGER,
ADD COLUMN IF NOT EXISTS source_section TEXT,
ADD COLUMN IF NOT EXISTS source_excerpt TEXT,
ADD COLUMN IF NOT EXISTS source_chunk INTEGER; -- For large documents divided into chunks

-- Add enhanced spaced repetition fields
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3, 2) DEFAULT 2.50, -- SM-2 ease factor (1.3-5.0)
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1,         -- Current interval in days
ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0,           -- Number of consecutive correct reviews
ADD COLUMN IF NOT EXISTS last_quality_rating INTEGER,             -- Last review quality (0-5)
ADD COLUMN IF NOT EXISTS maturity_level TEXT DEFAULT 'new' CHECK (maturity_level IN ('new', 'learning', 'young', 'mature'));

-- Add auto-detected difficulty field
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS auto_difficulty TEXT CHECK (auto_difficulty IN ('easy', 'medium', 'hard'));

-- Add review history tracking
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS review_history JSONB DEFAULT '[]'::jsonb; -- Array of {date, quality, interval}

-- Add card type for multiple formats
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'qa' CHECK (card_type IN ('qa', 'cloze', 'multiple-choice', 'image-occlusion'));

-- For cloze deletion cards
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS cloze_text TEXT;

ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS cloze_indices INTEGER[];

-- For multiple choice cards
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mc_options TEXT[];

ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mc_correct_index INTEGER;

ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mc_explanation TEXT;

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding cards due for review
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review
ON flashcards(user_id, next_review_at)
WHERE next_review_at IS NOT NULL;

-- Index for maturity level queries
CREATE INDEX IF NOT EXISTS idx_flashcards_maturity
ON flashcards(user_id, maturity_level);

-- Index for source references
CREATE INDEX IF NOT EXISTS idx_flashcards_source_page
ON flashcards(document_id, source_page)
WHERE source_page IS NOT NULL;

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- Set maturity level based on existing times_reviewed
UPDATE flashcards
SET maturity_level = CASE
  WHEN times_reviewed = 0 THEN 'new'
  WHEN times_reviewed < 3 THEN 'learning'
  WHEN times_reviewed < 8 THEN 'young'
  ELSE 'mature'
END
WHERE maturity_level = 'new'; -- Only update if not already set

-- Calculate approximate ease factor from times_correct and times_reviewed
UPDATE flashcards
SET ease_factor = CASE
  WHEN times_reviewed = 0 THEN 2.50
  WHEN times_reviewed > 0 THEN
    GREATEST(1.30, LEAST(5.00, 2.50 + (times_correct::decimal / NULLIF(times_reviewed, 0) - 0.8) * 0.5))
  ELSE 2.50
END
WHERE ease_factor = 2.50; -- Only update default values

-- Set repetitions from times_correct
UPDATE flashcards
SET repetitions = times_correct
WHERE repetitions = 0 AND times_correct > 0;

-- ============================================================================
-- CREATE REVIEW SESSIONS TABLE FOR ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS flashcard_review_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  cards_reviewed INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  average_quality DECIMAL(3, 2),
  total_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_sessions_user
ON flashcard_review_sessions(user_id, session_start DESC);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN flashcards.source_page IS 'Page number in source document (for PDFs)';
COMMENT ON COLUMN flashcards.source_section IS 'Section/chapter title in source document';
COMMENT ON COLUMN flashcards.source_excerpt IS 'First 100 characters of source text for context';
COMMENT ON COLUMN flashcards.source_chunk IS 'Chunk number for large documents processed via RAG';
COMMENT ON COLUMN flashcards.ease_factor IS 'SM-2 algorithm ease factor (1.3-5.0, default 2.5)';
COMMENT ON COLUMN flashcards.interval_days IS 'Current review interval in days';
COMMENT ON COLUMN flashcards.repetitions IS 'Number of consecutive correct reviews';
COMMENT ON COLUMN flashcards.last_quality_rating IS 'Last review quality: 0=fail, 3=hard, 4=good, 5=easy';
COMMENT ON COLUMN flashcards.maturity_level IS 'Card maturity: new (0 reviews) → learning (<3) → young (<8, <21 days) → mature (8+, 21+ days)';
COMMENT ON COLUMN flashcards.auto_difficulty IS 'Auto-detected difficulty based on word count, technical terms, etc.';
COMMENT ON COLUMN flashcards.review_history IS 'JSON array of review records: [{date, quality, interval}]';
COMMENT ON COLUMN flashcards.card_type IS 'Type of flashcard: qa (Q&A), cloze (fill-in-blank), multiple-choice, image-occlusion';
COMMENT ON COLUMN flashcards.cloze_text IS 'Cloze deletion text with {{c1::answer}} format';
COMMENT ON COLUMN flashcards.cloze_indices IS 'Array of cloze indices to hide (e.g., [1, 2] for c1 and c2)';
COMMENT ON COLUMN flashcards.mc_options IS 'Array of multiple choice options (4 options)';
COMMENT ON COLUMN flashcards.mc_correct_index IS 'Index of correct answer in mc_options (0-3)';
COMMENT ON COLUMN flashcards.mc_explanation IS 'Explanation for correct answer in multiple choice';
