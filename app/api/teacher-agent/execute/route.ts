import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { executeTool, updateToolExecutionStatus } from '@/lib/teacher-agent/executor'
import { buildAgentContext } from '@/lib/teacher-agent/context'
import { TeacherToolName } from '@/lib/teacher-agent/types'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for long-running tools like podcast

/**
 * POST /api/teacher-agent/execute
 * Execute an approved tool action
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await req.json()
    const { actionId } = body

    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId is required' },
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

    // Get the tool execution record
    const { data: execution, error: fetchError } = await supabase
      .from('teacher_tool_executions')
      .select('*')
      .eq('id', actionId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !execution) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // Verify action is pending or approved
    if (execution.status !== 'pending' && execution.status !== 'approved') {
      return NextResponse.json(
        { error: `Action cannot be executed in status: ${execution.status}` },
        { status: 400 }
      )
    }

    // Mark as executing
    await updateToolExecutionStatus(actionId, 'executing', supabase)

    // Build context for execution
    const context = await buildAgentContext({
      userId,
      supabase
    })

    // Get base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get('host')?.includes('localhost')
        ? `http://${req.headers.get('host')}`
        : `https://${req.headers.get('host')}`)

    // Get cookies to forward for internal API calls (Clerk uses cookie-based auth)
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const cookieHeader = allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')

    logger.info('Executing teacher tool', {
      actionId,
      toolName: execution.tool_name,
      userId,
      baseUrl,
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name)
    })

    // Execute the tool
    const result = await executeTool({
      toolName: execution.tool_name as TeacherToolName,
      toolInput: execution.tool_input,
      context,
      supabase,
      baseUrl,
      cookieHeader
    })

    // Update status based on result
    if (result.success) {
      await updateToolExecutionStatus(actionId, 'completed', supabase, result)
    } else {
      await updateToolExecutionStatus(actionId, 'failed', supabase, result)
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/teacher-agent/execute', result.success ? 200 : 500, duration, {
      actionId,
      toolName: execution.tool_name,
      success: result.success
    })

    return NextResponse.json({
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Teacher agent execute error', error)
    logger.api('POST', '/api/teacher-agent/execute', 500, duration, {
      error: errorMessage
    })

    return NextResponse.json(
      { error: errorMessage || 'Failed to execute action' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teacher-agent/execute
 * Update action status (approve/reject)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { actionId, status } = body

    if (!actionId || !status) {
      return NextResponse.json(
        { error: 'actionId and status are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
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

    // Update the action status
    const { error } = await supabase
      .from('teacher_tool_executions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .eq('user_id', profile.id)

    if (error) {
      logger.error('Failed to update action status', error)
      return NextResponse.json(
        { error: 'Failed to update action status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      actionId,
      status
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Teacher agent PATCH error', error)

    return NextResponse.json(
      { error: errorMessage || 'Failed to update action' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher-agent/execute
 * Cancel/reject an action
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const actionId = searchParams.get('actionId')

    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId is required' },
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

    // Delete the action
    const { error } = await supabase
      .from('teacher_tool_executions')
      .delete()
      .eq('id', actionId)
      .eq('user_id', profile.id)
      .eq('status', 'pending') // Can only delete pending actions

    if (error) {
      logger.error('Failed to delete action', error)
      return NextResponse.json(
        { error: 'Failed to delete action' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      actionId
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Teacher agent DELETE error', error)

    return NextResponse.json(
      { error: errorMessage || 'Failed to delete action' },
      { status: 500 }
    )
  }
}
