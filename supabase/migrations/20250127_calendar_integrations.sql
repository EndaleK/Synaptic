-- Create calendar_integrations table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One integration per provider per user
  UNIQUE (user_id, provider)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider
  ON calendar_integrations(user_id, provider);

-- Add google_event_id column to study_schedule table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_schedule' AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE study_schedule ADD COLUMN google_event_id TEXT;
    CREATE INDEX idx_study_schedule_google_event_id ON study_schedule(google_event_id);
  END IF;
END $$;

-- Row-Level Security for calendar_integrations
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own integrations
CREATE POLICY "Users can view their own calendar integrations"
  ON calendar_integrations
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own calendar integrations"
  ON calendar_integrations
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update their own calendar integrations"
  ON calendar_integrations
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can delete their own calendar integrations"
  ON calendar_integrations
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Updated_at trigger for calendar_integrations
CREATE OR REPLACE FUNCTION update_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_integrations_updated_at();
