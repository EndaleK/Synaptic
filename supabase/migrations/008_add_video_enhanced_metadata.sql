-- Migration: Add enhanced AI metadata fields to videos table
-- Description: Adds comprehensive educational metadata extracted from AI analysis
-- Created: 2025-01-15

-- ============================================================================
-- ADD NEW METADATA COLUMNS
-- ============================================================================

-- Add difficulty level detection
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS difficulty_level TEXT
CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Add topics covered array
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add prerequisites array
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add learning outcomes array
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add key vocabulary (term-definition pairs)
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS key_vocabulary JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering by difficulty level
CREATE INDEX IF NOT EXISTS idx_videos_difficulty_level ON videos(difficulty_level);

-- GIN index for topics covered array searches
CREATE INDEX IF NOT EXISTS idx_videos_topics_covered ON videos USING GIN(topics_covered);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN videos.difficulty_level IS 'AI-detected difficulty level: beginner, intermediate, advanced, or expert';
COMMENT ON COLUMN videos.topics_covered IS 'Array of main topics covered in the video';
COMMENT ON COLUMN videos.prerequisites IS 'Array of prerequisite concepts required to understand the video';
COMMENT ON COLUMN videos.learning_outcomes IS 'Array of measurable learning outcomes (what students will be able to do)';
COMMENT ON COLUMN videos.key_vocabulary IS 'JSON array of {term, definition} objects for technical vocabulary';
