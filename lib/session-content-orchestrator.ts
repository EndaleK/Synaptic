/**
 * Session Content Orchestrator
 *
 * Handles lazy generation of content for study plan sessions.
 * When a session is started, this orchestrator:
 * 1. Checks for existing content in study_session_content
 * 2. Generates missing content using existing APIs
 * 3. Returns all content for the session
 *
 * Content types:
 * - flashcards: Topic-focused flashcard set
 * - podcast: Audio summary of the topic
 * - mindmap: Visual concept map
 * - daily_quiz: 5-10 quick questions on the topic
 * - weekly_exam: Comprehensive exam covering the week's topics
 */

import { createClient } from '@/lib/supabase/server'
import type { TopicPageRange } from '@/lib/study-plan-generator'

// ============================================
// Types
// ============================================

export type ContentType = 'flashcards' | 'podcast' | 'mindmap' | 'daily_quiz' | 'weekly_exam'
export type ContentStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'skipped'

export interface SessionContentRecord {
  id: string
  sessionId: string
  userId: string
  contentType: ContentType
  contentId: string | null
  topicFocus: string | null
  status: ContentStatus
  errorMessage: string | null
  generatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionContentRequest {
  sessionId: string
  userId: string
  documentId: string
  topicFocus: string
  topicPages?: TopicPageRange
  generateTypes: ContentType[]
}

export interface GeneratedContent {
  flashcards?: {
    id: string
    count: number
    setName: string
  }
  podcast?: {
    id: string
    duration: number
    title: string
  }
  mindmap?: {
    id: string
    nodeCount: number
    title: string
  }
  dailyQuiz?: {
    id: string
    questionCount: number
  }
  weeklyExam?: {
    id: string
    questionCount: number
  }
}

export interface SessionContentResult {
  sessionId: string
  content: GeneratedContent
  status: Record<ContentType, ContentStatus>
  allReady: boolean
}

// ============================================
// Content Record Management
// ============================================

/**
 * Get existing content records for a session.
 */
export async function getSessionContentRecords(
  sessionId: string,
  userId: string
): Promise<SessionContentRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('study_session_content')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)

  if (error) {
    console.error('[SessionContentOrchestrator] Error fetching content records:', error)
    return []
  }

  return (data || []).map((record) => ({
    id: record.id,
    sessionId: record.session_id,
    userId: record.user_id,
    contentType: record.content_type as ContentType,
    contentId: record.content_id,
    topicFocus: record.topic_focus,
    status: record.status as ContentStatus,
    errorMessage: record.error_message,
    generatedAt: record.generated_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }))
}

/**
 * Create or update a content record.
 */
export async function upsertContentRecord(
  sessionId: string,
  userId: string,
  contentType: ContentType,
  updates: {
    contentId?: string | null
    topicFocus?: string | null
    status?: ContentStatus
    errorMessage?: string | null
  }
): Promise<SessionContentRecord | null> {
  const supabase = await createClient()

  // Check if record exists
  const { data: existing } = await supabase
    .from('study_session_content')
    .select('id')
    .eq('session_id', sessionId)
    .eq('content_type', contentType)
    .single()

  if (existing) {
    // Update existing
    const updateData: Record<string, unknown> = {}
    if (updates.contentId !== undefined) updateData.content_id = updates.contentId
    if (updates.topicFocus !== undefined) updateData.topic_focus = updates.topicFocus
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage
    if (updates.status === 'ready') updateData.generated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('study_session_content')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('[SessionContentOrchestrator] Error updating content record:', error)
      return null
    }

    return data ? mapContentRecord(data) : null
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('study_session_content')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content_type: contentType,
        content_id: updates.contentId ?? null,
        topic_focus: updates.topicFocus ?? null,
        status: updates.status ?? 'pending',
        error_message: updates.errorMessage ?? null,
        generated_at: updates.status === 'ready' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[SessionContentOrchestrator] Error creating content record:', error)
      return null
    }

    return data ? mapContentRecord(data) : null
  }
}

function mapContentRecord(record: Record<string, unknown>): SessionContentRecord {
  return {
    id: record.id as string,
    sessionId: record.session_id as string,
    userId: record.user_id as string,
    contentType: record.content_type as ContentType,
    contentId: record.content_id as string | null,
    topicFocus: record.topic_focus as string | null,
    status: record.status as ContentStatus,
    errorMessage: record.error_message as string | null,
    generatedAt: record.generated_at as string | null,
    createdAt: record.created_at as string,
    updatedAt: record.updated_at as string,
  }
}

// ============================================
// Content Generation
// ============================================

/**
 * Build selection data for content generation APIs.
 */
function buildSelectionData(topicFocus: string, topicPages?: TopicPageRange) {
  if (topicPages?.startPage && topicPages?.endPage) {
    return {
      type: 'pages' as const,
      pageRanges: [{ start: topicPages.startPage, end: topicPages.endPage }],
    }
  }

  // Fallback to topic-based selection
  return {
    type: 'topic' as const,
    topic: topicFocus,
  }
}

/**
 * Generate flashcards for a session topic.
 */
