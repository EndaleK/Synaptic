/**
 * API Route: /api/study-plan-sessions/reschedule
 *
 * POST: Auto-reschedule missed sessions to the next available slot
 *
 * This endpoint:
 * 1. Finds sessions with status='scheduled' and date < today
 * 2. Marks them as 'missed'
 * 3. Creates new sessions on the next available slot
 * 4. Preserves topic_pages and content references
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/study-plan-sessions/reschedule
 * Reschedule missed sessions for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Find missed sessions (scheduled but date passed)
    const { data: missedSessions, error: missedError } = await supabase
      .from('study_plan_sessions')
      .select(`
        *,
        study_plans!inner(
          id,
          exam_date,
          status
        )
      `)
      .eq('user_id', profile.id)
      .eq('status', 'scheduled')
      .lt('scheduled_date', todayStr)
      .is('rescheduled_from', null) // Don't reschedule already rescheduled sessions

    if (missedError) {
      console.error('[Reschedule] Error fetching missed sessions:', missedError)
      return NextResponse.json(
        { error: 'Failed to fetch missed sessions' },
        { status: 500 }
      )
    }

    if (!missedSessions || missedSessions.length === 0) {
      return NextResponse.json({
        message: 'No missed sessions to reschedule',
        rescheduled: 0,
      })
    }

    const rescheduledSessions = []

    for (const session of missedSessions) {
      // Skip if plan is not active
      if (session.study_plans?.status !== 'active') {
        continue
      }

      // Skip if exam date has passed
      const examDate = new Date(session.study_plans?.exam_date)
      if (examDate < today) {
        // Just mark as missed, don't reschedule
        await supabase
          .from('study_plan_sessions')
          .update({ status: 'missed' })
          .eq('id', session.id)
        continue
      }

      // Mark original session as missed
      await supabase
        .from('study_plan_sessions')
        .update({ status: 'missed' })
        .eq('id', session.id)

      // Find next available slot
      const nextAvailableDate = await findNextAvailableSlot(
        supabase,
        profile.id,
        session.study_plan_id,
        todayStr,
        session.study_plans?.exam_date
      )

      if (!nextAvailableDate) {
        // No available slot before exam, skip rescheduling
        continue
      }

      // Calculate new week number
      const planStartDate = new Date(session.study_plans?.start_date || session.created_at)
      const newDate = new Date(nextAvailableDate)
      const msPerDay = 24 * 60 * 60 * 1000
      const daysDiff = Math.floor((newDate.getTime() - planStartDate.getTime()) / msPerDay)
      const newWeekNumber = Math.floor(daysDiff / 7) + 1

      // Create rescheduled session
      const { data: newSession, error: createError } = await supabase
        .from('study_plan_sessions')
        .insert({
          study_plan_id: session.study_plan_id,
          user_id: profile.id,
          scheduled_date: nextAvailableDate,
          scheduled_time: session.scheduled_time,
          estimated_minutes: session.estimated_minutes,
          session_type: session.session_type,
          topics: session.topics,
          status: 'scheduled',
          is_buffer_day: false,
          // Enhanced fields
          has_daily_quiz: session.has_daily_quiz,
          has_weekly_exam: false, // Don't include weekly exam on rescheduled
          week_number: newWeekNumber,
          topic_pages: session.topic_pages,
          rescheduled_from: session.id,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Reschedule] Error creating rescheduled session:', createError)
        continue
      }

      rescheduledSessions.push({
        originalId: session.id,
        originalDate: session.scheduled_date,
        newId: newSession.id,
        newDate: nextAvailableDate,
        topic: session.topic || session.topics?.[0]?.name,
      })
    }

    return NextResponse.json({
      message: `Rescheduled ${rescheduledSessions.length} session(s)`,
      rescheduled: rescheduledSessions.length,
      sessions: rescheduledSessions,
    })
  } catch (error) {
    console.error('[Reschedule] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule sessions' },
      { status: 500 }
    )
  }
}

/**
 * Find the next available date for rescheduling.
 * Considers:
 * - Days that don't already have too many sessions
 * - Exam date as the deadline
 * - User's study preferences (if available)
 */
async function findNextAvailableSlot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planId: string,
  fromDate: string,
  examDate: string
): Promise<string | null> {
  const MAX_SESSIONS_PER_DAY = 4
  const MAX_DAYS_TO_CHECK = 14

  const from = new Date(fromDate)
  const exam = new Date(examDate)

  // Check each day starting from today
  for (let i = 0; i < MAX_DAYS_TO_CHECK; i++) {
    const checkDate = new Date(from)
    checkDate.setDate(checkDate.getDate() + i)

    // Don't schedule on exam day
    if (checkDate >= exam) {
      return null
    }

    const checkDateStr = checkDate.toISOString().split('T')[0]

    // Count sessions on this day for this plan
    const { count, error } = await supabase
      .from('study_plan_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('study_plan_id', planId)
      .eq('scheduled_date', checkDateStr)
      .in('status', ['scheduled', 'in_progress'])

    if (error) {
      console.error('[Reschedule] Error counting sessions:', error)
      continue
    }

    if ((count || 0) < MAX_SESSIONS_PER_DAY) {
      return checkDateStr
    }
  }

  return null
}
