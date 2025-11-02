-- Migration: Add essays table for Writing Assistant feature
-- Description: Premium feature for academic, professional, and creative writing
-- Created: 2025-01-XX

-- ============================================================================
-- ESSAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Optional source document
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  writing_type TEXT CHECK (writing_type IN ('academic', 'professional', 'creative')),
  citation_style TEXT CHECK (citation_style IN ('APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver')),
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'final')),
  ai_suggestions JSONB DEFAULT '[]'::jsonb, -- Array of WritingSuggestion objects
  cited_sources JSONB DEFAULT '[]'::jsonb, -- Array of Citation objects
  version_history JSONB DEFAULT '[]'::jsonb, -- Array of EssayVersion objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_essays_user_id ON essays(user_id);
CREATE INDEX idx_essays_document_id ON essays(document_id);
CREATE INDEX idx_essays_status ON essays(status);
CREATE INDEX idx_essays_writing_type ON essays(writing_type);
CREATE INDEX idx_essays_created_at ON essays(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- Users can view own essays
CREATE POLICY "Users can view own essays" ON essays
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can insert own essays
CREATE POLICY "Users can insert own essays" ON essays
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can update own essays
CREATE POLICY "Users can update own essays" ON essays
  FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Users can delete own essays
CREATE POLICY "Users can delete own essays" ON essays
  FOR DELETE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_essays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER essays_updated_at
  BEFORE UPDATE ON essays
  FOR EACH ROW
  EXECUTE FUNCTION update_essays_updated_at();

-- Auto-update word count when content changes
CREATE OR REPLACE FUNCTION update_essay_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER essay_word_count_update
  BEFORE INSERT OR UPDATE OF content ON essays
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_word_count();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE essays IS 'Stores user-created essays and writing projects with AI assistance';
COMMENT ON COLUMN essays.ai_suggestions IS 'JSON array of AI-generated writing suggestions (grammar, structure, tone)';
COMMENT ON COLUMN essays.cited_sources IS 'JSON array of citations with full metadata';
COMMENT ON COLUMN essays.version_history IS 'JSON array tracking all revisions';
