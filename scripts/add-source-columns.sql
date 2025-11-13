-- Add source_url and source_type columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('arxiv', 'youtube', 'web', 'medium', 'pdf-url', 'unknown'));
