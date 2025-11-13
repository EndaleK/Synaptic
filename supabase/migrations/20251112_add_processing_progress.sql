-- Migration: Add processing progress tracking for documents
-- Date: 2025-11-12
-- Purpose: Track detailed processing progress for large PDF files

-- Add processing_progress column to store step-by-step progress
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processing_progress JSONB DEFAULT NULL;

-- Add index for querying documents by processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

-- Add comments for documentation
COMMENT ON COLUMN documents.processing_progress IS 'Stores detailed processing progress: {current_step, total_steps, step_name, progress_percent, updated_at}';

-- Example processing_progress structure:
-- {
--   "current_step": 2,
--   "total_steps": 4,
--   "step_name": "Extracting PDF text",
--   "progress_percent": 50,
--   "message": "Processing pages 101-200 / 500",
--   "updated_at": "2025-11-12T10:30:00Z",
--   "steps_completed": ["update-status-processing", "extract-pdf-text"],
--   "current_step_started_at": "2025-11-12T10:29:00Z"
-- }
