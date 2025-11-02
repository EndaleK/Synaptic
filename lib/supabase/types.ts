// TypeScript Types for Supabase Database Tables
import type { SectionStructure } from '@/lib/document-parser/section-detector'

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
export type PreferredMode = 'home' | 'flashcards' | 'chat' | 'podcast' | 'mindmap' | 'writer' | 'video'
export type TeachingStylePreference = 'socratic' | 'direct' | 'mixed'
export type SubscriptionTier = 'free' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MessageType = 'user' | 'assistant'
export type TeachingMode = 'direct' | 'socratic' | 'guided'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SourceType = 'arxiv' | 'youtube' | 'web' | 'medium' | 'pdf-url' | 'unknown'

// Writing Assistant Types
export type WritingType = 'academic' | 'professional' | 'creative'
export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver'
export type EssayStatus = 'draft' | 'reviewing' | 'final'
export type SuggestionType = 'grammar' | 'spelling' | 'structure' | 'tone' | 'citation' | 'clarity'
export type SuggestionSeverity = 'error' | 'warning' | 'suggestion'

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
  created_at: string
  updated_at: string
}

// Type for inserting new documents (omit auto-generated fields)
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>

export interface Flashcard {
  id: string
  user_id: string
  document_id: string
  front: string
  back: string
  difficulty?: Difficulty
  times_reviewed: number
  times_correct: number
  last_reviewed_at?: string
  next_review_at?: string
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

export interface MindMap {
  id: string
  user_id: string
  document_id: string
  title: string
  nodes: Array<{
    id: string
    label: string
    level: number
    [key: string]: any
  }>
  edges: Array<{
    source: string
    target: string
    [key: string]: any
  }>
  layout_data?: Record<string, any>
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
  ai_suggestions: WritingSuggestion[]
  cited_sources: Citation[]
  version_history: EssayVersion[]
  created_at: string
  updated_at: string
}

// ============================================================================
// VIDEO LEARNING INTERFACES
// ============================================================================

export interface VideoKeyPoint {
  timestamp: number
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
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
  created_at: string
  updated_at: string
}
