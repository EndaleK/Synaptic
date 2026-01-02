/**
 * API Route: /api/study-plan-sessions
 *
 * GET: Fetch study plan sessions for a specific date or date range
 * POST: Create a new study plan session
 * PATCH: Update session status (in body, expects session ID)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-plan-sessions
 * Fetch sessions for a date or date range
 *
 * Query params:
 * - date: string (YYYY-MM-DD) - single date
 * - startDate: string (YYYY-MM-DD) - range start
 * - endDate: string (YYYY-MM-DD) - range end
 * - planId: string - filter by specific plan
 * - status: string - filter by status
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const planId = searchParams.get('planId')
    const status = searchParams.get('status')

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Build query
    let query = supabase
      .from('study_plan_sessions')
      .select(`
        *,
        study_plans!inner(
          id,
          title,
          exam_date,
          status
        )
      `)
      .eq('user_id', profile.id)
      .order('scheduled_date', { ascending: true })

    // Date filtering
    if (date) {
      query = query.eq('scheduled_date', date)
    } else if (startDate && endDate) {
      query = query
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
    }

    // Plan filtering
    if (planId) {
      query = query.eq('study_plan_id', planId)
    }

    // Status filtering
    if (status) {
      query = query.eq('status', status)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('[StudyPlanSessions] Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedSessions = (sessions || []).map((session) => ({
      id: session.id,
      studyPlanId: session.study_plan_id,
      userId: session.user_id,
      scheduledDate: session.scheduled_date,
      sessionType: session.session_type,
      estimatedMinutes: session.estimated_minutes,
      actualMinutes: session.actual_minutes,
      topics: session.topics || [],
      status: session.status,
      isBufferDay: session.is_buffer_day,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      notes: session.notes,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      // Include plan info
      planTitle: session.study_plans?.title,
      planExamDate: session.study_plans?.exam_date,
      planStatus: session.study_plans?.status,
    }))

    return NextResponse.json({
      sessions: transformedSessions,
      total: transformedSessions.length,
    })
  } catch (error) {
    console.error('[StudyPlanSessions] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-plan-sessions
 * Create a new session
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      studyPlanId,
      scheduledDate,
      sessionType = 'mixed',
      estimatedMinutes = 60,
      topics = [],
      isBufferDay = false,
    } = body

    if (!studyPlanId || !scheduledDate) {
      return NextResponse.json(
        { error: 'studyPlanId and scheduledDate are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Verify the plan belongs to this user
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id')
      .eq('id', studyPlanId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    // Create the session
    const { data: session, error: createError } = await supabase
      .from('study_plan_sessions')
      .insert({
        study_plan_id: studyPlanId,
        user_id: profile.id,
        scheduled_date: scheduledDate,
        session_type: sessionType,
        estimated_minutes: estimatedMinutes,
        topics,
        is_buffer_day: isBufferDay,
        status: 'scheduled',
      })
      .select()
      .single()

    if (createError) {
      console.error('[StudyPlanSessions] Create error:', createError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('[StudyPlanSessions] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/study-plan-sessions
 * Update session status or details
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId, status, actualMinutes, notes } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }
    if (actualMinutes !== undefined) {
      updates.actual_minutes = actualMinutes
    }
    if (notes !== undefined) {
      updates.notes = notes
    }

    // Update the session
    const { data: session, error: updateError } = await supabase
      .from('study_plan_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('[StudyPlanSessions] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    // If completed, update the plan's sessions_completed count
    if (status === 'completed') {
      const { data: planSession } = await supabase
        .from('study_plan_sessions')
        .select('study_plan_id')
        .eq('id', sessionId)
        .single()

      if (planSession) {
        await supabase.rpc('increment_study_plan_sessions', {
          plan_id: planSession.study_plan_id,
        })
      }
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('[StudyPlanSessions] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