async function generateFlashcardsForSession(
  documentId: string,
  topicFocus: string,
  topicPages?: TopicPageRange,
  userId?: string
): Promise<{ id: string; count: number; setName: string } | null> {
  try {
    const selection = buildSelectionData(topicFocus, topicPages)

    // Call the flashcard generation API internally
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass user context for auth if needed
        ...(userId && { 'x-user-id': userId }),
      },
      body: JSON.stringify({
        documentId,
        selection,
        count: 15, // Generate 15 flashcards per session topic
        difficulty: 'mixed',
      }),
    })

    if (!response.ok) {
      console.error('[SessionContentOrchestrator] Flashcard generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    return {
      id: result.flashcardSetId || result.id,
      count: result.count || result.flashcards?.length || 0,
      setName: result.setName || topicFocus,
    }
  } catch (error) {
    console.error('[SessionContentOrchestrator] Error generating flashcards:', error)
    return null
  }
}

/**
 * Generate a podcast for a session topic.
 * Note: This is a long-running operation, should be called with SSE.
 */
async function generatePodcastForSession(
  documentId: string,
  topicFocus: string,
  topicPages?: TopicPageRange
): Promise<{ id: string; duration: number; title: string } | null> {
  try {
    const selection = buildSelectionData(topicFocus, topicPages)

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-podcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        selection,
        style: 'focused', // Short, focused podcast for the topic
        voiceSettings: {
          voice: 'nova',
          speed: 1.0,
        },
      }),
    })

    if (!response.ok) {
      console.error('[SessionContentOrchestrator] Podcast generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    return {
      id: result.podcastId || result.id,
      duration: result.duration || 0,
      title: result.title || topicFocus,
    }
  } catch (error) {
    console.error('[SessionContentOrchestrator] Error generating podcast:', error)
    return null
  }
}

/**
 * Generate a mind map for a session topic.
 */
async function generateMindmapForSession(
  documentId: string,
  topicFocus: string,
  topicPages?: TopicPageRange
): Promise<{ id: string; nodeCount: number; title: string } | null> {
  try {
    const selection = buildSelectionData(topicFocus, topicPages)

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-mindmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        selection,
        complexity: 'moderate', // Moderate complexity for session topics
      }),
    })

    if (!response.ok) {
      console.error('[SessionContentOrchestrator] Mindmap generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    return {
      id: result.mindmapId || result.id,
      nodeCount: result.nodeCount || 0,
      title: result.title || topicFocus,
    }
  } catch (error) {
    console.error('[SessionContentOrchestrator] Error generating mindmap:', error)
    return null
  }
}

/**
 * Generate a daily quiz for a session topic.
 */
async function generateDailyQuizForSession(
  documentId: string,
  topicFocus: string,
  topicPages?: TopicPageRange
): Promise<{ id: string; questionCount: number } | null> {
  try {
    const selection = buildSelectionData(topicFocus, topicPages)

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-exam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        selection,
        questionCount: 7, // 5-10 questions for daily quiz
        difficulty: 'medium',
        examType: 'daily_quiz',
        title: `Daily Quiz: ${topicFocus}`,
      }),
    })

    if (!response.ok) {
      console.error('[SessionContentOrchestrator] Daily quiz generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    return {
      id: result.examId || result.id,
      questionCount: result.questionCount || result.questions?.length || 0,
    }
  } catch (error) {
    console.error('[SessionContentOrchestrator] Error generating daily quiz:', error)
    return null
  }
}

// ============================================
// Main Orchestrator Functions
// ============================================

/**
 * Get current content for a session.
 * Does not generate new content, just returns what exists.
 */
export async function getSessionContent(
  sessionId: string,
  userId: string
): Promise<SessionContentResult> {
  const records = await getSessionContentRecords(sessionId, userId)

  const content: GeneratedContent = {}
  const status: Record<ContentType, ContentStatus> = {
    flashcards: 'pending',
    podcast: 'pending',
    mindmap: 'pending',
    daily_quiz: 'pending',
    weekly_exam: 'pending',
  }

  for (const record of records) {
    status[record.contentType] = record.status

    if (record.status === 'ready' && record.contentId) {
      switch (record.contentType) {
        case 'flashcards':
          content.flashcards = {
            id: record.contentId,
            count: 0, // Would need to fetch from flashcard_sets
            setName: record.topicFocus || '',
          }
          break
        case 'podcast':
          content.podcast = {
            id: record.contentId,
            duration: 0, // Would need to fetch from podcasts
            title: record.topicFocus || '',
          }
          break
        case 'mindmap':
          content.mindmap = {
            id: record.contentId,
            nodeCount: 0, // Would need to fetch from mindmaps
            title: record.topicFocus || '',
          }
          break
        case 'daily_quiz':
          content.dailyQuiz = {
            id: record.contentId,
            questionCount: 0, // Would need to fetch from exams
          }
          break
        case 'weekly_exam':
          content.weeklyExam = {
            id: record.contentId,
            questionCount: 0,
          }
          break
      }
    }
  }

  const allReady = Object.values(status).every((s) => s === 'ready' || s === 'skipped')

  return {
    sessionId,
    content,
    status,
    allReady,
  }
}

