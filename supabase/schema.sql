-- Supabase Database Schema for AI Learning Platform
-- This schema supports user profiles, learning styles, document management, and generated content

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS PROFILE TABLE
-- ============================================================================
-- This table extends Clerk authentication with additional user preferences
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL, -- Links to Clerk user
  email TEXT NOT NULL,
  full_name TEXT,
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed')),
  preferred_mode TEXT CHECK (preferred_mode IN ('flashcards', 'chat', 'podcast', 'mindmap')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  documents_used_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEARNING PROFILES TABLE
-- ============================================================================
-- Stores learning style assessment results and preferences
CREATE TABLE IF NOT EXISTS learning_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  quiz_responses JSONB NOT NULL, -- Stores all quiz Q&A
  visual_score INTEGER DEFAULT 0,
  auditory_score INTEGER DEFAULT 0,
  kinesthetic_score INTEGER DEFAULT 0,
  reading_writing_score INTEGER DEFAULT 0,
  dominant_style TEXT NOT NULL,
  learning_preferences JSONB, -- Additional preferences (pace, difficulty, etc.)
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, assessment_date)
);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
-- Stores uploaded documents and their metadata
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, docx, txt, etc.
  file_size INTEGER NOT NULL,
  extracted_text TEXT, -- Extracted text content
  document_summary TEXT, -- AI-generated summary
  storage_path TEXT, -- Path in Supabase storage
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  source_url TEXT, -- Original URL if imported from web
  source_type TEXT CHECK (source_type IN ('arxiv', 'youtube', 'web', 'medium', 'pdf-url', 'unknown')),
  metadata JSONB DEFAULT '{}'::jsonb, -- Rich metadata for imported content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FLASHCARDS TABLE
-- ============================================================================
-- Stores generated flashcards linked to documents
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE, -- Spaced repetition
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CHAT HISTORY TABLE
-- ============================================================================
-- Stores chat conversations with documents
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- Groups messages in a conversation
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  teaching_mode TEXT DEFAULT 'direct' CHECK (teaching_mode IN ('direct', 'socratic', 'guided')),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PODCASTS TABLE
-- ============================================================================
-- Stores generated podcast content and metadata
CREATE TABLE IF NOT EXISTS podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  script TEXT NOT NULL, -- Generated podcast script
  voice_id TEXT NOT NULL, -- OpenAI TTS voice used
  audio_url TEXT, -- URL to stored audio file
  duration_seconds INTEGER,
  file_size INTEGER,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MINDMAPS TABLE
-- ============================================================================
-- Stores generated mind map data structures
CREATE TABLE IF NOT EXISTS mindmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nodes JSONB NOT NULL, -- Array of nodes with id, label, level
  edges JSONB NOT NULL, -- Array of edges connecting nodes
  layout_data JSONB, -- Stores position and styling
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USAGE TRACKING TABLE
-- ============================================================================
-- Tracks API usage for billing and rate limiting
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- flashcard_generation, podcast_generation, chat_message, etc.
  tokens_used INTEGER,
  credits_used INTEGER DEFAULT 1,
  metadata JSONB, -- Additional tracking data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);
CREATE INDEX idx_user_profiles_stripe_id ON user_profiles(stripe_customer_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_document_id ON flashcards(document_id);
CREATE INDEX idx_chat_history_session ON chat_history(session_id);
CREATE INDEX idx_chat_history_user_doc ON chat_history(user_id, document_id);
CREATE INDEX idx_podcasts_user_id ON podcasts(user_id);
CREATE INDEX idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (clerk_user_id = auth.jwt()->>'sub');

-- Learning profiles: Users can only access their own learning data
CREATE POLICY "Users can view own learning profiles" ON learning_profiles
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own learning profiles" ON learning_profiles
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Documents: Users can only access their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Similar policies for other tables (flashcards, chat_history, podcasts, mindmaps)
-- Flashcards
CREATE POLICY "Users can view own flashcards" ON flashcards
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own flashcards" ON flashcards
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Chat history
CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own chat messages" ON chat_history
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Podcasts
CREATE POLICY "Users can view own podcasts" ON podcasts
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own podcasts" ON podcasts
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Mindmaps
CREATE POLICY "Users can view own mindmaps" ON mindmaps
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own mindmaps" ON mindmaps
  FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- Usage tracking
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mindmaps_updated_at BEFORE UPDATE ON mindmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset monthly document count (run via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_document_count()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET documents_used_this_month = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Note: These need to be created via Supabase Dashboard or API
-- - documents: For storing uploaded files
-- - podcasts: For storing generated audio files
-- - exports: For storing exported flashcards, mind maps, etc.
