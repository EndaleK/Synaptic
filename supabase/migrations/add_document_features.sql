-- Add new columns to documents table for enhanced features

-- Add is_starred column
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Add is_deleted column for soft deletes (trash functionality)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add deleted_at column to track when document was moved to trash
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add last_accessed_at column for "recent" functionality
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW();

-- Add tags column for document tagging (JSONB array)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_is_starred
ON documents(user_id, is_starred)
WHERE is_starred = TRUE;

CREATE INDEX IF NOT EXISTS idx_documents_is_deleted
ON documents(user_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_documents_last_accessed
ON documents(user_id, last_accessed_at DESC)
WHERE is_deleted = FALSE;

-- Create index for tags
CREATE INDEX IF NOT EXISTS idx_documents_tags
ON documents USING GIN(tags)
WHERE is_deleted = FALSE;

-- Comment on columns
COMMENT ON COLUMN documents.is_starred IS 'Whether the document is starred/favorited';
COMMENT ON COLUMN documents.is_deleted IS 'Soft delete flag for trash functionality';
COMMENT ON COLUMN documents.deleted_at IS 'Timestamp when document was moved to trash';
COMMENT ON COLUMN documents.last_accessed_at IS 'Last time the document was accessed/viewed';
COMMENT ON COLUMN documents.tags IS 'Array of tags for document organization';
