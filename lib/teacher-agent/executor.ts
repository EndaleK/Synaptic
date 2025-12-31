/**
 * Tool Executor for the Agentic Teacher
 * Executes approved tool calls and returns results
 *
 * IMPORTANT: Uses direct function calls instead of HTTP requests to avoid
 * cookie forwarding issues in server-to-server calls.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  TeacherToolName,
  ToolExecutionResult,
  AgentContext,
  StudyMode
} from './types'
import { generateStudyPlan, saveStudyPlan, type GeneratePlanOptions } from '@/lib/study-plan-generator'
import { generateFlashcardsAuto } from '@/lib/ai-provider'
import { generateMindMapAuto } from '@/lib/ai-provider'
import { logger } from '@/lib/logger'

interface ExecuteToolParams {
  toolName: TeacherToolName
  toolInput: Record<string, unknown>
  context: AgentContext
  supabase: SupabaseClient
  baseUrl: string // Kept for backwards compatibility
  cookieHeader: string // Kept for backwards compatibility
}

/**
 * Execute a tool and return the result
 */
export async function executeTool({
  toolName,
  toolInput,
  context,
  supabase,
  baseUrl,
  cookieHeader
}: ExecuteToolParams): Promise<ToolExecutionResult> {
  logger.info('Executing teacher tool', {
    toolName,
    documentId: toolInput.documentId,
    userProfileId: context.userProfileId
  })

  try {
    switch (toolName) {
      case 'generate_flashcards':
        // Use direct function call instead of HTTP to avoid cookie issues
        return await executeGenerateFlashcardsDirect(toolInput, context, supabase)

      case 'generate_podcast':
        return await executeGeneratePodcast(toolInput)

      case 'generate_mindmap':
        // Use direct function call instead of HTTP to avoid cookie issues
        return await executeGenerateMindmapDirect(toolInput, context, supabase)

      case 'generate_quiz':
        return await executeGenerateQuiz(toolInput, baseUrl, cookieHeader)

      case 'generate_quick_summary':
        return await executeGenerateQuickSummary(toolInput)

      case 'start_review_session':
        return await executeStartReviewSession(toolInput, context)

      case 'search_documents':
        return await executeSearchDocuments(toolInput, context, supabase)

      case 'explain_concept':
        return await executeExplainConcept(toolInput, baseUrl, cookieHeader)

      case 'create_study_plan':
        return await executeCreateStudyPlan(toolInput, context, supabase)

      case 'switch_mode':
        return await executeSwitchMode(toolInput)

      default:
        logger.warn('Unknown tool requested', { toolName })
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        }
    }
  } catch (error) {
    logger.error(`Tool execution error for ${toolName}`, error, {
      toolName,
      documentId: toolInput.documentId
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate flashcards from a document using direct function calls
 * This avoids cookie forwarding issues with HTTP requests
 */
async function executeGenerateFlashcardsDirect(
  input: Record<string, unknown>,
  context: AgentContext,
  supabase: SupabaseClient
): Promise<ToolExecutionResult> {
  const documentId = input.documentId as string
  const count = (input.count as number) || 20

  logger.info('Generating flashcards directly', {
    documentId,
    count,
    userProfileId: context.userProfileId
  })

  // Get document text from database
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_name, extracted_text')
    .eq('id', documentId)
    .eq('user_id', context.userProfileId)
    .single()

  if (fetchError || !doc) {
    logger.error('Failed to fetch document for flashcards', fetchError, { documentId })
    return {
      success: false,
      error: 'Document not found. Please make sure you have access to this document.'
    }
  }

  if (!doc.extracted_text || doc.extracted_text.length === 0) {
    return {
      success: false,
      error: 'Document has no text content. Please try re-uploading the document.'
    }
  }

  // Generate flashcards using the AI provider
  const result = await generateFlashcardsAuto(doc.extracted_text, { count })

  if (!result.flashcards || result.flashcards.length === 0) {
    return {
      success: false,
      error: 'Failed to generate flashcards. Please try again.'
    }
  }

  // Save flashcards to database
  const flashcardsToInsert = result.flashcards.map(card => ({
    user_id: context.userProfileId,
    document_id: documentId,
    front: card.front,
    back: card.back,
    mastery_level: 'learning' as const,
    confidence_score: 0,
    times_reviewed: 0,
    times_correct: 0
  }))

  const { data: insertedCards, error: insertError } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert)
    .select('id')

  if (insertError) {
    logger.error('Failed to save flashcards to database', insertError)
    // Still return success since flashcards were generated
    return {
      success: true,
      data: {
        count: result.flashcards.length,
        documentId,
        saved: false
      },
      message: `Created ${result.flashcards.length} flashcards (not saved to database)`
    }
  }

  logger.info('Flashcards generated and saved successfully', {
    documentId,
    count: result.flashcards.length,
    provider: result.provider
  })

  return {
    success: true,
    data: {
      count: result.flashcards.length,
      documentId,
      saved: true,
      action: 'navigate',
      mode: 'flashcards' as StudyMode
    },
    message: `Created ${result.flashcards.length} flashcards from "${doc.file_name}"`
  }
}

/**
 * Generate a podcast from a document
 * Note: Podcast generation uses SSE streaming and is handled by the frontend
 * This action navigates the user to the podcast mode
 */
async function executeGeneratePodcast(
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  // Podcast generation uses SSE streaming, so we just navigate to podcast mode
  // The frontend will handle the actual generation
  return {
    success: true,
    data: {
      documentId: input.documentId,
      style: input.style || 'conversational',
      action: 'navigate',
      mode: 'podcast' as StudyMode
    },
    message: 'Ready to generate podcast. Opening podcast mode...'
  }
}

/**
 * Generate a mind map from a document using direct function calls
 * This avoids cookie forwarding issues with HTTP requests
 */
async function executeGenerateMindmapDirect(
  input: Record<string, unknown>,
  context: AgentContext,
  supabase: SupabaseClient
): Promise<ToolExecutionResult> {
  const documentId = input.documentId as string

  logger.info('Generating mind map directly', {
    documentId,
    userProfileId: context.userProfileId
  })

  // Get document text from database
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_name, extracted_text')
    .eq('id', documentId)
    .eq('user_id', context.userProfileId)
    .single()

  if (fetchError || !doc) {
    logger.error('Failed to fetch document for mind map', fetchError, { documentId })
    return {
      success: false,
      error: 'Document not found. Please make sure you have access to this document.'
    }
  }

  if (!doc.extracted_text || doc.extracted_text.length === 0) {
    return {
      success: false,
      error: 'Document has no text content. Please try re-uploading the document.'
    }
  }

  // Generate mind map using the AI provider
  const result = await generateMindMapAuto(doc.extracted_text, 25)

  if (!result.mindMap) {
    return {
      success: false,
      error: 'Failed to generate mind map. Please try again.'
    }
  }

  // Save mind map to database
  const { data: savedMindMap, error: saveError } = await supabase
    .from('mindmaps')
    .insert({
      user_id: context.userProfileId,
      document_id: documentId,
      title: `Mind Map: ${doc.file_name}`,
      nodes: result.mindMap.nodes || [],
      edges: result.mindMap.edges || [],
      metadata: {
        provider: result.provider,
        nodeCount: result.mindMap.nodes?.length || 0,
        generatedAt: new Date().toISOString()
      }
    })
    .select('id')
    .single()

  if (saveError) {
    logger.error('Failed to save mind map to database', saveError)
    return {
      success: true,
      data: {
        nodeCount: result.mindMap.nodes?.length || 0,
        documentId,
        saved: false,
        action: 'navigate',
        mode: 'mindmap' as StudyMode
      },
      message: `Created mind map with ${result.mindMap.nodes?.length || 0} concepts (not saved)`
    }
  }

  logger.info('Mind map generated and saved successfully', {
    documentId,
    mindmapId: savedMindMap.id,
    nodeCount: result.mindMap.nodes?.length || 0,
    provider: result.provider
  })

  return {
    success: true,
    data: {
      mindmapId: savedMindMap.id,
      nodeCount: result.mindMap.nodes?.length || 0,
      documentId,
      saved: true,
      action: 'navigate',
      mode: 'mindmap' as StudyMode
    },
    message: `Created mind map with ${result.mindMap.nodes?.length || 0} concepts from "${doc.file_name}"`
  }
}

/**
 * Generate a quiz from a document
 */
async function executeGenerateQuiz(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  const response = await fetch(`${baseUrl}/api/generate-exam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      documentId: input.documentId,
      difficulty: input.difficulty || 'medium',
      questionCount: input.count || 10
    })
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.message || 'Failed to generate quiz' }
  }

  const data = await response.json()
  return {
    success: true,
    data: {
      quizId: data.id,
      questionCount: data.questions?.length || 0
    },
    message: `Created quiz with ${data.questions?.length || 0} questions`
  }
}

/**
 * Generate a quick summary
 * Note: Quick summary uses SSE streaming, so we navigate to podcast mode
 */
async function executeGenerateQuickSummary(
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  // Quick summary uses SSE streaming, handled by frontend
  return {
    success: true,
    data: {
      documentId: input.documentId,
      url: input.url,
      action: 'navigate',
      mode: 'podcast' as StudyMode // Quick summary uses podcast mode
    },
    message: 'Ready to generate quick summary. Opening podcast mode...'
  }
}

/**
 * Start a spaced repetition review session
 */
async function executeStartReviewSession(
  input: Record<string, unknown>,
  context: AgentContext
): Promise<ToolExecutionResult> {
  // This is a navigation action, not an API call
  return {
    success: true,
    data: {
      action: 'navigate',
      mode: 'flashcards' as StudyMode,
      documentId: input.documentId,
      cardCount: input.cardCount || context.studyStats.totalCardsToReview
    },
    message: `Ready to review ${context.studyStats.totalCardsToReview} cards`
  }
}

/**
 * Search through user's documents
 */
async function executeSearchDocuments(
  input: Record<string, unknown>,
  context: AgentContext,
  supabase: SupabaseClient
): Promise<ToolExecutionResult> {
  const query = input.query as string

  // Simple text search in document content
  const { data: results, error } = await supabase
    .from('documents')
    .select('id, file_name, extracted_text')
    .eq('user_id', context.userProfileId)
    .textSearch('extracted_text', query.split(' ').join(' | '))
    .limit(5)

  if (error) {
    return { success: false, error: error.message }
  }

  // Extract relevant snippets
  const snippets = (results || []).map(doc => {
    const text = doc.extracted_text || ''
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    let snippet = ''
    if (index !== -1) {
      const start = Math.max(0, index - 100)
      const end = Math.min(text.length, index + query.length + 100)
      snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
    } else {
      snippet = text.slice(0, 200) + (text.length > 200 ? '...' : '')
    }

    return {
      documentId: doc.id,
      fileName: doc.file_name,
      snippet
    }
  })

  return {
    success: true,
    data: {
      resultCount: snippets.length,
      results: snippets
    },
    message: `Found ${snippets.length} relevant document sections`
  }
}

/**
 * Explain a concept using AI
 */
async function executeExplainConcept(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  // Use the study buddy chat endpoint for explanation
  const response = await fetch(`${baseUrl}/api/study-buddy/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      message: `Please explain the concept of "${input.concept}" in detail. Use examples and analogies to make it easy to understand.`,
      documentId: input.documentContext
    })
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.message || 'Failed to explain concept' }
  }

  const data = await response.json()
  return {
    success: true,
    data: {
      explanation: data.message || data.response
    },
    message: 'Here is the explanation'
  }
}

