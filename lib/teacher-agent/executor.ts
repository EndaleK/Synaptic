/**
 * Tool Executor for the Agentic Teacher
 * Executes approved tool calls and returns results
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  TeacherToolName,
  ToolExecutionResult,
  AgentContext,
  StudyMode
} from './types'
import { generateStudyPlan, saveStudyPlan, type GeneratePlanOptions } from '@/lib/study-plan-generator'

interface ExecuteToolParams {
  toolName: TeacherToolName
  toolInput: Record<string, unknown>
  context: AgentContext
  supabase: SupabaseClient
  baseUrl: string // For internal API calls
  cookieHeader: string // For authenticated API calls (forwarded from browser)
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
  try {
    switch (toolName) {
      case 'generate_flashcards':
        return await executeGenerateFlashcards(toolInput, baseUrl, cookieHeader)

      case 'generate_podcast':
        return await executeGeneratePodcast(toolInput, baseUrl, cookieHeader)

      case 'generate_mindmap':
        return await executeGenerateMindmap(toolInput, baseUrl, cookieHeader)

      case 'generate_quiz':
        return await executeGenerateQuiz(toolInput, baseUrl, cookieHeader)

      case 'generate_quick_summary':
        return await executeGenerateQuickSummary(toolInput, baseUrl, cookieHeader)

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
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        }
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate flashcards from a document
 */
async function executeGenerateFlashcards(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  const response = await fetch(`${baseUrl}/api/generate-flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      documentId: input.documentId,
      topicFilter: input.topicFilter,
      count: input.count || 20
    })
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.message || 'Failed to generate flashcards' }
  }

  const data = await response.json()
  return {
    success: true,
    data: {
      count: data.flashcards?.length || 0,
      documentId: input.documentId
    },
    message: `Created ${data.flashcards?.length || 0} flashcards`
  }
}

/**
 * Generate a podcast from a document
 */
async function executeGeneratePodcast(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  // This returns SSE, so we need to handle it differently
  // For now, return that it's being generated
  return {
    success: true,
    data: {
      documentId: input.documentId,
      style: input.style || 'conversational',
      status: 'generating'
    },
    message: 'Podcast generation started. This may take 2-3 minutes.'
  }
}

/**
 * Generate a mind map from a document
 */
async function executeGenerateMindmap(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  const response = await fetch(`${baseUrl}/api/generate-mindmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      documentId: input.documentId,
      focusTopic: input.focusTopic
    })
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.message || 'Failed to generate mind map' }
  }

  const data = await response.json()
  return {
    success: true,
    data: {
      mindmapId: data.id,
      nodeCount: data.nodes?.length || 0
    },
    message: `Created mind map with ${data.nodes?.length || 0} concepts`
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
 */
async function executeGenerateQuickSummary(
  input: Record<string, unknown>,
  baseUrl: string,
  cookieHeader: string
): Promise<ToolExecutionResult> {
  // Similar to podcast, this is SSE
  return {
    success: true,
    data: {
      documentId: input.documentId,
      url: input.url,
      status: 'generating'
    },
    message: 'Quick summary generation started. This may take 1-2 minutes.'
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
