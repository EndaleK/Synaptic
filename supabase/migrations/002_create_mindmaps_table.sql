-- =====================================================
-- MINDMAPS TABLE SCHEMA
-- =====================================================
-- This migration creates the mindmaps table for storing
-- AI-generated mind map structures
-- =====================================================

-- Drop existing table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS mindmaps CASCADE;

-- Create mindmaps table
CREATE TABLE mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (matches documents.user_id)
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nodes JSONB NOT NULL, -- Array of nodes with id, label, level, category, description
  edges JSONB NOT NULL, -- Array of edges with id, from, to, relationship
  layout_data JSONB, -- Stores React Flow position and styling data
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_document_id ON mindmaps(document_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_created_at ON mindmaps(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_mindmaps_updated_at
  BEFORE UPDATE ON mindmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

-- Grant permissions first (important for service_role access)
GRANT ALL ON mindmaps TO authenticated;
GRANT ALL ON mindmaps TO service_role;
GRANT ALL ON mindmaps TO anon;

-- Create permissive RLS policies
-- Note: Service role bypasses RLS, so these are for client-side access only
-- Policy: Allow service_role full access (bypasses RLS automatically)
-- Policy: Allow authenticated users to manage their own mindmaps
CREATE POLICY "Enable all access for service role"
  ON mindmaps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For development: Allow all operations (you can restrict this later)
CREATE POLICY "Enable read access for all users"
  ON mindmaps FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON mindmaps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON mindmaps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON mindmaps FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE mindmaps IS 'Stores AI-generated mind map data structures';
COMMENT ON COLUMN mindmaps.id IS 'Unique mindmap identifier';
COMMENT ON COLUMN mindmaps.user_id IS 'Clerk user ID from JWT token (matches documents.user_id)';
COMMENT ON COLUMN mindmaps.document_id IS 'Reference to source document';
COMMENT ON COLUMN mindmaps.title IS 'Mind map title (usually document name or main topic)';
COMMENT ON COLUMN mindmaps.nodes IS 'JSONB array of mind map nodes';
COMMENT ON COLUMN mindmaps.edges IS 'JSONB array of edges connecting nodes';
COMMENT ON COLUMN mindmaps.layout_data IS 'React Flow layout metadata (positions, zoom, etc.)';
COMMENT ON COLUMN mindmaps.view_count IS 'Number of times mind map has been viewed';