/**
 * Create a study plan with calendar integration
 * Requires examDate and documentIds from the conversation
 * Now uses direct function calls instead of HTTP to avoid auth issues
 */
async function executeCreateStudyPlan(
  input: Record<string, unknown>,
  context: AgentContext,
  supabase: SupabaseClient
): Promise<ToolExecutionResult> {
  // Validate required fields
  if (!input.examDate) {
    return {
      success: false,
      error: 'I need to know when your exam or deadline is. What date should I plan for?'
    }
  }

  if (!input.documentIds || !Array.isArray(input.documentIds) || input.documentIds.length === 0) {
    return {
      success: false,
      error: 'I need to know which documents you want to study. Which ones from your uploaded documents should I include?'
    }
  }

  try {
    // Parse exam date
    let examDate = new Date(input.examDate as string)
    if (isNaN(examDate.getTime())) {
      return {
        success: false,
        error: 'Invalid exam date format. Please provide a valid date.'
      }
    }

    // If the exam date is in the past, assume the user means next year
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (examDate < today) {
      examDate = new Date(examDate)
      examDate.setFullYear(examDate.getFullYear() + 1)
      console.log('[StudyPlan] Exam date was in the past, adjusted to next year:', examDate.toISOString())
    }

    // Also check if exam date is too soon (less than 1 day away)
    const oneDayFromNow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    if (examDate < oneDayFromNow) {
      return {
        success: false,
        error: 'The exam date needs to be at least 1 day in the future. When is your exam?'
      }
    }

    // Generate the study plan directly (no HTTP call needed)
    const planOptions: GeneratePlanOptions = {
      examDate,
      examTitle: (input.examTitle as string) || 'Study Plan',
      documentIds: input.documentIds as string[],
      dailyTargetHours: (input.dailyTargetHours as number) || 2,
      includeWeekends: input.includeWeekends !== false,
      startDate: new Date() // Start from today
    }

    console.log('[StudyPlan] Generating plan with options:', {
      examDate: planOptions.examDate,
      examTitle: planOptions.examTitle,
      documentIds: planOptions.documentIds,
      dailyTargetHours: planOptions.dailyTargetHours
    })

    const plan = await generateStudyPlan(context.userProfileId, planOptions)

    if (!plan) {
      return {
        success: false,
        error: 'Failed to generate study plan. Please try again.'
      }
    }

    // Save the plan to database
    const savedPlan = await saveStudyPlan(plan)

    if (!savedPlan) {
      return {
        success: false,
        error: 'Failed to save study plan. Please try again.'
      }
    }

    // Create calendar events for the study sessions (first 14 days)
    try {
      const sessionsToSchedule = plan.sessions.slice(0, 14)
      for (const session of sessionsToSchedule) {
        const startTime = new Date(session.scheduledDate)
        const endTime = new Date(startTime.getTime() + (session.estimatedMinutes || 60) * 60000)

        const { error: calError } = await supabase.from('study_schedule_events').insert({
          user_id: context.userProfileId,
          title: `Study: ${session.topic || plan.title}`,
          description: `${session.mode} session for ${session.documentName || plan.title}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          event_type: 'study_session',
          study_plan_id: savedPlan.id,
          metadata: {
            sessionType: session.sessionType,
            mode: session.mode,
            documentId: session.documentId
          }
        })
        if (calError) {
          console.error('Failed to create calendar event:', calError)
        }
      }
    } catch (calError) {
      console.error('Failed to create calendar events:', calError)
      // Don't fail the whole operation if calendar events fail
    }

    const sessionCount = plan.sessionsTotal || plan.sessions?.length || 0
    const totalHours = plan.totalEstimatedHours || 0

    return {
      success: true,
      data: {
        planId: savedPlan.id,
        sessions: sessionCount,
        totalHours,
        examDate: input.examDate,
        title: plan.title || input.examTitle
      },
      message: `Great! I've created your study plan "${plan.title || input.examTitle}" with ${sessionCount} sessions (${totalHours} hours total). The sessions have been added to your calendar. You can view and manage your plan in the Study Guide section.`
    }
  } catch (error) {
    console.error('Failed to create study plan:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create study plan. Please try again.'
    }
  }
}

/**
 * Switch to a different study mode
 */
async function executeSwitchMode(
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  return {
    success: true,
    data: {
      action: 'navigate',
      mode: input.mode as StudyMode,
      documentId: input.documentId
    },
    message: `Switching to ${input.mode} mode`
  }
}

/**
 * Update tool execution status in database
 */
export async function updateToolExecutionStatus(
  executionId: string,
  status: 'executing' | 'completed' | 'failed',
  supabase: SupabaseClient,
  result?: ToolExecutionResult
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'executing') {
    update.executed_at = new Date().toISOString()
  }

  if (status === 'completed' || status === 'failed') {
    update.completed_at = new Date().toISOString()
    if (result) {
      update.tool_output = result.data || {}
      if (!result.success) {
        update.error_message = result.error
      }
    }
  }

  await supabase
    .from('teacher_tool_executions')
    .update(update)
    .eq('id', executionId)
}

/**
 * Save a suggested action to the database
 */
export async function saveSuggestedAction(
  action: {
    userId: string
    conversationId: string
    toolName: TeacherToolName
    toolInput: Record<string, unknown>
    explanation: string
  },
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase
    .from('teacher_tool_executions')
    .insert({
      user_id: action.userId,
      conversation_id: action.conversationId,
      tool_name: action.toolName,
      tool_input: action.toolInput,
      explanation: action.explanation,
      status: 'pending'
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to save action: ${error.message}`)
  }

  return data.id
}
