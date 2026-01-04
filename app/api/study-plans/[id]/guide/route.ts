/**
 * API Route: /api/study-plans/[id]/guide
 *
 * GET: Get the study guide breakdown for a plan
 *      Returns weekly/daily breakdown with content availability
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import type {
  StudyGuideBreakdown,
  StudyGuideWeek,
  StudyGuideDay,
  StudyGuideTopic,
} from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-plans/[id]/guide
 * Get the study guide breakdown for a plan
 */
export async function GET(
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
      .select('id, title, start_date, exam_date')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    // Check if study_guide_days exists for this plan
    const { data: existingGuideDays, error: guideDaysError } = await supabase
      .from('study_guide_days')
      .select('*')
      .eq('plan_id', planId)
      .order('date', { ascending: true })

    // If guide days exist, use them
    if (existingGuideDays && existingGuideDays.length > 0) {
      const guide = buildGuideFromDays(existingGuideDays, plan)
      return NextResponse.json({ guide })
    }

    // Otherwise, generate from sessions
    const { data: sessions } = await supabase
      .from('study_plan_sessions')
      .select('*')
      .eq('plan_id', planId)
      .order('scheduled_date', { ascending: true })

    if (!sessions || sessions.length === 0) {
      // Return empty guide
      const emptyGuide: StudyGuideBreakdown = {
        planId,
        planTitle: plan.title,
        totalWeeks: 0,
        totalDays: 0,
        daysCompleted: 0,
        weeks: [],
      }
      return NextResponse.json({ guide: emptyGuide })
    }

    // Build guide from sessions
    const guide = buildGuideFromSessions(sessions, plan)

    return NextResponse.json({ guide })
  } catch (error) {
    console.error('[StudyGuide] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get study guide' },
      { status: 500 }
    )
  }
}

/**
 * Build study guide from existing study_guide_days records
 */
function buildGuideFromDays(
  days: Array<{
    id: string
    plan_id: string
    date: string
    week_number: number
    day_of_week: number
    topics: StudyGuideTopic[] | null
    status: string
    estimated_total_minutes: number | null
    actual_minutes_spent: number | null
    has_flashcards: boolean | null
    has_podcast: boolean | null
    has_mindmap: boolean | null
    has_daily_quiz: boolean | null
    has_chat: boolean | null
    flashcard_set_id: string | null
    podcast_id: string | null
    mindmap_id: string | null
    daily_quiz_id: string | null
  }>,
  plan: { id: string; title: string }
): StudyGuideBreakdown {
  // Group days by week
  const weekMap = new Map<number, StudyGuideDay[]>()

  for (const day of days) {
    const weekNum = day.week_number
    if (!weekMap.has(weekNum)) {
      weekMap.set(weekNum, [])
    }

    const guideDay: StudyGuideDay = {
      id: day.id,
      planId: day.plan_id,
      date: day.date,
      weekNumber: day.week_number,
      dayOfWeek: day.day_of_week,
      topics: (day.topics || []) as StudyGuideTopic[],
      status: day.status as StudyGuideDay['status'],
      estimatedTotalMinutes: day.estimated_total_minutes || 0,
      actualMinutesSpent: day.actual_minutes_spent || undefined,
      hasFlashcards: day.has_flashcards || false,
      hasPodcast: day.has_podcast || false,
      hasMindmap: day.has_mindmap || false,
      hasDailyQuiz: day.has_daily_quiz || false,
      hasChat: day.has_chat || false,
      flashcardSetId: day.flashcard_set_id || undefined,
      podcastId: day.podcast_id || undefined,
      mindmapId: day.mindmap_id || undefined,
      dailyQuizId: day.daily_quiz_id || undefined,
    }

    weekMap.get(weekNum)!.push(guideDay)
  }

  // Build weeks
  const weeks: StudyGuideWeek[] = []
  for (const [weekNumber, weekDays] of weekMap.entries()) {
    const sortedDays = weekDays.sort((a, b) => a.date.localeCompare(b.date))
    weeks.push({
      weekNumber,
      weekStart: sortedDays[0].date,
      weekEnd: sortedDays[sortedDays.length - 1].date,
      days: sortedDays,
    })
  }

  // Sort weeks
  weeks.sort((a, b) => a.weekNumber - b.weekNumber)

  // Calculate stats
  const totalDays = days.length
  const daysCompleted = days.filter(d => d.status === 'ready' || d.status === 'partial').length

  return {
    planId: plan.id,
    planTitle: plan.title,
    totalWeeks: weeks.length,
    totalDays,
    daysCompleted,
    weeks,
  }
}

