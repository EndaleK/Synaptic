-- =====================================================
-- DOCUMENTS TABLE SCHEMA
-- =====================================================
-- This migration creates the documents table for storing
-- uploaded document metadata and extracted content.
-- =====================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text TEXT,
  document_summary TEXT,
  storage_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: These policies use Clerk user ID from JWT token
-- Adjust the JWT path based on your Clerk configuration

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json ->> 'sub');

-- Policy: Users can insert their own documents
CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json ->> 'sub');

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json ->> 'sub');

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json ->> 'sub');

-- Grant permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;

COMMENT ON TABLE documents IS 'Stores user-uploaded documents with metadata and extracted content';
COMMENT ON COLUMN documents.id IS 'Unique document identifier';
COMMENT ON COLUMN documents.user_id IS 'Clerk user ID from JWT token';
COMMENT ON COLUMN documents.file_name IS 'Original filename';
COMMENT ON COLUMN documents.file_type IS 'MIME type of the document';
COMMENT ON COLUMN documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN documents.extracted_text IS 'Extracted text content from the document';
COMMENT ON COLUMN documents.document_summary IS 'AI-generated summary (optional)';
COMMENT ON COLUMN documents.storage_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN documents.processing_status IS 'Document processing status (pending, processing, completed, failed)';
COMMENT ON COLUMN documents.error_message IS 'Error message if processing failed';
