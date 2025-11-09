-- Migration: Add Synaptic Exam Simulator feature
-- Created: 2025-11-09
-- Purpose: Full mock exam and assessment system with timed exams, analytics, and question banks

-- ============================================================================
-- 1. EXAMS TABLE - Exam templates and configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Question source configuration
  question_source TEXT NOT NULL CHECK (question_source IN ('document', 'flashcards', 'bank', 'hybrid')),
  question_count INTEGER NOT NULL CHECK (question_count > 0 AND question_count <= 200),

  -- Difficulty and timing
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')) DEFAULT 'mixed',
  time_limit_minutes INTEGER CHECK (time_limit_minutes > 0),

  -- Metadata
  is_template BOOLEAN DEFAULT FALSE, -- Can be reused for multiple attempts
  tags TEXT[], -- For categorization (e.g., 'USMLE', 'Bar Exam', 'CPA')

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (title <> ''),
  CONSTRAINT valid_source_config CHECK (
    CASE
      WHEN question_source = 'document' THEN document_id IS NOT NULL
      WHEN question_source = 'flashcards' THEN document_id IS NOT NULL
      ELSE TRUE
    END
  )
);

CREATE INDEX idx_exams_user_id ON exams(user_id);
CREATE INDEX idx_exams_document_id ON exams(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX idx_exams_created_at ON exams(created_at DESC);
CREATE INDEX idx_exams_tags ON exams USING GIN(tags);

-- ============================================================================
-- 2. EXAM_QUESTIONS TABLE - Question bank with MCQ, True/False, Short Answer
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),

  -- Answer data
  correct_answer TEXT NOT NULL,
  options JSONB, -- Array of option strings for MCQ/True-False
  explanation TEXT, -- Rationale for the correct answer

  -- Source tracking (for PDF-generated questions)
  source_reference TEXT, -- e.g., "Page 12, Paragraph 4"
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Categorization
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT, -- Subject area or category
  tags TEXT[], -- Additional metadata

  -- Ordering
  question_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT question_text_not_empty CHECK (question_text <> ''),
  CONSTRAINT correct_answer_not_empty CHECK (correct_answer <> ''),
  CONSTRAINT mcq_must_have_options CHECK (
    question_type != 'mcq' OR (options IS NOT NULL AND jsonb_array_length(options) >= 2)
  ),
  CONSTRAINT valid_options_format CHECK (
    options IS NULL OR jsonb_typeof(options) = 'array'
  )
);

CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_difficulty ON exam_questions(difficulty);
CREATE INDEX idx_exam_questions_topic ON exam_questions(topic);
CREATE INDEX idx_exam_questions_tags ON exam_questions USING GIN(tags);
CREATE INDEX idx_exam_questions_order ON exam_questions(exam_id, question_order);

-- ============================================================================
-- 3. EXAM_ATTEMPTS TABLE - User exam sessions with answers
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

  -- Exam mode
  mode TEXT NOT NULL CHECK (mode IN ('timed', 'practice')),

  -- Results
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  correct_answers INTEGER CHECK (correct_answers >= 0 AND correct_answers <= total_questions),

  -- Timing
  time_taken_seconds INTEGER CHECK (time_taken_seconds >= 0),
  time_limit_seconds INTEGER,

  -- Answer data (JSONB array of answer objects)
  -- Format: [{question_id: UUID, user_answer: TEXT, is_correct: BOOLEAN, time_spent: INTEGER, flagged: BOOLEAN}]
  answers JSONB NOT NULL,

  -- Completion status
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_answers_format CHECK (jsonb_typeof(answers) = 'array'),
  CONSTRAINT completed_must_have_completion_time CHECK (
    status != 'completed' OR completed_at IS NOT NULL
  )
);

CREATE INDEX idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX idx_exam_attempts_started_at ON exam_attempts(started_at DESC);
CREATE INDEX idx_exam_attempts_score ON exam_attempts(score DESC);

