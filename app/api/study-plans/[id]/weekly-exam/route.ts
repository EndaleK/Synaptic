/**
 * API Route: /api/study-plans/[id]/weekly-exam
 *
 * GET: Get existing weekly exam for a specific week
 * POST: Generate a new weekly exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyExam, getWeeklyExam } from '@/lib/session-exam-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 180 // 3 minutes for comprehensive exam generation

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study-plans/[id]/weekly-exam?week=1
 * Get existing weekly exam
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await context.params
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const weekNumber = parseInt(searchParams.get('week') || '1', 10)

    if (weekNumber < 1) {
      return NextResponse.json({ error: 'Invalid week number' }, { status: 400 })
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

    // Verify plan belongs to user
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id, title')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    // Get existing exam
    const exam = await getWeeklyExam(planId, weekNumber, profile.id)

    if (!exam) {
      return NextResponse.json({ error: 'No exam found for this week' }, { status: 404 })
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error('[WeeklyExam] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get weekly exam' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-plans/[id]/weekly-exam
 * Generate a new weekly exam
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await context.params
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    const body = await req.json()
    const weekNumber = body.weekNumber || 1
    const questionCount = Math.min(Math.max(body.questionCount || 20, 10), 30) // 10-30 questions

    if (weekNumber < 1) {
      return NextResponse.json({ error: 'Invalid week number' }, { status: 400 })
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

    // Verify plan belongs to user
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id, title')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    // Check if exam already exists
    const existingExam = await getWeeklyExam(planId, weekNumber, profile.id)
    if (existingExam) {
      return NextResponse.json(existingExam)
    }

    // Generate exam
    const exam = await generateWeeklyExam({
      studyPlanId: planId,
      userId: profile.id,
      weekNumber,
      questionCount,
    })

    return NextResponse.json(exam)
  } catch (error) {
    console.error('[WeeklyExam] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate weekly exam' },
      { status: 500 }
    )
  }
}
