import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { orchestrateAgent } from '@/lib/teacher-agent/orchestrator'
import { buildAgentContext, summarizeContext } from '@/lib/teacher-agent/context'
import { saveSuggestedAction } from '@/lib/teacher-agent/executor'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/teacher-agent/chat
 * Main chat endpoint for the Agentic Teacher
 * Handles conversation with Claude tool calling
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const authResult = await auth()
    const userId = authResult?.userId

    logger.info('Teacher agent auth check', {
      hasUserId: !!userId,
      authKeys: Object.keys(authResult || {})
    })

    if (!userId) {
      logger.warn('Teacher agent unauthorized - no userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await req.json()
    const { message, conversationId, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Build agent context
    const context = await buildAgentContext({
      userId,
      supabase,
      conversationHistory
    })

    logger.info('Teacher agent context built', {
      userId,
      summary: summarizeContext(context)
    })

    // Orchestrate agent response
    const response = await orchestrateAgent({
      message,
      context,
      conversationId
    })

    // Save suggested actions to database for tracking
    const savedActionIds: string[] = []
    for (const action of response.suggestedActions) {
      try {
        const savedId = await saveSuggestedAction(
          {
            userId: context.userProfileId,
            conversationId: response.conversationId,
            toolName: action.toolName,
            toolInput: action.toolInput,
            explanation: action.explanation
          },
          supabase
        )
        savedActionIds.push(savedId)
        // Update action ID to match database
        action.id = savedId
      } catch (error) {
        logger.error('Failed to save suggested action', error, {
          toolName: action.toolName
        })
      }
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/teacher-agent/chat', 200, duration, {
      userId,
      suggestedActionsCount: response.suggestedActions.length,
      contextUsed: response.contextUsed
    })

    return NextResponse.json({
      success: true,
      message: response.message,
      suggestedActions: response.suggestedActions,
      conversationId: response.conversationId,
      contextUsed: response.contextUsed
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Teacher agent chat error', error)
    logger.api('POST', '/api/teacher-agent/chat', 500, duration, {
      error: errorMessage
    })

    return NextResponse.json(
      { error: errorMessage || 'Failed to process message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher-agent/chat
 * Get conversation history and pending actions
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get pending actions for this conversation
    const { data: pendingActions, error } = await supabase
      .from('teacher_tool_executions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('conversation_id', conversationId)
      .in('status', ['pending', 'executing'])
      .order('suggested_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch pending actions', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending actions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pendingActions: pendingActions || []
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Teacher agent GET error', error)

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
