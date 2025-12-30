import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessClass } from '@/lib/permissions'

/**
 * GET /api/assignments/[assignmentId]/submissions
 * List all submissions for an assignment (teacher only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assignmentId } = await params
    const supabase = await createClient()

    // Get assignment to check ownership
    const { data: assignment } = await supabase
      .from('assignments')
      .select('class_id')
      .eq('id', assignmentId)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check if user is the class owner (teacher)
    const access = await canAccessClass(userId, assignment.class_id)
    if (!access.allowed || !access.isOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get all submissions with student info
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        student_id,
        status,
        started_at,
        submitted_at,
        time_spent_seconds,
        score_percent,
        cards_reviewed,
        cards_mastered,
        attempt_number,
        feedback,
        graded_by,
        graded_at,
        created_at,
        user_profiles!assignment_submissions_student_id_fkey (
          email,
          full_name
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Transform submissions
    const transformedSubmissions = submissions?.map((s) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: (s.user_profiles as any)?.full_name || null,
      studentEmail: (s.user_profiles as any)?.email || 'Unknown',
      status: s.status,
      startedAt: s.started_at,
      submittedAt: s.submitted_at,
      timeSpentSeconds: s.time_spent_seconds,
      scorePercent: s.score_percent,
      cardsReviewed: s.cards_reviewed,
      cardsMastered: s.cards_mastered,
      attemptNumber: s.attempt_number,
      feedback: s.feedback,
      gradedBy: s.graded_by,
      gradedAt: s.graded_at,
      createdAt: s.created_at,
    })) || []

    return NextResponse.json({ submissions: transformedSubmissions })
  } catch (error) {
    console.error('Error in GET /api/assignments/[assignmentId]/submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
