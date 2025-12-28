/**
 * API Route: /api/study-plan-sessions/[id]
 *
 * PATCH: Update session status (start, complete, skip)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/study-plan-sessions/[id]
 * Update a session's status
 *
 * Body:
 * - action: 'start' | 'complete' | 'skip' | 'reschedule'
 * - performanceScore?: number (0-100, for 'complete')
 * - actualMinutes?: number (for 'complete')
 * - newDate?: string (ISO date, for 'reschedule')
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await params

    // Validate UUID
    try {
      validateUUIDParam(sessionId, 'session ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { action, performanceScore, actualMinutes, newDate } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const validActions = ['start', 'complete', 'skip', 'reschedule']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
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

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('study_plan_sessions')
      .select('*, study_plans(id, sessions_completed, hours_completed)')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Build update based on action
    const updates: Record<string, unknown> = {}
    let planUpdates: Record<string, unknown> = {}

    switch (action) {
      case 'start':
        updates.status = 'in_progress'
        updates.started_at = new Date().toISOString()
        break

      case 'complete':
        updates.status = 'completed'
        updates.completed_at = new Date().toISOString()
        if (performanceScore !== undefined) {
          updates.performance_score = Math.min(100, Math.max(0, performanceScore))
        }
        if (actualMinutes !== undefined) {
          updates.actual_minutes = actualMinutes
        }

        // Update plan progress
        const minutesCompleted = actualMinutes || session.estimated_minutes
        const plan = session.study_plans as {
          id: string
          sessions_completed: number
          hours_completed: number
        }

        planUpdates = {
          sessions_completed: (plan.sessions_completed || 0) + 1,
          hours_completed: (plan.hours_completed || 0) + (minutesCompleted / 60),
        }
        break

      case 'skip':
        updates.status = 'skipped'
        updates.completed_at = new Date().toISOString()
        break

      case 'reschedule':
        if (!newDate) {
          return NextResponse.json(
            { error: 'newDate is required for reschedule' },
            { status: 400 }
          )
        }
        updates.status = 'rescheduled'
        updates.scheduled_date = newDate
        break
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('study_plan_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('[StudyPlanSessions] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    // Update plan if needed
    if (Object.keys(planUpdates).length > 0) {
      await supabase
        .from('study_plans')
        .update(planUpdates)
        .eq('id', session.plan_id)
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })
  } catch (error) {
    console.error('[StudyPlanSessions] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
