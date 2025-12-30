/**
 * TypeScript types for the Agentic Teacher
 */

// Tool execution status
export type ToolExecutionStatus =
  | 'pending'    // Waiting for user approval
  | 'approved'   // User accepted, ready to execute
  | 'rejected'   // User declined
  | 'executing'  // Currently running
  | 'completed'  // Finished successfully
  | 'failed'     // Encountered error

// Study modes the teacher can navigate to
export type StudyMode =
  | 'home'
  | 'chat'
  | 'flashcards'
  | 'podcast'
  | 'mindmap'
  | 'quiz'
  | 'quick-summary'
  | 'study-guide'
  | 'writer'
  | 'video'

// Tool names available to the teacher
export type TeacherToolName =
  | 'generate_flashcards'
  | 'generate_podcast'
  | 'generate_mindmap'
  | 'generate_quiz'
  | 'generate_quick_summary'
  | 'start_review_session'
  | 'search_documents'
  | 'explain_concept'
  | 'create_study_plan'
  | 'switch_mode'

// Tool parameter definitions
export interface GenerateFlashcardsParams {
  documentId: string
  topicFilter?: string
  count?: number
}

export interface GeneratePodcastParams {
  documentId: string
  topics?: string[]
  style?: 'conversational' | 'lecture' | 'interview'
}

export interface GenerateMindmapParams {
  documentId: string
  focusTopic?: string
}

export interface GenerateQuizParams {
  documentId: string
  difficulty?: 'easy' | 'medium' | 'hard'
  count?: number
}

export interface GenerateQuickSummaryParams {
  documentId?: string
  url?: string
}

export interface StartReviewSessionParams {
  documentId?: string
  cardCount?: number
}

export interface SearchDocumentsParams {
  query: string
}

export interface ExplainConceptParams {
  concept: string
  documentContext?: string
}

export interface CreateStudyPlanParams {
  goals: string[]
  timeframe?: string
}

export interface SwitchModeParams {
  mode: StudyMode
  documentId?: string
}

// Union type of all tool parameters
export type ToolParams =
  | GenerateFlashcardsParams
  | GeneratePodcastParams
  | GenerateMindmapParams
  | GenerateQuizParams
  | GenerateQuickSummaryParams
  | StartReviewSessionParams
  | SearchDocumentsParams
  | ExplainConceptParams
  | CreateStudyPlanParams
  | SwitchModeParams

// Suggested action from the teacher
export interface SuggestedAction {
  id: string
  toolName: TeacherToolName
  toolInput: Record<string, unknown>
  explanation: string
  estimatedDuration?: string
  status: ToolExecutionStatus
  createdAt: string
}

// Tool execution result
export interface ToolExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string
}

// Agent response from chat
export interface AgentResponse {
  message: string
  suggestedActions: SuggestedAction[]
  contextUsed: string[]
  conversationId: string
}

// Agent context for building prompts
export interface AgentContext {
  userId: string
  userProfileId: string
  learningStyle?: {
    visual: number
    auditory: number
    kinesthetic: number
    dominant: 'visual' | 'auditory' | 'kinesthetic'
  }
  recentDocuments: {
    id: string
    fileName: string
    summary?: string
    fileType?: string
    createdAt?: string
  }[]
  studyStats: {
    currentStreak: number
    cardsReviewedToday: number
    totalCardsToReview: number
  }
  activeStudyPlan?: {
    id: string
    name: string
    currentProgress: number
  }
  conversationHistory: {
    role: 'user' | 'assistant'
    content: string
  }[]
}

// Database row type for tool executions
export interface TeacherToolExecution {
  id: string
  user_id: string
  conversation_id: string
  tool_name: TeacherToolName
  tool_input: Record<string, unknown>
  tool_output?: Record<string, unknown>
  status: ToolExecutionStatus
  explanation?: string
  error_message?: string
  suggested_at: string
  executed_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// Claude API tool definition format
export interface ClaudeToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
      items?: { type: string }
    }>
    required: string[]
  }
}

// Claude tool use response
export interface ClaudeToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

// Claude text response
export interface ClaudeTextBlock {
  type: 'text'
  text: string
}

// Claude response content
export type ClaudeContentBlock = ClaudeToolUse | ClaudeTextBlock
