/**
 * API Route: /api/study-plans/[id]/generate-sessions
 *
 * POST: Generate study sessions for an existing plan that has no sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/study-plans/[id]/generate-sessions
 * Generate sessions for a plan based on its exam date and documents
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await params

    // Validate UUID
    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
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

    // Get the study plan
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    // Check if sessions already exist
    const { data: existingSessions } = await supabase
      .from('study_plan_sessions')
      .select('id')
      .eq('plan_id', planId)
      .limit(1)

    if (existingSessions && existingSessions.length > 0) {
      return NextResponse.json(
        { error: 'Sessions already exist for this plan' },
        { status: 400 }
      )
    }

    // Calculate study schedule
    const startDate = new Date(plan.start_date || new Date().toISOString().split('T')[0])
    const examDate = new Date(plan.exam_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use today if start date is in the past
    const effectiveStartDate = startDate < today ? today : startDate

    // Calculate days until exam
    const msPerDay = 24 * 60 * 60 * 1000
    const daysUntilExam = Math.ceil((examDate.getTime() - effectiveStartDate.getTime()) / msPerDay)

    if (daysUntilExam <= 0) {
      return NextResponse.json(
        { error: 'Exam date has passed' },
        { status: 400 }
      )
    }

    // Get documents for this plan
    const documentIds = plan.documents || []
    let documents: Array<{ id: string; name: string; extracted_text?: string }> = []

    if (documentIds.length > 0) {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, name, extracted_text')
        .in('id', documentIds)

      documents = docs || []
    }

    // Generate sessions based on available days
    const sessions: Array<{
      plan_id: string
      user_id: string
      scheduled_date: string
      session_type: string
      estimated_minutes: number
      topic: string | null
      document_id: string | null
      document_name: string | null
      status: string
      week_number: number
    }> = []

    const dailyTargetMinutes = (plan.daily_target_hours || 2) * 60
    let currentDate = new Date(effectiveStartDate)
    let weekNumber = 1
    let dayCount = 0

    // Create a simple schedule - one session per day until exam
    while (currentDate < examDate && dayCount < 365) { // Safety limit
      const dayOfWeek = currentDate.getDay()

      // Skip weekends if configured (default: include weekends)
      const includeWeekends = plan.include_weekends !== false
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Calculate week number
      const daysSinceStart = Math.floor((currentDate.getTime() - effectiveStartDate.getTime()) / msPerDay)
      weekNumber = Math.floor(daysSinceStart / 7) + 1

      // Rotate through documents if available
      const docIndex = sessions.length % Math.max(1, documents.length)
      const doc = documents[docIndex]

      // Determine session type based on day of week
      let sessionType = 'mixed'
      if (dayOfWeek === 1 || dayOfWeek === 3) sessionType = 'flashcards'
      else if (dayOfWeek === 2 || dayOfWeek === 4) sessionType = 'reading'
      else if (dayOfWeek === 5) sessionType = 'review'
      else sessionType = 'mixed'

      sessions.push({
        plan_id: planId,
        user_id: profile.id,
        scheduled_date: currentDate.toISOString().split('T')[0],
        session_type: sessionType,
        estimated_minutes: dailyTargetMinutes,
        topic: doc ? `Study: ${doc.name}` : plan.title || 'Study Session',
        document_id: doc?.id || null,
        document_name: doc?.name || null,
        status: 'scheduled',
        week_number: weekNumber,
      })

      currentDate.setDate(currentDate.getDate() + 1)
      dayCount++
    }

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'No study days available before exam' },
        { status: 400 }
      )
    }

    // Insert sessions
    const { error: insertError } = await supabase
      .from('study_plan_sessions')
      .insert(sessions)

    if (insertError) {
      console.error('[GenerateSessions] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create sessions' },
        { status: 500 }
      )
    }

    // Update plan with session count
    await supabase
      .from('study_plans')
      .update({
        sessions_total: sessions.length,
        start_date: effectiveStartDate.toISOString().split('T')[0],
      })
      .eq('id', planId)

    return NextResponse.json({
      success: true,
      sessionsCreated: sessions.length,
      startDate: effectiveStartDate.toISOString().split('T')[0],
      endDate: examDate.toISOString().split('T')[0],
      weeks: weekNumber,
    })
  } catch (error) {
    console.error('[GenerateSessions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate sessions' },
      { status: 500 }
    )
  }
}
