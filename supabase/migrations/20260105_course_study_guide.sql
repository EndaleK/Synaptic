-- Migration: Course & Study Guide Generator
-- Created: 2026-01-05
-- Purpose: Add tables for course syllabi and educational resources

-- ============================================================================
-- Table: course_syllabi
-- Stores AI-generated or web-scraped course syllabi
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Course metadata
  university TEXT,
  program TEXT,
  course_code TEXT,
  course_name TEXT NOT NULL,
  semester TEXT,
  year INTEGER,

  -- Generation source
  source_type TEXT CHECK (source_type IN ('web_search', 'ai_generated', 'user_input')),
  source_urls JSONB DEFAULT '[]',  -- URLs scraped for this syllabus

  -- Syllabus content
  course_description TEXT,
  learning_objectives JSONB DEFAULT '[]',
  -- Format: ["Understand X", "Apply Y", ...]

  weekly_schedule JSONB NOT NULL DEFAULT '[]',
  -- Format: [{
  --   week: 1,
  --   topic: "Introduction to...",
  --   readings: ["Chapter 1", "Article X"],
  --   assignments: ["Problem Set 1"],
  --   learningObjectives: ["..."]
  -- }]

  textbooks JSONB DEFAULT '[]',
  -- Format: [{title, authors, isbn, required: boolean}]

  additional_resources JSONB DEFAULT '[]',
  -- Format: [{title, url, type, source}]

  grading_scheme JSONB DEFAULT '{}',
  -- Format: {exams: 40, assignments: 30, participation: 10, ...}

  -- AI processing metadata
  generation_model TEXT,
  confidence_score DECIMAL(3,2),  -- 0.00-1.00

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for course_syllabi
CREATE INDEX IF NOT EXISTS idx_course_syllabi_user ON course_syllabi(user_id);
CREATE INDEX IF NOT EXISTS idx_course_syllabi_university ON course_syllabi(university);
CREATE INDEX IF NOT EXISTS idx_course_syllabi_course ON course_syllabi(course_code);
CREATE INDEX IF NOT EXISTS idx_course_syllabi_created ON course_syllabi(created_at DESC);

-- ============================================================================
-- Table: educational_resources
-- Caches resources from external APIs (OpenLibrary, MIT OCW, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS educational_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Resource identification
  external_id TEXT NOT NULL,  -- ID from source API
  source TEXT NOT NULL CHECK (source IN (
    'openlibrary',
    'google_books',
    'mit_ocw',
    'khan_academy',
    'coursera',
    'openstax'
  )),

  -- Resource metadata
  title TEXT NOT NULL,
  authors JSONB DEFAULT '[]',
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Classification
  subject TEXT,
  level TEXT CHECK (level IN (
    'elementary',
    'middle_school',
    'high_school',
    'undergraduate',
    'graduate',
    'professional'
  )),
  topics JSONB DEFAULT '[]',

  -- Resource type
  resource_type TEXT CHECK (resource_type IN (
    'textbook',
    'video_course',
    'article',
    'practice',
    'lecture',
    'ebook',
    'open_course'
  )),

  -- Quality indicators
  rating DECIMAL(3,2),
  reviews_count INTEGER,

  -- Cache management
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  UNIQUE(source, external_id)
);

-- Indexes for educational_resources
CREATE INDEX IF NOT EXISTS idx_educational_resources_subject ON educational_resources(subject);
CREATE INDEX IF NOT EXISTS idx_educational_resources_level ON educational_resources(level);
CREATE INDEX IF NOT EXISTS idx_educational_resources_source ON educational_resources(source);
CREATE INDEX IF NOT EXISTS idx_educational_resources_expires ON educational_resources(expires_at);

-- ============================================================================
-- Extend study_plans table
-- ============================================================================
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS syllabus_id UUID REFERENCES course_syllabi(id) ON DELETE SET NULL;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'document' CHECK (plan_type IN ('document', 'course', 'self_study'));
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS recommended_resources JSONB DEFAULT '[]';

-- Index for syllabus-based plans
CREATE INDEX IF NOT EXISTS idx_study_plans_syllabus ON study_plans(syllabus_id) WHERE syllabus_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on course_syllabi
ALTER TABLE course_syllabi ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own syllabi
CREATE POLICY "Users can view own syllabi"
  ON course_syllabi
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Policy: Users can insert their own syllabi
CREATE POLICY "Users can insert own syllabi"
  ON course_syllabi
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Policy: Users can update their own syllabi
CREATE POLICY "Users can update own syllabi"
  ON course_syllabi
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Policy: Users can delete their own syllabi
CREATE POLICY "Users can delete own syllabi"
  ON course_syllabi
  FOR DELETE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Enable RLS on educational_resources (public read, system write)
ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read educational resources (cached public data)
CREATE POLICY "Public can read educational resources"
  ON educational_resources
  FOR SELECT
  USING (true);

-- Policy: System can insert/update educational resources
CREATE POLICY "System can manage educational resources"
  ON educational_resources
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- Trigger: Update updated_at on course_syllabi
-- ============================================================================
CREATE OR REPLACE FUNCTION update_course_syllabi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_course_syllabi_updated_at
  BEFORE UPDATE ON course_syllabi
  FOR EACH ROW
  EXECUTE FUNCTION update_course_syllabi_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE course_syllabi IS 'Stores AI-generated or web-scraped course syllabi for study plan generation';
COMMENT ON TABLE educational_resources IS 'Caches educational resources from external APIs with 7-day TTL';
COMMENT ON COLUMN course_syllabi.source_type IS 'How the syllabus was created: web_search, ai_generated, or user_input';
COMMENT ON COLUMN course_syllabi.confidence_score IS 'AI confidence in generated syllabus (0.00-1.00)';
COMMENT ON COLUMN educational_resources.expires_at IS 'Cache expiration time, default 7 days from fetch';
