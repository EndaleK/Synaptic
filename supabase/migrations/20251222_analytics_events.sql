-- Analytics events table for tracking user behavior and retention metrics
-- This enables measuring where users drop off and what features they use

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  page_path TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

-- Composite index for common queries (user + time range)
CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics_events(user_id, created_at DESC);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    OR user_id IS NULL  -- Allow anonymous events
  );

-- Service role can read all events (for analytics dashboard)
CREATE POLICY "Service role can read all events" ON analytics_events
  FOR SELECT USING (auth.role() = 'service_role');

-- Users can read their own events
CREATE POLICY "Users can read own events" ON analytics_events
  FOR SELECT USING (
    user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

COMMENT ON TABLE analytics_events IS 'Tracks user behavior events for retention analysis';
COMMENT ON COLUMN analytics_events.event_name IS 'Event type: page_view, flashcard_generated, session_completed, etc.';
COMMENT ON COLUMN analytics_events.event_properties IS 'Additional context for the event (documentId, count, duration, etc.)';
COMMENT ON COLUMN analytics_events.session_id IS 'Browser session ID for grouping events';
