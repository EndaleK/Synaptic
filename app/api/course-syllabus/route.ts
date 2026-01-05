/**
 * Course Syllabus CRUD API
 *
 * GET /api/course-syllabus - List user's syllabi
 * POST /api/course-syllabus - Save a syllabus (and optionally create study plan)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { saveSyllabus, saveCoursePlan, generateCoursePlanFromGeneratedSyllabus } from '@/lib/course-plan-generator'
import type { GeneratedSyllabus, CourseInput } from '@/lib/supabase/types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fetch syllabi
  const { data: syllabi, error } = await supabase
    .from('course_syllabi')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Course Syllabus API] Error fetching syllabi:', error)
    return NextResponse.json({ error: 'Failed to fetch syllabi' }, { status: 500 })
  }

  return NextResponse.json({ syllabi })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    syllabus: GeneratedSyllabus
    courseInput: CourseInput
    createPlan?: boolean
    planOptions?: {
      startDate: string
      endDate: string
      dailyTargetMinutes: number
      includeWeekends: boolean
      learningStyle?: string
    }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { syllabus, courseInput, createPlan, planOptions } = body

  if (!syllabus || !courseInput) {
    return NextResponse.json(
      { error: 'Syllabus and courseInput are required' },
      { status: 400 }
    )
  }

  try {
    // Save the syllabus
    const syllabusId = await saveSyllabus(syllabus, userId, courseInput)

    let planId: string | undefined

    // Optionally create a study plan
    if (createPlan && planOptions) {
      const plan = generateCoursePlanFromGeneratedSyllabus(userId, syllabus, {
        startDate: new Date(planOptions.startDate),
        endDate: new Date(planOptions.endDate),
        dailyTargetMinutes: planOptions.dailyTargetMinutes,
        includeWeekends: planOptions.includeWeekends,
        learningStyle: (planOptions.learningStyle as any) || undefined,
      })

      // Update plan with syllabus ID
      plan.syllabusId = syllabusId

      planId = await saveCoursePlan(plan, userId)
    }

    return NextResponse.json({
      success: true,
      syllabusId,
      planId,
    })
  } catch (error) {
    console.error('[Course Syllabus API] Error saving:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save syllabus' },
      { status: 500 }
    )
  }
}
