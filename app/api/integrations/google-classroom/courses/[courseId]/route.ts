/**
 * API Route: /api/integrations/google-classroom/courses/[courseId]
 *
 * GET: Get course details, assignments, and materials
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  createClassroomClient,
  getCourseAssignments,
  getCourseTopics
} from '@/lib/integrations/google-classroom'

export const runtime = 'nodejs'

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`
}

/**
 * GET /api/integrations/google-classroom/courses/[courseId]
 * Get course assignments and topics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await params

    const supabase = await createClient()

    // Get user profile with Google tokens
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, google_classroom_access_token, google_classroom_refresh_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.google_classroom_access_token) {
      return NextResponse.json(
        { error: 'Google Classroom not connected' },
        { status: 400 }
      )
    }

    // Create Classroom client
    const classroom = createClassroomClient(
      config,
      profile.google_classroom_access_token,
      profile.google_classroom_refresh_token || undefined
    )

    // Fetch assignments and topics in parallel
    const [assignments, topics] = await Promise.all([
      getCourseAssignments(classroom, courseId),
      getCourseTopics(classroom, courseId)
    ])

    return NextResponse.json({
      courseId,
      assignments,
      topics
    })
  } catch (error) {
    console.error('[Google Classroom] Course fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}
