-- =====================================================
-- ADD BOOK STRUCTURE SUPPORT
-- =====================================================
-- This migration adds support for intelligent book
-- structure extraction (TOC, Index, Bookmarks, etc.)
-- =====================================================

-- Add new columns to documents table for book structure
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS book_structure JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS structure_analysis JSONB DEFAULT NULL;

-- Create GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_documents_book_structure
  ON documents USING GIN (book_structure);

CREATE INDEX IF NOT EXISTS idx_documents_ai_suggestions
  ON documents USING GIN (ai_suggestions);

-- Create index for checking if book has TOC
CREATE INDEX IF NOT EXISTS idx_documents_has_toc
  ON documents ((book_structure->>'toc_detected')::boolean)
  WHERE (book_structure->>'toc_detected')::boolean = true;

-- Create index for checking structure quality/recommendation
CREATE INDEX IF NOT EXISTS idx_documents_structure_quality
  ON documents ((structure_analysis->>'recommended'))
  WHERE structure_analysis IS NOT NULL;

-- Add source_section metadata to flashcards for traceability
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS source_section JSONB DEFAULT NULL;

-- Create index for querying flashcards by section
CREATE INDEX IF NOT EXISTS idx_flashcards_source_section
  ON flashcards USING GIN (source_section);

-- Add comments explaining the new structure
COMMENT ON COLUMN documents.book_structure IS 'Extracted book structures (TOC, Index, Bookmarks, Cross-references, Headings)';
COMMENT ON COLUMN documents.ai_suggestions IS 'AI-generated suggestions for content generation (flashcards, podcasts, mind maps)';
COMMENT ON COLUMN documents.structure_analysis IS 'AI analysis of which book structure is best to use (scores, reasoning, recommendation)';
COMMENT ON COLUMN flashcards.source_section IS 'Book section metadata (chapter, section, page range, TOC path)';

-- Example structure for book_structure JSONB:
-- {
--   "toc": {
--     "detected": true,
--     "chapters": [
--       {
--         "id": "ch1",
--         "title": "Introduction to Biology",
--         "level": 1,
--         "pageRange": { "start": 1, "end": 25 },
--         "sections": [
--           {
--             "id": "ch1.1",
--             "title": "Cell Structure",
--             "level": 2,
--             "pageRange": { "start": 5, "end": 15 }
--           }
--         ]
--       }
--     ]
--   },
--   "index": {
--     "detected": true,
--     "entries": [
--       {
--         "term": "Mitochondria",
--         "pages": [12, 45, 78],
--         "subEntries": ["ATP production", "Structure"]
--       }
--     ]
--   },
--   "bookmarks": {
--     "detected": true,
--     "outline": [
--       {
--         "title": "Chapter 1",
--         "dest": 1,
--         "items": []
--       }
--     ]
--   },
--   "crossRefs": {
--     "references": [
--       {
--         "from": { "page": 12, "text": "See Chapter 3" },
--         "to": { "chapter": "ch3", "page": 45 }
--       }
--     ]
--   },
--   "headings": {
--     "detected": true,
--     "hierarchy": [
--       {
--         "text": "Introduction",
--         "level": 1,
--         "page": 1,
--         "fontSize": 18
--       }
--     ]
--   }
-- }

-- Example structure for ai_suggestions JSONB:
-- {
--   "flashcards": [
--     {
--       "sectionId": "ch1.1",
--       "title": "Cell Structure",
--       "confidence": 0.95,
--       "reason": "High concept density with definitions and key terms",
--       "pageRange": { "start": 5, "end": 15 },
--       "estimatedCards": 15
--     }
--   ],
--   "podcasts": [
--     {
--       "sectionId": "ch1",
--       "title": "Introduction to Biology",
--       "confidence": 0.88,
--       "reason": "Narrative structure suitable for audio format",
--       "pageRange": { "start": 1, "end": 25 },
--       "estimatedDuration": "12 minutes"
--     }
--   ],
--   "mindmaps": [
--     {
--       "sectionId": "ch2",
--       "title": "Cellular Processes",
--       "confidence": 0.92,
--       "reason": "Complex interconnected concepts with hierarchical relationships",
--       "pageRange": { "start": 26, "end": 50 },
--       "estimatedNodes": 35
--     }
--   ],
--   "generatedAt": "2025-01-31T12:00:00Z"
-- }

-- Example structure for structure_analysis JSONB:
-- {
--   "recommended": "toc",
--   "scores": {
--     "toc": 95,
--     "index": 78,
--     "bookmarks": 85,
--     "headings": 60
--   },
--   "reasoning": "Table of Contents is comprehensive with clear hierarchical structure. Covers all chapters with accurate page numbers.",
--   "detectedMethods": ["bookmarks", "toc", "headings"],
--   "fallbackUsed": false,
--   "analyzedAt": "2025-01-31T12:00:00Z"
-- }

-- Example structure for flashcards.source_section JSONB:
-- {
--   "chapter": "Chapter 1: Introduction",
--   "section": "1.2 Cell Structure",
--   "pageRange": { "start": 5, "end": 15 },
--   "tocPath": ["Introduction to Biology", "Cell Structure"],
--   "level": 2
-- }
