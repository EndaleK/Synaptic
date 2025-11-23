// TypeScript Types for Supabase Database Tables
import type { SectionStructure } from '@/lib/document-parser/section-detector'

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
export type PreferredMode = 'home' | 'flashcards' | 'chat' | 'podcast' | 'mindmap' | 'writer' | 'video' | 'studyguide'
export type TeachingStylePreference = 'socratic' | 'direct' | 'mixed'
export type SubscriptionTier = 'free' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'needs_ocr'
export type MessageType = 'user' | 'assistant'
export type TeachingMode = 'direct' | 'socratic' | 'guided'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SourceType = 'arxiv' | 'youtube' | 'web' | 'medium' | 'pdf-url' | 'unknown'

// Writing Assistant Types
export type WritingType = 'academic' | 'professional' | 'creative'
export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver'
export type EssayStatus = 'draft' | 'reviewing' | 'final'
export type WritingStage = 'planning' | 'drafting' | 'revising' | 'editing' | 'publishing'
export type SuggestionType = 'grammar' | 'spelling' | 'structure' | 'tone' | 'citation' | 'clarity'
export type SuggestionSeverity = 'error' | 'warning' | 'suggestion'
export type MilestoneType = 'word_count' | 'stage_complete' | 'streak' | 'first_draft' | 'revision_count' | 'ai_independence' | 'session_duration'
export type CommentStatus = 'unresolved' | 'resolved'

// Video Learning Types
export type VideoProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UserProfile {
  id: string
  clerk_user_id: string
  email: string
  full_name?: string
  learning_style?: LearningStyle
  preferred_mode?: PreferredMode
  subscription_tier: SubscriptionTier
  stripe_customer_id?: string
  subscription_status: SubscriptionStatus
  documents_used_this_month: number
  created_at: string
  updated_at: string
}

export interface LearningProfile {
  id: string
  user_id: string
  quiz_responses: Record<string, any>
  visual_score: number
  auditory_score: number
  kinesthetic_score: number
  reading_writing_score: number
  dominant_style: LearningStyle
  teaching_style_preference?: TeachingStylePreference
  socratic_percentage?: number
  teaching_style_scores?: {
    socratic: number
    direct: number
  }
  learning_preferences?: Record<string, any>
  assessment_date: string
}

export interface Document {
  id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  extracted_text?: string
  document_summary?: string
  storage_path?: string
  processing_status: ProcessingStatus
  error_message?: string
  source_url?: string
  source_type?: SourceType
  metadata?: Record<string, any>
  sections?: SectionStructure
  // RAG (Retrieval-Augmented Generation) fields for large document indexing
  rag_indexed?: boolean
  rag_collection_name?: string
  rag_chunk_count?: number
  rag_indexed_at?: string
  rag_indexing_error?: string
  // Enhanced features
  is_starred?: boolean
  is_deleted?: boolean
  deleted_at?: string
  last_accessed_at?: string
  tags?: string[]
  folder_id?: string | null
  created_at: string
  updated_at: string
}

// Type for inserting new documents (omit auto-generated fields)
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>

export type FlashcardType = 'qa' | 'cloze' | 'multiple-choice' | 'image-occlusion'
export type MaturityLevel = 'new' | 'learning' | 'young' | 'mature'

export interface SourceReference {
  page?: number
  section?: string
  excerpt?: string
  chunk?: number
}

export interface ReviewRecord {
  date: string
  quality: number // 0-5 (SM-2 scale)
  interval: number // days
}

export interface Flashcard {
  id: string
  user_id: string
  document_id: string

  // Card content (Q&A format)
  front: string
  back: string

  // Card type and format-specific fields
  card_type: FlashcardType
  cloze_text?: string           // For cloze deletion: "The {{c1::mitochondria}} is..."
  cloze_indices?: number[]      // Which clozes to show: [1, 2]
  mc_options?: string[]         // Multiple choice options (4 items)
  mc_correct_index?: number     // Correct answer index (0-3)
  mc_explanation?: string       // Explanation for MC answer

  // Source references
  source_page?: number
  source_section?: string
  source_excerpt?: string
  source_chunk?: number

  // Legacy difficulty (user-set or manual)
  difficulty?: Difficulty

