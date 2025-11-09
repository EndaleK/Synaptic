-- Migration: Add topic selection presets feature
-- Created: 2025-11-08
-- Purpose: Allow users to save and reuse topic/page selections for documents

-- Create topic_selection_presets table
CREATE TABLE IF NOT EXISTS topic_selection_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  selection_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique preset names per user per document
  CONSTRAINT unique_preset_per_document UNIQUE(user_id, document_id, preset_name),

  -- Ensure preset_name is not empty
  CONSTRAINT preset_name_not_empty CHECK (preset_name <> ''),

  -- Ensure selection_data is valid JSON
  CONSTRAINT selection_data_is_object CHECK (jsonb_typeof(selection_data) = 'object')
);

-- Create index for faster lookups
CREATE INDEX idx_topic_presets_user_document ON topic_selection_presets(user_id, document_id);
CREATE INDEX idx_topic_presets_created_at ON topic_selection_presets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE topic_selection_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own presets
CREATE POLICY "Users can view their own topic selection presets"
  ON topic_selection_presets
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can create their own presets
CREATE POLICY "Users can create their own topic selection presets"
  ON topic_selection_presets
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can update their own presets
CREATE POLICY "Users can update their own topic selection presets"
  ON topic_selection_presets
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can delete their own presets
CREATE POLICY "Users can delete their own topic selection presets"
  ON topic_selection_presets
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_topic_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topic_presets_timestamp
  BEFORE UPDATE ON topic_selection_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_presets_updated_at();

-- Add comment for documentation
COMMENT ON TABLE topic_selection_presets IS 'Stores user-saved topic and page range selections for documents';
COMMENT ON COLUMN topic_selection_presets.selection_data IS 'JSON object containing type (pages/topic/full), pageRange, or topic metadata';