/**
 * Generate content for a session.
 * This is the main entry point for lazy content generation.
 *
 * @param request - The content generation request
 * @param onProgress - Optional callback for progress updates
 */
export async function generateSessionContent(
  request: SessionContentRequest,
  onProgress?: (type: ContentType, status: ContentStatus, message: string) => void
): Promise<SessionContentResult> {
  const { sessionId, userId, documentId, topicFocus, topicPages, generateTypes } = request

  const content: GeneratedContent = {}
  const status: Record<ContentType, ContentStatus> = {
    flashcards: 'pending',
    podcast: 'pending',
    mindmap: 'pending',
    daily_quiz: 'pending',
    weekly_exam: 'pending',
  }

  // Check existing content first
  const existingRecords = await getSessionContentRecords(sessionId, userId)
  const existingByType = new Map(existingRecords.map((r) => [r.contentType, r]))

  for (const contentType of generateTypes) {
    const existing = existingByType.get(contentType)

    // Skip if already ready or generating
    if (existing?.status === 'ready') {
      status[contentType] = 'ready'
      if (existing.contentId) {
        // Populate content from existing record
        switch (contentType) {
          case 'flashcards':
            content.flashcards = { id: existing.contentId, count: 0, setName: topicFocus }
            break
          case 'podcast':
            content.podcast = { id: existing.contentId, duration: 0, title: topicFocus }
            break
          case 'mindmap':
            content.mindmap = { id: existing.contentId, nodeCount: 0, title: topicFocus }
            break
          case 'daily_quiz':
            content.dailyQuiz = { id: existing.contentId, questionCount: 0 }
            break
          case 'weekly_exam':
            content.weeklyExam = { id: existing.contentId, questionCount: 0 }
            break
        }
      }
      continue
    }

    if (existing?.status === 'generating') {
      status[contentType] = 'generating'
      continue
    }

    // Mark as generating
    await upsertContentRecord(sessionId, userId, contentType, {
      status: 'generating',
      topicFocus,
    })
    status[contentType] = 'generating'
    onProgress?.(contentType, 'generating', `Generating ${contentType}...`)

    try {
      let result: { id: string; [key: string]: unknown } | null = null

      switch (contentType) {
        case 'flashcards':
          result = await generateFlashcardsForSession(documentId, topicFocus, topicPages, userId)
          if (result) {
            content.flashcards = result as GeneratedContent['flashcards']
          }
          break

        case 'podcast':
          result = await generatePodcastForSession(documentId, topicFocus, topicPages)
          if (result) {
            content.podcast = result as GeneratedContent['podcast']
          }
          break

        case 'mindmap':
          result = await generateMindmapForSession(documentId, topicFocus, topicPages)
          if (result) {
            content.mindmap = result as GeneratedContent['mindmap']
          }
          break

        case 'daily_quiz':
          result = await generateDailyQuizForSession(documentId, topicFocus, topicPages)
          if (result) {
            content.dailyQuiz = result as GeneratedContent['dailyQuiz']
          }
          break

        // Weekly exam is handled separately via the weekly exam API
        case 'weekly_exam':
          // Skip for now - will be implemented via study-plans/[id]/weekly-exam
          await upsertContentRecord(sessionId, userId, contentType, {
            status: 'skipped',
            topicFocus,
          })
          status[contentType] = 'skipped'
          continue
      }

      if (result) {
        await upsertContentRecord(sessionId, userId, contentType, {
          status: 'ready',
          contentId: result.id,
          topicFocus,
        })
        status[contentType] = 'ready'
        onProgress?.(contentType, 'ready', `${contentType} ready!`)
      } else {
        await upsertContentRecord(sessionId, userId, contentType, {
          status: 'failed',
          errorMessage: 'Generation returned no result',
          topicFocus,
        })
        status[contentType] = 'failed'
        onProgress?.(contentType, 'failed', `Failed to generate ${contentType}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await upsertContentRecord(sessionId, userId, contentType, {
        status: 'failed',
        errorMessage,
        topicFocus,
      })
      status[contentType] = 'failed'
      onProgress?.(contentType, 'failed', `Error: ${errorMessage}`)
    }
  }

  const allReady = generateTypes.every((type) => status[type] === 'ready' || status[type] === 'skipped')

  return {
    sessionId,
    content,
    status,
    allReady,
  }
}

/**
 * Get recommended content types based on learning style.
 */
export function getRecommendedContentTypes(
  learningStyle: string,
  hasDailyQuiz: boolean = true
): ContentType[] {
  const types: ContentType[] = []

  // Always include flashcards
  types.push('flashcards')

  // Add based on learning style
  switch (learningStyle) {
    case 'visual':
      types.push('mindmap')
      break
    case 'auditory':
      types.push('podcast')
      break
    case 'kinesthetic':
      // Kinesthetic learners benefit from quizzes/exams
      break
    case 'reading_writing':
      types.push('mindmap') // Helps with note-taking
      break
    case 'mixed':
    default:
      types.push('mindmap')
      types.push('podcast')
      break
  }

  // Add daily quiz if session has it
  if (hasDailyQuiz) {
    types.push('daily_quiz')
  }

  return types
}
