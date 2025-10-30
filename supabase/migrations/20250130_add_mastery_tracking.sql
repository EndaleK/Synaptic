-- Add mastery tracking fields to flashcards table
-- This migration adds spaced repetition and mastery tracking capabilities

-- Add new columns for mastery tracking
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'reviewing', 'mastered')),
ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Create index for filtering by mastery level
CREATE INDEX IF NOT EXISTS idx_flashcards_mastery_level ON flashcards(mastery_level);

-- Create composite index for user + mastery queries
CREATE INDEX IF NOT EXISTS idx_flashcards_user_mastery ON flashcards(user_id, mastery_level);

-- Add comment explaining the mastery levels
COMMENT ON COLUMN flashcards.mastery_level IS 'Learning: New or struggling cards, Reviewing: Cards being practiced, Mastered: Well-known cards';
COMMENT ON COLUMN flashcards.confidence_score IS 'Score 0-100 representing user confidence, updated based on green (increase) and red (decrease) button presses';

-- Update existing flashcards to have default values
UPDATE flashcards
SET mastery_level = 'learning',
    confidence_score = 0
WHERE mastery_level IS NULL OR confidence_score IS NULL;
