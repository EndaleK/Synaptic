-- Update documents table to use UUID user_id instead of TEXT
-- This migration fixes the foreign key constraint issues

-- ============================================================================
-- UPDATE DOCUMENTS TABLE
-- ============================================================================

-- First, add a new UUID column for user_id
ALTER TABLE documents ADD COLUMN user_id_uuid UUID;

-- Update the new column with data from user_profiles table
-- This assumes that the existing user_id TEXT column contains clerk_user_id values
UPDATE documents 
SET user_id_uuid = up.id 
FROM user_profiles up 
WHERE documents.user_id = up.clerk_user_id;

-- Drop the old TEXT column
ALTER TABLE documents DROP COLUMN user_id;

-- Rename the new column to user_id
ALTER TABLE documents RENAME COLUMN user_id_uuid TO user_id;

-- Make the column NOT NULL
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- ============================================================================
-- UPDATE INDEXES
-- ============================================================================

-- Drop the old index
DROP INDEX IF EXISTS idx_documents_user_id;

-- Create new index with UUID
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Create new policies that work with UUID user_id
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Documents table updated successfully!';
  RAISE NOTICE '  - Changed user_id from TEXT to UUID';
  RAISE NOTICE '  - Added foreign key constraint to user_profiles';
  RAISE NOTICE '  - Updated RLS policies';
END $$;
