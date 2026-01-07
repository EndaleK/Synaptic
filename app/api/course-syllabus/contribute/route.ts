/**
 * Syllabus Contribution API
 *
 * POST /api/course-syllabus/contribute
 *
 * Allows users to contribute syllabi to improve the template database.
 * Contributions are stored for review before being merged into templates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { GeneratedSyllabus } from '@/lib/supabase/types'

export const maxDuration = 30

interface ContributionInput {
  institution: string
  courseCode?: string
  courseName: string
  semester?: string
  year?: number
  syllabus: GeneratedSyllabus
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let input: ContributionInput

  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate required fields
  if (!input.institution || !input.courseName || !input.syllabus) {
    return NextResponse.json(
      { error: 'Institution, course name, and syllabus data are required' },
      { status: 400 }
    )
  }

  // Validate syllabus has content
  if (!input.syllabus.weeklySchedule || input.syllabus.weeklySchedule.length === 0) {
    return NextResponse.json(
      { error: 'Syllabus must have a weekly schedule' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Get user's internal ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Create the contribution record
    const { data: contribution, error: insertError } = await supabase
      .from('syllabus_contributions')
      .insert({
        user_id: userProfile.id,
        institution: input.institution,
        course_code: input.courseCode,
        course_name: input.courseName,
        semester: input.semester,
        year: input.year,
        syllabus_data: {
          courseName: input.syllabus.courseName,
          courseDescription: input.syllabus.courseDescription,
          learningObjectives: input.syllabus.learningObjectives,
          weeklySchedule: input.syllabus.weeklySchedule,
          textbooks: input.syllabus.textbooks,
          gradingScheme: input.syllabus.gradingScheme,
        },
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Syllabus Contribution] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save contribution' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contributing! Your syllabus will be reviewed.',
      contributionId: contribution.id,
    })
  } catch (error) {
    console.error('[Syllabus Contribution] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/course-syllabus/contribute
 *
 * Get user's contribution history
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Get user's internal ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get user's contributions
    const { data: contributions, error: fetchError } = await supabase
      .from('syllabus_contributions')
      .select('id, institution, course_name, status, created_at, reviewed_at')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[Syllabus Contribution] Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ contributions })
  } catch (error) {
    console.error('[Syllabus Contribution] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
