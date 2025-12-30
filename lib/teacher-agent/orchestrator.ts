/**
 * Agent Orchestrator for the Agentic Teacher
 * Handles the main agent loop with OpenAI tool calling
 */

import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import {
  AgentContext,
  AgentResponse,
  SuggestedAction,
  TeacherToolName
} from './types'
import { teacherTools, getToolMetadata } from './tools'
import { buildSystemPrompt } from './system-prompt'

/**
 * Create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

interface OrchestrateParams {
  message: string
  context: AgentContext
  conversationId?: string
}

/**
 * Main orchestration function for the teacher agent
 * Returns a response with optional suggested actions
 */
export async function orchestrateAgent({
  message,
  context,
  conversationId
}: OrchestrateParams): Promise<AgentResponse> {
  const convId = conversationId || uuidv4()

  // Build messages array from conversation history
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: buildSystemPrompt(context)
    },
    ...context.conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: message
    }
  ]

  // Convert tools to OpenAI format
  const openaiTools: OpenAI.ChatCompletionTool[] = teacherTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }))

  try {
    // Call OpenAI with tools enabled
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages,
      tools: openaiTools,
      tool_choice: 'auto'
    })

    // Process response content
    const suggestedActions: SuggestedAction[] = []
    let textResponse = ''

    const choice = response.choices[0]
    if (choice.message.content) {
      textResponse = choice.message.content
    }

    // Process tool calls
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name as TeacherToolName
        const toolInput = JSON.parse(toolCall.function.arguments)
        const metadata = getToolMetadata(toolName)

        suggestedActions.push({
          id: uuidv4(),
          toolName,
          toolInput,
          explanation: generateExplanation(toolName, toolInput, context),
          estimatedDuration: metadata?.estimatedDuration,
          status: 'pending',
          createdAt: new Date().toISOString()
        })
      }
    }

    // If no text response but has tool suggestions, generate a contextual message
    if (!textResponse && suggestedActions.length > 0) {
      textResponse = generateToolSuggestionMessage(suggestedActions, context)
    }

    // Track which context was used
    const contextUsed: string[] = []
    if (context.learningStyle) contextUsed.push('learning_style')
    if (context.recentDocuments.length > 0) contextUsed.push('documents')
    if (context.studyStats.totalCardsToReview > 0) contextUsed.push('review_queue')
    if (context.activeStudyPlan) contextUsed.push('study_plan')

    return {
      message: textResponse,
      suggestedActions,
      contextUsed,
      conversationId: convId
    }
  } catch (error) {
    console.error('Agent orchestration error:', error)
    throw error
  }
}

/**
 * Generate a human-readable explanation for why a tool was suggested
 */
function generateExplanation(
  toolName: TeacherToolName,
  input: Record<string, unknown>,
  context: AgentContext
): string {
  const document = input.documentId
    ? context.recentDocuments.find(d => d.id === input.documentId)
    : null
  const docName = document?.fileName || 'your document'

  switch (toolName) {
    case 'generate_flashcards':
      return `I'll create flashcards from "${docName}" to help you memorize the key concepts.${input.topicFilter ? ` Focusing on: ${input.topicFilter}` : ''}`

    case 'generate_podcast':
      return `I'll create an audio lesson from "${docName}" so you can learn while listening.${input.style ? ` Style: ${input.style}` : ''}`

    case 'generate_mindmap':
      return `I'll create a visual mind map from "${docName}" showing how concepts connect.${input.focusTopic ? ` Centered on: ${input.focusTopic}` : ''}`

    case 'generate_quiz':
      return `I'll create a practice quiz from "${docName}" to test your understanding.${input.difficulty ? ` Difficulty: ${input.difficulty}` : ''}`

    case 'generate_quick_summary':
      return input.url
        ? `I'll create a 5-minute audio summary of that link.`
        : `I'll create a quick 5-minute audio summary of "${docName}".`

    case 'start_review_session':
      return context.studyStats.totalCardsToReview > 0
        ? `You have ${context.studyStats.totalCardsToReview} cards due for review. Let's reinforce your memory!`
        : `I'll start a review session with your flashcards.`

    case 'search_documents':
      return `I'll search through your documents to find information about "${input.query}".`

    case 'explain_concept':
      return `I'll give you a detailed explanation of "${input.concept}".${input.documentContext ? ` Using context from your document.` : ''}`

    case 'create_study_plan':
      return `I'll create a personalized study plan to help you achieve your goals.${input.timeframe ? ` Timeline: ${input.timeframe}` : ''}`

    case 'switch_mode':
      return `I'll take you to the ${input.mode} mode${input.documentId ? ` with your document loaded` : ''}.`

    default:
      return 'I can help you with this.'
  }
}

/**
 * Generate a message to accompany tool suggestions
 */
function generateToolSuggestionMessage(
  actions: SuggestedAction[],
  context: AgentContext
): string {
  if (actions.length === 0) return ''

  const action = actions[0]
  const learningPref = context.learningStyle?.dominant

  let prefix = ''
  if (learningPref === 'visual' && action.toolName === 'generate_mindmap') {
    prefix = 'Since you learn best visually, '
  } else if (learningPref === 'auditory' && (action.toolName === 'generate_podcast' || action.toolName === 'generate_quick_summary')) {
    prefix = 'Since you prefer auditory learning, '
  } else if (learningPref === 'kinesthetic' && (action.toolName === 'generate_quiz' || action.toolName === 'start_review_session')) {
    prefix = 'Since you learn best through practice, '
  }

  return `${prefix}I have a suggestion that might help. Would you like me to proceed?`
}

/**
 * Continue conversation after tool execution
 */
export async function continueAfterToolExecution(
  toolName: TeacherToolName,
  result: unknown,
  context: AgentContext,
  conversationId: string
): Promise<AgentResponse> {
  // Add tool result to context
  const resultSummary = summarizeToolResult(toolName, result)

  // Create follow-up message
  const followUpMessage = `The ${toolName.replace(/_/g, ' ')} completed. ${resultSummary}`

  // Continue the conversation
  return orchestrateAgent({
    message: followUpMessage,
    context: {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        { role: 'assistant', content: followUpMessage }
      ]
    },
    conversationId
  })
}

/**
 * Summarize tool execution result for the agent
 */
function summarizeToolResult(toolName: TeacherToolName, result: unknown): string {
  const data = result as Record<string, unknown>

  switch (toolName) {
    case 'generate_flashcards':
      return `Created ${data.count || 'some'} flashcards.`
    case 'generate_podcast':
      return `Generated a ${data.duration || ''} podcast.`
    case 'generate_mindmap':
      return `Created a mind map with ${data.nodeCount || 'several'} concepts.`
    case 'generate_quiz':
      return `Created a quiz with ${data.questionCount || 'several'} questions.`
    case 'search_documents':
      return `Found ${data.resultCount || 'some'} relevant sections.`
    default:
      return 'Completed successfully.'
  }
}
