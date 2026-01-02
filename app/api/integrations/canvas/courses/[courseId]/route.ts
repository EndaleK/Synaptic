/**
 * API Route: /api/integrations/canvas/courses/[courseId]
 *
 * GET: Get course details, assignments, modules, and files
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createCanvasClient } from '@/lib/integrations/canvas-lms'

export const runtime = 'nodejs'

/**
 * GET /api/integrations/canvas/courses/[courseId]
 * Get course assignments, modules, and files
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
    const courseIdNum = parseInt(courseId, 10)

    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user profile with Canvas credentials
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, canvas_base_url, canvas_access_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.canvas_access_token || !profile.canvas_base_url) {
      return NextResponse.json(
        { error: 'Canvas not connected' },
        { status: 400 }
      )
    }

    // Create Canvas client
    const canvas = createCanvasClient({
      baseUrl: profile.canvas_base_url,
      accessToken: profile.canvas_access_token
    })

    // Fetch course details, assignments, modules, and files in parallel
    const [course, assignments, modules, files] = await Promise.all([
      canvas.getCourse(courseIdNum),
      canvas.getAssignments(courseIdNum),
      canvas.getModules(courseIdNum),
      canvas.getFiles(courseIdNum).catch(() => []) // Files might not be accessible
    ])

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        courseCode: course.course_code,
        workflowState: course.workflow_state
      },
      assignments: assignments.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        dueAt: a.due_at,
        pointsPossible: a.points_possible,
        htmlUrl: a.html_url,
        workflowState: a.workflow_state
      })),
      modules: modules.map(m => ({
        id: m.id,
        name: m.name,
        position: m.position,
        itemsCount: m.items_count,
        items: m.items?.map(i => ({
          id: i.id,
          title: i.title,
          type: i.type,
          htmlUrl: i.html_url
        }))
      })),
      files: files.map(f => ({
        id: f.id,
        displayName: f.display_name,
        contentType: f.content_type,
        size: f.size,
        url: f.url
      }))
    })
  } catch (error) {
    console.error('[Canvas] Course fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}