  // Auto-detected difficulty (easy/medium/hard)
  auto_difficulty?: 'easy' | 'medium' | 'hard'

  // Legacy review tracking (kept for backwards compatibility)
  times_reviewed: number
  times_correct: number
  last_reviewed_at?: string
  next_review_at?: string

  // Enhanced SM-2 fields
  ease_factor: number           // 1.3-5.0, default 2.5
  interval_days: number         // Current interval
  repetitions: number           // Consecutive correct reviews
  last_quality_rating?: number  // 0-5 scale
  maturity_level: MaturityLevel // new → learning → young → mature
  review_history: ReviewRecord[] // Full history

  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  document_id: string
  session_id: string
  message_type: MessageType
  content: string
  teaching_mode: TeachingMode
  tokens_used?: number
  created_at: string
}

export interface Podcast {
  id: string
  user_id: string
  document_id: string
  title: string
  script: string
  voice_id: string
  audio_url?: string
  duration_seconds?: number
  file_size?: number
  generation_status: ProcessingStatus
  play_count: number
  created_at: string
}

export type MindMapType = 'hierarchical' | 'radial' | 'concept'

export interface MindMap {
  id: string
  user_id: string
  document_id: string
  title: string
  map_type: MindMapType // Type of mind map layout
  nodes: Array<{
    id: string
    label: string
    level: number
    [key: string]: any
  }>
  edges: Array<{
    source: string
    target: string
    label?: string // For concept maps (labeled relationships)
    [key: string]: any
  }>
  layout_data?: Record<string, any>
  layout_config?: {
    // Hierarchical-specific
    direction?: 'TB' | 'LR' | 'BT' | 'RL'
    spacing?: number
    // Radial-specific
    angleStart?: number
    angleEnd?: number
    radiusStep?: number
    // Concept map-specific (force-directed)
    strength?: number
    distance?: number
    iterations?: number
    [key: string]: any
  }
  view_count: number
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  user_id: string
  action_type: string
  tokens_used?: number
  credits_used: number
  metadata?: Record<string, any>
  created_at: string
}

// ============================================================================
// WRITING ASSISTANT INTERFACES
// ============================================================================

export interface WritingSuggestion {
  id: string
  type: SuggestionType
  severity: SuggestionSeverity
  message: string
  start_position: number
  end_position: number
  replacement?: string
  explanation?: string
}

export interface Citation {
  id: string
  document_id?: string
  author: string
  title: string
  publication_date?: string
  publisher?: string
  url?: string
  doi?: string
  pages?: string
  access_date?: string
  custom_fields?: Record<string, string>
}

export interface EssayVersion {
  version_number: number
  content: string
  timestamp: string
  word_count: number
}

export interface WritingGoals {
  target_word_count?: number
  target_date?: string
  daily_word_count_goal?: number
}

export interface SubmissionMetadata {
  submitted_at?: string
  submitted_to?: string
  ai_disclosure?: string
  turnitin_score?: number
}

export interface Essay {
  id: string
  user_id: string
  document_id?: string
  title: string
  content: string
  writing_type: WritingType
  citation_style?: CitationStyle
  word_count: number
  status: EssayStatus
  writing_stage: WritingStage
  ai_contribution_percentage: number
  original_word_count: number
  ai_assisted_word_count: number
  writing_goals: WritingGoals
  submission_metadata: SubmissionMetadata
  ai_suggestions: WritingSuggestion[]
  cited_sources: Citation[]
  version_history: EssayVersion[]
  created_at: string
  updated_at: string
}

export interface WritingSession {
  id: string
  essay_id: string
  user_id: string
  writing_stage: WritingStage
  started_at: string
  ended_at?: string
  words_written: number
  ai_suggestions_accepted: number
  ai_suggestions_dismissed: number
  duration_seconds?: number
  created_at: string
}

export interface WritingMilestone {
  id: string
  user_id: string
  essay_id?: string
  milestone_type: MilestoneType
  metadata: Record<string, any>
  achieved_at: string
}

export interface EssayComment {
  id: string
  essay_id: string
  commenter_id: string
  parent_comment_id?: string
  text_selection_start?: number
  text_selection_end?: number
  comment_text: string
  status: CommentStatus
  created_at: string
  updated_at: string
  resolved_at?: string
  resolved_by?: string
}