/**
 * Build study guide from study_plan_sessions (when guide_days don't exist yet)
 */
function buildGuideFromSessions(
  sessions: Array<{
    id: string
    plan_id: string
    scheduled_date: string
    week_number: number | null
    topic: string | null
    document_id: string | null
    document_name: string | null
    topic_pages: { startPage?: number; endPage?: number } | null
    estimated_minutes: number | null
    status: string
    has_daily_quiz: boolean | null
    chapter_id: string | null
    chapter_title: string | null
    is_chapter_final: boolean | null
  }>,
  plan: { id: string; title: string; start_date: string }
): StudyGuideBreakdown {
  // Group sessions by date
  const dateMap = new Map<string, typeof sessions>()

  for (const session of sessions) {
    const date = session.scheduled_date
    if (!dateMap.has(date)) {
      dateMap.set(date, [])
    }
    dateMap.get(date)!.push(session)
  }

  // Build days
  const days: StudyGuideDay[] = []
  const startDate = new Date(plan.start_date)

  for (const [date, dateSessions] of dateMap.entries()) {
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()

    // Calculate week number
    const msPerDay = 24 * 60 * 60 * 1000
    const daysDiff = Math.floor((dateObj.getTime() - startDate.getTime()) / msPerDay)
    const weekNumber = Math.floor(daysDiff / 7) + 1

    // Build topics from sessions
    const topics: StudyGuideTopic[] = dateSessions.map(session => ({
      topicId: session.id,
      title: session.topic || 'Study Session',
      documentId: session.document_id || undefined,
      documentName: session.document_name || undefined,
      pageRange: session.topic_pages ? {
        start: session.topic_pages.startPage || 0,
        end: session.topic_pages.endPage || 0,
      } : undefined,
      estimatedMinutes: session.estimated_minutes || 30,
    }))

    // Calculate total minutes
    const estimatedTotalMinutes = dateSessions.reduce(
      (sum, s) => sum + (s.estimated_minutes || 30),
      0
    )

    // Check if all sessions completed
    const allCompleted = dateSessions.every(s => s.status === 'completed')
    const anyCompleted = dateSessions.some(s => s.status === 'completed')

    days.push({
      id: `temp-${date}`, // Temporary ID until saved to DB
      planId: plan.id,
      date,
      weekNumber,
      dayOfWeek,
      topics,
      status: allCompleted ? 'ready' : anyCompleted ? 'partial' : 'pending',
      estimatedTotalMinutes,
      hasFlashcards: false, // Will be set when content is generated
      hasPodcast: false,
      hasMindmap: false,
      hasDailyQuiz: dateSessions.some(s => s.has_daily_quiz),
      hasChat: true, // Chat is always available
    })
  }

  // Sort days by date
  days.sort((a, b) => a.date.localeCompare(b.date))

  // Group into weeks
  const weekMap = new Map<number, StudyGuideDay[]>()
  for (const day of days) {
    if (!weekMap.has(day.weekNumber)) {
      weekMap.set(day.weekNumber, [])
    }
    weekMap.get(day.weekNumber)!.push(day)
  }

  // Build weeks
  const weeks: StudyGuideWeek[] = []
  for (const [weekNumber, weekDays] of weekMap.entries()) {
    weeks.push({
      weekNumber,
      weekStart: weekDays[0].date,
      weekEnd: weekDays[weekDays.length - 1].date,
      days: weekDays,
    })
  }

  // Sort weeks
  weeks.sort((a, b) => a.weekNumber - b.weekNumber)

  // Calculate stats
  const daysCompleted = days.filter(d => d.status === 'ready').length

  return {
    planId: plan.id,
    planTitle: plan.title,
    totalWeeks: weeks.length,
    totalDays: days.length,
    daysCompleted,
    weeks,
  }
}
