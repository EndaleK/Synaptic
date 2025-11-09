-- ============================================================================
-- MIGRATION: Create Exam Simulator Tables
-- Run this in Supabase SQL Editor to add exam functionality
--
-- NOTE: Uses correct foreign key types to match your existing tables:
--   - user_id: BIGINT (references user_profiles.id)
--   - document_id: UUID (references documents.id)
-- ============================================================================

-- ============================================================================
-- EXAMS TABLE
-- ============================================================================
-- Stores exam templates and configurations
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  question_source TEXT NOT NULL CHECK (question_source IN ('document', 'flashcards', 'bank', 'hybrid')),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  difficulty TEXT DEFAULT 'mixed' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  time_limit_minutes INTEGER CHECK (time_limit_minutes > 0),
  is_template BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EXAM QUESTIONS TABLE
-- ============================================================================
-- Stores individual questions for each exam
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
  correct_answer TEXT NOT NULL,
  options TEXT[], -- Array for MCQ/True-False options
  explanation TEXT,
  source_reference TEXT, -- e.g., "Page 12, Paragraph 4"
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EXAM ATTEMPTS TABLE
-- ============================================================================
-- Tracks user exam sessions and results
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('timed', 'practice')),
  score NUMERIC(5, 2) CHECK (score >= 0 AND score <= 100), -- 0-100
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER,
  time_taken_seconds INTEGER,
  time_limit_seconds INTEGER,
  answers JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of ExamAnswer objects
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- EXAM ANALYTICS TABLE
-- ============================================================================
-- Tracks question-level performance across attempts
CREATE TABLE IF NOT EXISTS exam_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_flagged INTEGER DEFAULT 0,
  avg_time_seconds NUMERIC(10, 2),
  total_time_seconds INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5, 2) DEFAULT 0.0, -- Auto-calculated: (times_correct / times_shown) * 100
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_document_id ON exams(document_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_analytics_user_question ON exam_analytics(user_id, question_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all exam tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_analytics ENABLE ROW LEVEL SECURITY;

-- Exams: Users can only access their own exams
CREATE POLICY "Users can view own exams" ON exams
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own exams" ON exams
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Exam questions: Inherit access from parent exam
CREATE POLICY "Users can view questions from own exams" ON exam_questions
  FOR SELECT USING (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can manage questions from own exams" ON exam_questions
  FOR ALL USING (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

-- Exam attempts: Users can only access their own attempts
CREATE POLICY "Users can view own exam attempts" ON exam_attempts
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own exam attempts" ON exam_attempts
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Exam analytics: Users can only access their own analytics
CREATE POLICY "Users can view own exam analytics" ON exam_analytics
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own exam analytics" ON exam_analytics
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================
-- Trigger to auto-update updated_at on exams table
CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on exam_analytics table
CREATE TRIGGER update_exam_analytics_updated_at
  BEFORE UPDATE ON exam_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify tables were created:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'exam%';
--
-- Expected result: exams, exam_questions, exam_attempts, exam_analytics
-- ============================================================================
