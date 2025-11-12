-- Migration: Add 'needs_ocr' status for documents requiring OCR processing
-- This status indicates a scanned PDF that couldn't extract text automatically

-- Drop the old constraint
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_processing_status_check;

-- Add new constraint with 'needs_ocr' status
ALTER TABLE documents
ADD CONSTRAINT documents_processing_status_check
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'needs_ocr'));

-- Add comment
COMMENT ON COLUMN documents.processing_status IS 'Document processing status: pending (not yet processed), processing (currently being processed), completed (successfully processed), failed (processing failed), needs_ocr (scanned PDF requiring OCR)';
