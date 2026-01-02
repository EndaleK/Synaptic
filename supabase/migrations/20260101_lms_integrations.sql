-- LMS Integrations Migration
-- Adds Google Classroom and Canvas LMS integration support

-- Add Google Classroom columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_classroom_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_classroom_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_classroom_token_expiry TIMESTAMPTZ;

-- Add Canvas LMS columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS canvas_base_url TEXT,
ADD COLUMN IF NOT EXISTS canvas_access_token TEXT;

-- Create integration_exports table to track exports
CREATE TABLE IF NOT EXISTS integration_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'google_classroom', 'canvas'
  content_type TEXT NOT NULL, -- 'flashcards', 'mindmap', 'podcast', 'exam'
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  external_id TEXT, -- ID in the external system
  external_url TEXT, -- URL to the exported content
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_integration_exports_user_id ON integration_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_exports_integration_type ON integration_exports(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_exports_document_id ON integration_exports(document_id);

-- Enable RLS
ALTER TABLE integration_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_exports
CREATE POLICY "Users can view their own integration exports"
  ON integration_exports FOR SELECT
  USING (auth.uid()::text = (SELECT clerk_user_id FROM user_profiles WHERE id = user_id));

CREATE POLICY "Users can create their own integration exports"
  ON integration_exports FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT clerk_user_id FROM user_profiles WHERE id = user_id));

CREATE POLICY "Users can delete their own integration exports"
  ON integration_exports FOR DELETE
  USING (auth.uid()::text = (SELECT clerk_user_id FROM user_profiles WHERE id = user_id));

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_integration_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_integration_exports_updated_at ON integration_exports;
CREATE TRIGGER trigger_integration_exports_updated_at
  BEFORE UPDATE ON integration_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_exports_updated_at();

-- Add comment for documentation
COMMENT ON TABLE integration_exports IS 'Tracks exports to external LMS platforms (Google Classroom, Canvas)';
COMMENT ON COLUMN user_profiles.google_classroom_access_token IS 'OAuth access token for Google Classroom API';
COMMENT ON COLUMN user_profiles.google_classroom_refresh_token IS 'OAuth refresh token for Google Classroom API';
COMMENT ON COLUMN user_profiles.google_classroom_token_expiry IS 'Expiry time for Google Classroom access token';
COMMENT ON COLUMN user_profiles.canvas_base_url IS 'Canvas LMS instance URL (e.g., https://canvas.instructure.com)';
COMMENT ON COLUMN user_profiles.canvas_access_token IS 'Canvas LMS API access token';
