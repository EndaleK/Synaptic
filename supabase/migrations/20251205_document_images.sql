-- Document Images Table
-- Stores metadata for images extracted from PDF documents

CREATE TABLE IF NOT EXISTS document_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_index INTEGER NOT NULL,
  storage_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  description TEXT, -- AI-generated description of the image
  bbox JSONB, -- Bounding box coordinates [x0, y0, x1, y1]
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique image per document/page/index combination
  UNIQUE(document_id, page_number, image_index)
);

-- Index for fast lookups by document
CREATE INDEX IF NOT EXISTS idx_document_images_document_id ON document_images(document_id);

-- Index for page-based queries
CREATE INDEX IF NOT EXISTS idx_document_images_page ON document_images(document_id, page_number);

-- Enable RLS
ALTER TABLE document_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see images from their own documents
-- Note: Using service role bypass since Clerk auth doesn't use Supabase auth.uid()
CREATE POLICY "Users can view their own document images"
  ON document_images FOR SELECT
  USING (true);

-- RLS Policy: Users can insert images for their own documents
CREATE POLICY "Users can insert their own document images"
  ON document_images FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own document images
CREATE POLICY "Users can update their own document images"
  ON document_images FOR UPDATE
  USING (true);

-- RLS Policy: Users can delete their own document images
CREATE POLICY "Users can delete their own document images"
  ON document_images FOR DELETE
  USING (true);

-- Add column to documents table to track if images have been extracted
ALTER TABLE documents ADD COLUMN IF NOT EXISTS images_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;
