-- Complete mastery tracking migration
-- Adds missing columns for full spaced repetition tracking

-- Add missing mastery tracking columns
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS times_reviewed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE;

-- Create index for review queue queries (finding due flashcards)
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review
ON flashcards(user_id, next_review_at)
WHERE next_review_at IS NOT NULL;

-- Create index for performance tracking
CREATE INDEX IF NOT EXISTS idx_flashcards_last_reviewed
ON flashcards(user_id, last_reviewed_at)
WHERE last_reviewed_at IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN flashcards.times_reviewed IS 'Total number of times this flashcard has been reviewed';
COMMENT ON COLUMN flashcards.times_correct IS 'Number of times marked as "Got it!" (mastered)';
COMMENT ON COLUMN flashcards.last_reviewed_at IS 'Timestamp of the most recent review';
COMMENT ON COLUMN flashcards.next_review_at IS 'Scheduled timestamp for next review based on mastery level';

-- Update existing flashcards to have default values
UPDATE flashcards
SET
  times_reviewed = 0,
  times_correct = 0
WHERE times_reviewed IS NULL OR times_correct IS NULL;
