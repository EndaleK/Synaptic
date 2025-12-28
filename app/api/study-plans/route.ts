/**
 * API Route: /api/study-plans
 *
 * GET: List user's study plans
 * POST: Generate and save a new study plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateStudyPlan,
  saveStudyPlan,
  getUserStudyPlans,
} from '@/lib/study-plan-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute for plan generation

/**
 * GET /api/study-plans
 * List user's study plans
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // active, paused, completed, all

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
      .from('study_plans')
      .select('*')
      .eq('user_id', profile.id)
      .order('exam_date', { ascending: true })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    } else if (!status) {
      // Default to active and paused plans
      query = query.in('status', ['active', 'paused'])
    }

    const { data: plans, error: plansError } = await query

    if (plansError) {
      console.error('[StudyPlans] Error fetching plans:', plansError)
      return NextResponse.json(
        { error: 'Failed to fetch study plans' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedPlans = (plans || []).map((plan) => ({
      id: plan.id,
      userId: plan.user_id,
      title: plan.title,
      description: plan.description,
      examEventId: plan.exam_event_id,
      examDate: plan.exam_date,
      examTitle: plan.exam_title,
      documents: plan.documents,
      status: plan.status,
      totalEstimatedHours: plan.total_estimated_hours,
      hoursCompleted: plan.hours_completed,
      dailyTargetHours: plan.daily_target_hours,
      startDate: plan.start_date,
      learningStyle: plan.learning_style,
      modePriorities: plan.mode_priorities,
      masteryThreshold: plan.mastery_threshold,
      weakTopics: plan.weak_topics,
      sessionsCompleted: plan.sessions_completed,
      sessionsTotal: plan.sessions_total,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    }))

    return NextResponse.json({
      plans: transformedPlans,
      total: transformedPlans.length,
    })
  } catch (error) {
    console.error('[StudyPlans] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get study plans' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-plans
 * Generate and save a new study plan
 *
 * Body:
 * - examDate: string (ISO date)
 * - examTitle?: string
 * - examEventId?: string
 * - documentIds: string[]
 * - dailyTargetHours?: number (default 2)
 * - startDate?: string (ISO date, default today)
 * - includeWeekends?: boolean (default true)
 * - save?: boolean (default true) - if false, returns preview only
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      examDate,
      examTitle,
      examEventId,
      documentIds,
      dailyTargetHours = 2,
      startDate,
      includeWeekends = true,
      save = true,
    } = body

    // Validate required fields
    if (!examDate) {
      return NextResponse.json(
        { error: 'examDate is required' },
        { status: 400 }
      )
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one documentId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, learning_style')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get learning style from learning_profiles if available
    let learningStyle = profile.learning_style || 'mixed'
    const { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('dominant_style')
      .eq('user_id', profile.id)
      .single()

    if (learningProfile?.dominant_style) {
      learningStyle = learningProfile.dominant_style
    }

    console.log(
      `[StudyPlans] Generating plan for ${documentIds.length} documents, exam: ${examDate}`
    )

    // Generate the plan
    const plan = await generateStudyPlan(profile.id, {
      examDate: new Date(examDate),
      examTitle,
      examEventId,
      documentIds,
      learningStyle,
      dailyTargetHours,
      startDate: startDate ? new Date(startDate) : undefined,
      includeWeekends,
    })

    console.log(
      `[StudyPlans] Plan generated: ${plan.sessions.length} sessions, ${plan.totalEstimatedHours}h total`
    )

    // Save if requested
    if (save) {
      const savedPlan = await saveStudyPlan(plan)
      console.log(`[StudyPlans] Plan saved: ${savedPlan.id}`)

      return NextResponse.json({
        plan: savedPlan,
        saved: true,
      })
    }

    // Return preview only
    return NextResponse.json({
      plan,
      saved: false,
      preview: true,
    })
  } catch (error) {
    console.error('[StudyPlans] POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate study plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