-- ============================================================================
-- 4. EXAM_ANALYTICS TABLE - Question-level performance metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_analytics (
  question_id UUID PRIMARY KEY REFERENCES exam_questions(id) ON DELETE CASCADE,

  -- Performance metrics
  times_shown INTEGER NOT NULL DEFAULT 0 CHECK (times_shown >= 0),
  times_correct INTEGER NOT NULL DEFAULT 0 CHECK (times_correct >= 0),
  times_flagged INTEGER NOT NULL DEFAULT 0 CHECK (times_flagged >= 0),

  -- Timing analytics
  avg_time_seconds DECIMAL(10,2) CHECK (avg_time_seconds >= 0),
  total_time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_time_seconds >= 0),

  -- Derived metrics
  accuracy_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN times_shown > 0 THEN (times_correct::DECIMAL / times_shown) * 100
      ELSE 0
    END
  ) STORED,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT correct_cannot_exceed_shown CHECK (times_correct <= times_shown)
);

CREATE INDEX idx_exam_analytics_accuracy ON exam_analytics(accuracy_rate);
CREATE INDEX idx_exam_analytics_times_shown ON exam_analytics(times_shown DESC);

-- ============================================================================
-- 5. QUESTION_BANKS TABLE - Pre-built exam question libraries
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Bank metadata
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- 'Medical', 'Legal', 'Accounting', 'Engineering', etc.
  subcategory TEXT, -- 'USMLE Step 1', 'Bar Exam Torts', 'CPA Audit', etc.

  -- Access control
  is_public BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),

  -- Question count (cached for performance)
  total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),

  -- Metadata
  tags TEXT[],
  created_by TEXT, -- Admin user or system

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_question_banks_category ON question_banks(category);
CREATE INDEX idx_question_banks_subcategory ON question_banks(subcategory);
CREATE INDEX idx_question_banks_public ON question_banks(is_public);
CREATE INDEX idx_question_banks_tags ON question_banks USING GIN(tags);

-- Link questions to banks (many-to-many relationship)
CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,

  -- Question metadata specific to this bank
  difficulty_override TEXT CHECK (difficulty_override IN ('easy', 'medium', 'hard')),
  topic_override TEXT,

  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_question_per_bank UNIQUE(bank_id, question_id)
);