// ============================================================================
// VIDEO LEARNING INTERFACES
// ============================================================================

export interface VideoKeyPoint {
  timestamp: number
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  category?: 'concept' | 'example' | 'definition' | 'application' | 'insight'
}

export interface VideoTranscriptLine {
  start_time: number
  end_time: number
  text: string
}

export interface Video {
  id: string
  user_id: string
  video_url: string
  video_id: string
  title: string
  channel_name?: string
  duration_seconds: number
  thumbnail_url?: string
  transcript: VideoTranscriptLine[]
  summary?: string
  key_points: VideoKeyPoint[]
  generated_flashcard_ids: string[]
  processing_status: VideoProcessingStatus
  error_message?: string
  is_favorited?: boolean
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  topics_covered?: string[]
  prerequisites?: string[]
  learning_outcomes?: string[]
  key_vocabulary?: Array<{ term: string; definition: string }>
  created_at: string
  updated_at: string
}

// ============================================================================
// EXAM SIMULATOR INTERFACES
// ============================================================================

// Exam-specific enum types
export type QuestionSource = 'document' | 'flashcards' | 'bank' | 'hybrid'
export type QuestionType = 'mcq' | 'true_false' | 'short_answer'
export type ExamMode = 'timed' | 'practice'
export type ExamStatus = 'in_progress' | 'completed' | 'abandoned'
export type ExamDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'

// User's answer to a single question (stored in exam_attempts.answers JSONB array)
export interface ExamAnswer {
  question_id: string
  user_answer: string
  is_correct: boolean
  time_spent: number // seconds
  flagged: boolean
}

// Exam template/configuration
export interface Exam {
  id: string
  user_id: number
  title: string
  description?: string
  document_id?: string
  question_source: QuestionSource
  question_count: number
  difficulty: ExamDifficulty
  time_limit_minutes?: number
  is_template: boolean
  is_favorited?: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

// Individual exam question with answer options
export interface ExamQuestion {
  id: string
  exam_id: string
  question_text: string
  question_type: QuestionType
  correct_answer: string
  options?: string[] // JSONB array for MCQ/True-False
  explanation?: string
  source_reference?: string // e.g., "Page 12, Paragraph 4"
  source_document_id?: string
  difficulty?: Difficulty
  topic?: string
  tags: string[]
  question_order: number
  created_at: string
}

// User's exam session/attempt
export interface ExamAttempt {
  id: string
  user_id: number
  exam_id: string
  mode: ExamMode
  score?: number // 0-100
  total_questions: number
  correct_answers?: number
  time_taken_seconds?: number
  time_limit_seconds?: number
  answers: ExamAnswer[] // JSONB array of user answers
  status: ExamStatus
  started_at: string
  completed_at?: string
}

// Question-level performance analytics
export interface ExamAnalytics {
  question_id: string
  times_shown: number
  times_correct: number
  times_flagged: number
  avg_time_seconds?: number
  total_time_seconds: number
  accuracy_rate: number // Auto-calculated: (times_correct / times_shown) * 100
  updated_at: string
}

// Pre-built question library
export interface QuestionBank {
  id: string
  name: string
  description?: string
  category: string // 'Medical', 'Legal', 'Accounting', etc.
  subcategory?: string // 'USMLE Step 1', 'Bar Exam Torts', etc.
  is_public: boolean
  subscription_tier?: SubscriptionTier
  total_questions: number
  tags: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

// Many-to-many relationship between question banks and questions
export interface QuestionBankItem {
  id: string
  bank_id: string
  question_id: string
  difficulty_override?: Difficulty
  topic_override?: string
  added_at: string
}

// Type for inserting new exams (omit auto-generated fields)
export type ExamInsert = Omit<Exam, 'id' | 'created_at' | 'updated_at'>

// Type for inserting new exam questions (omit auto-generated fields)
export type ExamQuestionInsert = Omit<ExamQuestion, 'id' | 'created_at'>

// Type for inserting new exam attempts (omit auto-generated fields)
export type ExamAttemptInsert = Omit<ExamAttempt, 'id' | 'started_at' | 'completed_at'>

// Type for updating exam attempts (commonly used when completing an exam)
export type ExamAttemptUpdate = Partial<Omit<ExamAttempt, 'id' | 'user_id' | 'exam_id' | 'started_at'>>
