/**
 * API Route: /api/cron/check-missed-sessions
 *
 * CRON: Daily job to check for missed sessions and auto-reschedule them
 *
 * This endpoint should be called by a cron scheduler (Vercel Cron, etc.)
 * It processes ALL users' missed sessions, not just a single user.
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for processing all users

/**
 * GET /api/cron/check-missed-sessions
 * Check and reschedule all missed sessions
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Find all missed sessions across all users
    const { data: missedSessions, error: missedError } = await supabase
      .from('study_plan_sessions')
      .select(`
        *,
        study_plans!inner(
          id,
          exam_date,
          status,
          start_date,
          user_id
        )
      `)
      .eq('status', 'scheduled')
      .lt('scheduled_date', todayStr)
      .is('rescheduled_from', null) // Don't reschedule already rescheduled sessions
      .eq('study_plans.status', 'active')

    if (missedError) {
      console.error('[CronMissedSessions] Error fetching missed sessions:', missedError)
      return NextResponse.json(
        { error: 'Failed to fetch missed sessions' },
        { status: 500 }
      )
    }

    if (!missedSessions || missedSessions.length === 0) {
      return NextResponse.json({
        message: 'No missed sessions to reschedule',
        processed: 0,
        rescheduled: 0,
        skipped: 0,
      })
    }

    let rescheduled = 0
    let skipped = 0

    for (const session of missedSessions) {
      try {
        // Skip if exam date has passed
        const examDate = new Date(session.study_plans?.exam_date)
        if (examDate < today) {
          // Just mark as missed, don't reschedule
          await supabase
            .from('study_plan_sessions')
            .update({ status: 'missed' })
            .eq('id', session.id)
          skipped++
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
          session.user_id,
          session.study_plan_id,
          todayStr,
          session.study_plans?.exam_date
        )

        if (!nextAvailableDate) {
          skipped++
          continue
        }

        // Calculate new week number
        const planStartDate = new Date(session.study_plans?.start_date || session.created_at)
        const newDate = new Date(nextAvailableDate)
        const msPerDay = 24 * 60 * 60 * 1000
        const daysDiff = Math.floor((newDate.getTime() - planStartDate.getTime()) / msPerDay)
        const newWeekNumber = Math.floor(daysDiff / 7) + 1

        // Create rescheduled session
        const { error: createError } = await supabase
          .from('study_plan_sessions')
          .insert({
            study_plan_id: session.study_plan_id,
            user_id: session.user_id,
            scheduled_date: nextAvailableDate,
            scheduled_time: session.scheduled_time,
            estimated_minutes: session.estimated_minutes,
            session_type: session.session_type,
            topics: session.topics,
            status: 'scheduled',
            is_buffer_day: false,
            has_daily_quiz: session.has_daily_quiz,
            has_weekly_exam: false,
            week_number: newWeekNumber,
            topic_pages: session.topic_pages,
            rescheduled_from: session.id,
          })

        if (createError) {
          console.error('[CronMissedSessions] Error creating rescheduled session:', createError)
          skipped++
          continue
        }

        rescheduled++
      } catch (err) {
        console.error('[CronMissedSessions] Error processing session:', err)
        skipped++
      }
    }

    console.log(`[CronMissedSessions] Processed ${missedSessions.length} sessions: ${rescheduled} rescheduled, ${skipped} skipped`)

    return NextResponse.json({
      message: `Processed ${missedSessions.length} missed sessions`,
      processed: missedSessions.length,
      rescheduled,
      skipped,
    })
  } catch (error) {
    console.error('[CronMissedSessions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process missed sessions' },
      { status: 500 }
    )
  }
}

/**
 * Find the next available date for rescheduling.
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

  for (let i = 0; i < MAX_DAYS_TO_CHECK; i++) {
    const checkDate = new Date(from)
    checkDate.setDate(checkDate.getDate() + i)

    if (checkDate >= exam) {
      return null
    }

    const checkDateStr = checkDate.toISOString().split('T')[0]

    const { count, error } = await supabase
      .from('study_plan_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('study_plan_id', planId)
      .eq('scheduled_date', checkDateStr)
      .in('status', ['scheduled', 'in_progress'])

    if (error) {
      continue
    }

    if ((count || 0) < MAX_SESSIONS_PER_DAY) {
      return checkDateStr
    }
  }

  return null
}