CREATE INDEX idx_question_bank_items_bank_id ON question_bank_items(bank_id);
CREATE INDEX idx_question_bank_items_question_id ON question_bank_items(question_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_items ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Users can view their own exams"
  ON exams FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create their own exams"
  ON exams FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update their own exams"
  ON exams FOR UPDATE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'))
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can delete their own exams"
  ON exams FOR DELETE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Exam questions policies (users can see questions for their exams)
CREATE POLICY "Users can view questions for their exams"
  ON exam_questions FOR SELECT
  USING (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can create questions for their exams"
  ON exam_questions FOR INSERT
  WITH CHECK (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can update questions for their exams"
  ON exam_questions FOR UPDATE
  USING (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

CREATE POLICY "Users can delete questions for their exams"
  ON exam_questions FOR DELETE
  USING (exam_id IN (SELECT id FROM exams WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')));

-- Exam attempts policies
CREATE POLICY "Users can view their own exam attempts"
  ON exam_attempts FOR SELECT
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create their own exam attempts"
  ON exam_attempts FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update their own exam attempts"
  ON exam_attempts FOR UPDATE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'))
  WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can delete their own exam attempts"
  ON exam_attempts FOR DELETE
  USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Analytics policies (read-only, auto-updated by triggers)
CREATE POLICY "Users can view analytics for their questions"
  ON exam_analytics FOR SELECT
  USING (
    question_id IN (
      SELECT eq.id FROM exam_questions eq
      INNER JOIN exams e ON eq.exam_id = e.id
      WHERE e.user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Question banks policies (public read, admin write)
CREATE POLICY "Anyone can view public question banks"
  ON question_banks FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Anyone can view public question bank items"
  ON question_bank_items FOR SELECT
  USING (bank_id IN (SELECT id FROM question_banks WHERE is_public = TRUE));

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Update exams.updated_at
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exams_timestamp
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_exams_updated_at();

-- Update question_banks.updated_at
CREATE OR REPLACE FUNCTION update_question_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_banks_timestamp
  BEFORE UPDATE ON question_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_question_banks_updated_at();

-- Update exam_analytics on exam_attempts completion
CREATE OR REPLACE FUNCTION update_exam_analytics()
RETURNS TRIGGER AS $$
DECLARE
  answer JSONB;
  question_record RECORD;
BEGIN
  -- Only process when exam is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Loop through each answer in the answers array
    FOR answer IN SELECT * FROM jsonb_array_elements(NEW.answers)
    LOOP
      -- Insert or update analytics for this question
      INSERT INTO exam_analytics (question_id, times_shown, times_correct, times_flagged, total_time_seconds, avg_time_seconds)
      VALUES (
        (answer->>'question_id')::UUID,
        1,
        CASE WHEN (answer->>'is_correct')::BOOLEAN THEN 1 ELSE 0 END,
        CASE WHEN (answer->>'flagged')::BOOLEAN THEN 1 ELSE 0 END,
        COALESCE((answer->>'time_spent')::INTEGER, 0),
        COALESCE((answer->>'time_spent')::INTEGER, 0)
      )
      ON CONFLICT (question_id) DO UPDATE SET
        times_shown = exam_analytics.times_shown + 1,
        times_correct = exam_analytics.times_correct + CASE WHEN (answer->>'is_correct')::BOOLEAN THEN 1 ELSE 0 END,
        times_flagged = exam_analytics.times_flagged + CASE WHEN (answer->>'flagged')::BOOLEAN THEN 1 ELSE 0 END,
        total_time_seconds = exam_analytics.total_time_seconds + COALESCE((answer->>'time_spent')::INTEGER, 0),
        avg_time_seconds = (exam_analytics.total_time_seconds + COALESCE((answer->>'time_spent')::INTEGER, 0))::DECIMAL / (exam_analytics.times_shown + 1),
        updated_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_attempt_completion
  AFTER INSERT OR UPDATE ON exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_analytics();

-- Update question_banks.total_questions counter
CREATE OR REPLACE FUNCTION update_question_bank_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE question_banks SET total_questions = total_questions + 1 WHERE id = NEW.bank_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE question_banks SET total_questions = GREATEST(total_questions - 1, 0) WHERE id = OLD.bank_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_question_count
  AFTER INSERT OR DELETE ON question_bank_items
  FOR EACH ROW
  EXECUTE FUNCTION update_question_bank_count();

-- ============================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE exams IS 'Exam templates and configurations for mock exams';
COMMENT ON TABLE exam_questions IS 'Question bank with MCQ, True/False, and short answer questions';
COMMENT ON TABLE exam_attempts IS 'User exam sessions with answers and performance data';
COMMENT ON TABLE exam_analytics IS 'Question-level performance metrics and analytics';
COMMENT ON TABLE question_banks IS 'Pre-built question libraries for standardized exams';
COMMENT ON TABLE question_bank_items IS 'Many-to-many relationship between question banks and questions';

COMMENT ON COLUMN exams.question_source IS 'Source of questions: document (PDF), flashcards (convert), bank (pre-built), hybrid (mix)';
COMMENT ON COLUMN exam_questions.options IS 'JSONB array of answer options for MCQ/True-False questions';
COMMENT ON COLUMN exam_attempts.answers IS 'JSONB array: [{question_id, user_answer, is_correct, time_spent, flagged}]';
COMMENT ON COLUMN exam_analytics.accuracy_rate IS 'Auto-calculated: (times_correct / times_shown) * 100';
