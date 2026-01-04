-- Migration: Add retrieval_logs table for RAG quality monitoring
-- Created: 2026-01-04
-- Purpose: Track retrieval quality metrics and flag low-quality retrievals

-- Create retrieval_logs table
CREATE TABLE IF NOT EXISTS retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_intent TEXT,
  chunks_retrieved INTEGER NOT NULL DEFAULT 0,
  avg_pinecone_score FLOAT,
  avg_rerank_score FLOAT,
  top_rerank_score FLOAT,
  bottom_rerank_score FLOAT,
  response_strategy TEXT,
  was_reranked BOOLEAN DEFAULT FALSE,
  flagged_low_quality BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by document
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_document
  ON retrieval_logs(document_id);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_user
  ON retrieval_logs(user_id);

-- Index for querying flagged retrievals
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_flagged
  ON retrieval_logs(flagged_low_quality)
  WHERE flagged_low_quality = TRUE;

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_created_at
  ON retrieval_logs(created_at DESC);

-- Add RLS policies
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own retrieval logs
CREATE POLICY "Users can view own retrieval logs"
  ON retrieval_logs
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Policy: System can insert retrieval logs (for server-side logging)
-- This allows the server to insert logs without RLS restrictions
CREATE POLICY "System can insert retrieval logs"
  ON retrieval_logs
  FOR INSERT
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE retrieval_logs IS 'Tracks RAG retrieval quality metrics for monitoring and improvement';
COMMENT ON COLUMN retrieval_logs.query_intent IS 'Classified intent: summary, specific, structural, comparison, definition';
COMMENT ON COLUMN retrieval_logs.avg_pinecone_score IS 'Average similarity score from Pinecone (0-1)';
COMMENT ON COLUMN retrieval_logs.avg_rerank_score IS 'Average relevance score from Cohere rerank (0-1)';
COMMENT ON COLUMN retrieval_logs.flagged_low_quality IS 'True if retrieval quality was below thresholds';
