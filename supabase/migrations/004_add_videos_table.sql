-- Migration: Add videos table for Video Learning feature
-- Description: Premium feature for YouTube video transcript processing and learning
-- Created: 2025-01-XX

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_id TEXT NOT NULL, -- YouTube video ID
  title TEXT NOT NULL,
  channel_name TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  transcript JSONB DEFAULT '[]'::jsonb, -- Array of VideoTranscriptLine objects {start_time, end_time, text}
  summary TEXT, -- AI-generated summary
  key_points JSONB DEFAULT '[]'::jsonb, -- Array of VideoKeyPoint objects {timestamp, title, description, importance}
  generated_flashcard_ids TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of flashcard UUIDs
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_video_id ON videos(video_id);
CREATE INDEX idx_videos_processing_status ON videos(processing_status);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);

-- Create a unique constraint on user_id + video_id to prevent duplicates
CREATE UNIQUE INDEX idx_videos_user_video_unique ON videos(user_id, video_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Users can view own videos
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can insert own videos
CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can update own videos
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can delete own videos
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE videos IS 'Stores YouTube videos with transcripts, summaries, and AI-generated learning materials';
COMMENT ON COLUMN videos.transcript IS 'JSON array of transcript lines with timestamps for synchronized playback';
COMMENT ON COLUMN videos.key_points IS 'JSON array of important concepts extracted from video with timestamps';
COMMENT ON COLUMN videos.generated_flashcard_ids IS 'Array of flashcard UUIDs auto-generated from video content';
