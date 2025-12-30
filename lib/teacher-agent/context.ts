/**
 * Context builder for the Agentic Teacher
 * Gathers user data to provide rich context for the agent
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AgentContext } from './types'
import { logger } from '@/lib/logger'

interface BuildContextParams {
  userId: string
  supabase: SupabaseClient
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

/**
 * Build comprehensive context for the teacher agent
 */
export async function buildAgentContext({
  userId,
  supabase,
  conversationHistory = []
}: BuildContextParams): Promise<AgentContext> {
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, current_streak, longest_streak')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  const userProfileId = profile.id

  // Fetch all context in parallel
  const [
    learningStyleResult,
    documentsResult,
    reviewQueueResult,
    studyPlanResult
  ] = await Promise.all([
    // Get learning style
    supabase
      .from('learning_profiles')
      .select('visual_score, auditory_score, kinesthetic_score, dominant_style')
      .eq('user_id', userProfileId)
      .single(),

    // Get all user documents (ordered by most recent)
    supabase
      .from('documents')
      .select('id, file_name, document_summary, file_type, created_at')
      .eq('user_id', userProfileId)
      .eq('processing_status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(50),

    // Get cards due for review
    supabase
      .from('review_queue')
      .select('id', { count: 'exact' })
      .eq('user_id', userProfileId)
      .lte('due_date', new Date().toISOString().split('T')[0]),

    // Get active study plan
    supabase
      .from('study_plans')
      .select('id, name, progress')
      .eq('user_id', userProfileId)
      .eq('status', 'active')
      .single()
  ])

  // Get cards reviewed today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: reviewedTodayCount } = await supabase
    .from('review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userProfileId)
    .gte('last_reviewed_at', todayStart.toISOString())

  // Build learning style
  const learningStyle = learningStyleResult.data
    ? {
        visual: learningStyleResult.data.visual_score || 33,
        auditory: learningStyleResult.data.auditory_score || 33,
        kinesthetic: learningStyleResult.data.kinesthetic_score || 34,
        dominant: (learningStyleResult.data.dominant_style || 'visual') as 'visual' | 'auditory' | 'kinesthetic'
      }
    : undefined

  // Build documents list
  const recentDocuments = (documentsResult.data || []).map(doc => ({
    id: doc.id,
    fileName: doc.file_name,
    summary: doc.document_summary || undefined,
    fileType: doc.file_type,
    createdAt: doc.created_at
  }))

  // Log documents found for debugging
  logger.info('Teacher agent context - documents found', {
    userProfileId,
    documentsCount: recentDocuments.length,
    documentNames: recentDocuments.map(d => d.fileName),
    documentsError: documentsResult.error?.message
  })

  // Build study stats
  const studyStats = {
    currentStreak: profile.current_streak || 0,
    cardsReviewedToday: reviewedTodayCount || 0,
    totalCardsToReview: reviewQueueResult.count || 0
  }

  // Build active study plan
  const activeStudyPlan = studyPlanResult.data
    ? {
        id: studyPlanResult.data.id,
        name: studyPlanResult.data.name,
        currentProgress: studyPlanResult.data.progress || 0
      }
    : undefined

  return {
    userId,
    userProfileId,
    learningStyle,
    recentDocuments,
    studyStats,
    activeStudyPlan,
    conversationHistory
  }
}

/**
 * Get a quick context summary for logging/debugging
 */
export function summarizeContext(context: AgentContext): string {
  return `User has ${context.recentDocuments.length} documents, ${context.studyStats.totalCardsToReview} cards due, ${context.studyStats.currentStreak}-day streak${context.learningStyle ? `, prefers ${context.learningStyle.dominant} learning` : ''}`
}

/**
 * Get document by ID from context or fetch from database
 */
export async function getDocumentFromContext(
  documentId: string,
  context: AgentContext,
  supabase: SupabaseClient
): Promise<{ id: string; fileName: string; text?: string } | null> {
  // Check if in context
  const docFromContext = context.recentDocuments.find(d => d.id === documentId)

  if (docFromContext) {
    // Fetch full text if needed
    const { data } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text')
      .eq('id', documentId)
      .single()

    return data ? {
      id: data.id,
      fileName: data.file_name,
      text: data.extracted_text
    } : null
  }

  // Not in recent documents, fetch directly
  const { data } = await supabase
    .from('documents')
    .select('id, file_name, extracted_text')
    .eq('id', documentId)
    .eq('user_id', context.userProfileId)
    .single()

  return data ? {
    id: data.id,
    fileName: data.file_name,
    text: data.extracted_text
  } : null
}
