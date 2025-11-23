-- Create study_guides table for storing AI-generated comprehensive study guides
-- Date: 2025-11-22
-- This migration is fully idempotent and safe to re-run

-- Create the study_guides table
CREATE TABLE IF NOT EXISTS study_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References user_profiles(id)
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Structured study guide content (summary, objectives, topics, practice questions)
  study_duration TEXT CHECK (study_duration IN ('1week', '2weeks', '1month', 'custom')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  pdf_url TEXT, -- URL to generated PDF in Supabase Storage
  pdf_size INTEGER, -- File size in bytes
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for user_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'study_guides_user_id_fkey'
  ) THEN
    ALTER TABLE study_guides
      ADD CONSTRAINT study_guides_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created foreign key constraint for user_id';
  ELSE
    RAISE NOTICE 'Foreign key constraint for user_id already exists';
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_study_guides_user_id ON study_guides(user_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_document_id ON study_guides(document_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_created_at ON study_guides(created_at DESC);

-- Enable RLS
ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to view their own study guides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'study_guides' AND policyname = 'Users can view own study guides'
  ) THEN
    CREATE POLICY "Users can view own study guides" ON study_guides
      FOR SELECT USING (
        user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      );
    RAISE NOTICE 'Created SELECT policy for study_guides';
  ELSE
    RAISE NOTICE 'SELECT policy for study_guides already exists';
  END IF;
END $$;

-- Allow users to manage their own study guides (insert, update, delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'study_guides' AND policyname = 'Users can manage own study guides'
  ) THEN
    CREATE POLICY "Users can manage own study guides" ON study_guides
      FOR ALL USING (
        user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      );
    RAISE NOTICE 'Created ALL policy for study_guides';
  ELSE
    RAISE NOTICE 'ALL policy for study_guides already exists';
  END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_study_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_study_guides_timestamp'
  ) THEN
    CREATE TRIGGER update_study_guides_timestamp
      BEFORE UPDATE ON study_guides
      FOR EACH ROW
      EXECUTE FUNCTION update_study_guides_updated_at();
    RAISE NOTICE 'Created updated_at trigger for study_guides';
  ELSE
    RAISE NOTICE 'updated_at trigger for study_guides already exists';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE ' study_guides table migration completed successfully';
END $$;
