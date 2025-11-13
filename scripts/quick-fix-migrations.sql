-- Quick Fix: Apply Critical Migrations
-- Run this SQL in your Supabase SQL Editor to fix the processing_status constraint error
-- Location: Supabase Dashboard → SQL Editor → New Query → Paste this entire file → Run

-- ============================================================================
-- MIGRATION 1: Add 'needs_ocr' status to processing_status constraint
-- ============================================================================

-- Drop the old constraint
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_processing_status_check;

-- Add new constraint with 'needs_ocr' status
ALTER TABLE documents
ADD CONSTRAINT documents_processing_status_check
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'needs_ocr'));

-- Add comment
COMMENT ON COLUMN documents.processing_status IS 'Document processing status: pending (not yet processed), processing (currently being processed), completed (successfully processed), failed (processing failed), needs_ocr (scanned PDF requiring OCR)';

-- ============================================================================
-- MIGRATION 2: Add processing_progress column for tracking
-- ============================================================================

-- Add processing_progress column to store step-by-step progress
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processing_progress JSONB DEFAULT NULL;

-- Add index for querying documents by processing status (improves performance)
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

-- Add comment for documentation
COMMENT ON COLUMN documents.processing_progress IS 'Stores detailed processing progress: {current_step, total_steps, step_name, progress_percent, updated_at}';

-- ============================================================================
-- SUCCESS
-- ============================================================================

SELECT 'Migrations applied successfully! ✅' AS result;
SELECT 'You can now restart your Next.js dev server and test uploading.' AS next_step;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name IN ('processing_status', 'processing_progress')
ORDER BY column_name;
