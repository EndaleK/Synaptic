-- Teacher Agent Tool Executions
-- Tracks suggested and executed tool calls from the agentic teacher

CREATE TABLE IF NOT EXISTS teacher_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL DEFAULT '{}',
  tool_output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executing', 'completed', 'failed')),
  explanation TEXT, -- Why the agent suggested this action
  error_message TEXT, -- Error details if failed
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_teacher_tool_executions_user ON teacher_tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tool_executions_conversation ON teacher_tool_executions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tool_executions_status ON teacher_tool_executions(status);
CREATE INDEX IF NOT EXISTS idx_teacher_tool_executions_suggested_at ON teacher_tool_executions(suggested_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_tool_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teacher_tool_executions_updated_at ON teacher_tool_executions;
CREATE TRIGGER trigger_update_teacher_tool_executions_updated_at
  BEFORE UPDATE ON teacher_tool_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_tool_executions_updated_at();

-- Row Level Security
ALTER TABLE teacher_tool_executions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tool executions
CREATE POLICY "Users can view own tool executions"
  ON teacher_tool_executions FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can insert their own tool executions
CREATE POLICY "Users can insert own tool executions"
  ON teacher_tool_executions FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can update their own tool executions
CREATE POLICY "Users can update own tool executions"
  ON teacher_tool_executions FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Users can delete their own tool executions
CREATE POLICY "Users can delete own tool executions"
  ON teacher_tool_executions FOR DELETE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text
  ));

-- Service role bypass for server-side operations
CREATE POLICY "Service role has full access to tool executions"
  ON teacher_tool_executions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE teacher_tool_executions IS 'Tracks tool suggestions and executions from the agentic teacher';
COMMENT ON COLUMN teacher_tool_executions.status IS 'pending: waiting for user approval, approved: user accepted, rejected: user declined, executing: currently running, completed: finished successfully, failed: encountered error';
