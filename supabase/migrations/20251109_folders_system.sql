-- Migration: Add folder organization system
-- Created: 2025-11-09
-- Purpose: Allow users to organize documents in hierarchical folders

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '📁',
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure folder names are unique per user per parent folder
  CONSTRAINT unique_folder_per_parent UNIQUE(user_id, parent_folder_id, name),

  -- Ensure folder name is not empty
  CONSTRAINT folder_name_not_empty CHECK (name <> ''),

  -- Prevent circular references (folder cannot be its own parent)
  CONSTRAINT no_self_reference CHECK (id != parent_folder_id)
);

-- Add folder_id to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(position);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own folders
CREATE POLICY "Users can view their own folders"
  ON folders
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can create their own folders
CREATE POLICY "Users can create their own folders"
  ON folders
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can update their own folders
CREATE POLICY "Users can update their own folders"
  ON folders
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policy: Users can delete their own folders
CREATE POLICY "Users can delete their own folders"
  ON folders
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folders_timestamp
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folders_updated_at();

-- Function to prevent deep nesting (max 5 levels)
CREATE OR REPLACE FUNCTION check_folder_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INTEGER := 0;
  current_parent UUID;
BEGIN
  current_parent := NEW.parent_folder_id;

  WHILE current_parent IS NOT NULL AND depth < 10 LOOP
    depth := depth + 1;

    -- Prevent infinite loops from circular references
    IF depth > 9 THEN
      RAISE EXCEPTION 'Maximum folder nesting depth (5 levels) exceeded';
    END IF;

    SELECT parent_folder_id INTO current_parent
    FROM folders
    WHERE id = current_parent;
  END LOOP;

  IF depth >= 5 THEN
    RAISE EXCEPTION 'Maximum folder nesting depth (5 levels) exceeded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_folder_depth
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION check_folder_depth();

-- Add comments for documentation
COMMENT ON TABLE folders IS 'Hierarchical folder structure for organizing documents';
COMMENT ON COLUMN folders.name IS 'Folder display name';
COMMENT ON COLUMN folders.color IS 'Hex color code for folder visualization';
COMMENT ON COLUMN folders.icon IS 'Emoji or icon identifier for folder';
COMMENT ON COLUMN folders.parent_folder_id IS 'Parent folder ID for nested structure (NULL for root folders)';
COMMENT ON COLUMN folders.position IS 'Display order within parent folder';
COMMENT ON COLUMN documents.folder_id IS 'Folder containing this document (NULL for root level)';
