import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'

/**
 * GET /api/student/assignments
 * List assignments for the student across all enrolled classes
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = await createClient()
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') // 'pending', 'completed', 'all'

    // Get enrolled classes first
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', context.userId)
      .eq('status', 'active')

    const classIds = enrollments?.map((e) => e.class_id) || []

    if (classIds.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    // Get assignments from enrolled classes
    let query = supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        instructions,
        type,
        due_date,
        min_cards_to_review,
        min_score_percent,
        required_time_minutes,
        allow_late_submission,
        max_attempts,
        is_published,
        created_at,
        class:classes!assignments_class_id_fkey (
          id,
          name,
          subject
        ),
        document:documents!assignments_document_id_fkey (
          id,
          file_name
        )
      `)
      .in('class_id', classIds)
      .eq('is_published', true)

    // Filter by status
    const now = new Date().toISOString()
    if (status === 'pending') {
      query = query.gte('due_date', now)
    } else if (status === 'completed') {
      query = query.lt('due_date', now)
    }

    query = query.order('due_date', { ascending: true, nullsFirst: false })

    const { data: assignments, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    // Get student's submissions for these assignments
    const assignmentIds = assignments?.map((a) => a.id) || []
    let submissionMap = new Map<string, { status: string; score: number | null }>()

    if (assignmentIds.length > 0) {
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score_percent')
        .eq('student_id', context.userId)
        .in('assignment_id', assignmentIds)

      submissions?.forEach((s) => {
        submissionMap.set(s.assignment_id, {
          status: s.status,
          score: s.score_percent,
        })
      })
    }

    // Transform assignments
    const transformedAssignments = assignments?.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      type: a.type,
      dueDate: a.due_date,
      minCardsToReview: a.min_cards_to_review,
      minScorePercent: a.min_score_percent,
      requiredTimeMinutes: a.required_time_minutes,
      allowLateSubmission: a.allow_late_submission,
      maxAttempts: a.max_attempts,
      createdAt: a.created_at,
      class: a.class,
      document: a.document,
      submission: submissionMap.get(a.id) || null,
    })) || []

    return NextResponse.json({ assignments: transformedAssignments })
  } catch (error) {
    console.error('Error in GET /api/student/assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
