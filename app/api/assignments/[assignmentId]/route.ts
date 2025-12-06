import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, canAccessClass, canManageClass } from '@/lib/permissions'

/**
 * GET /api/assignments/[assignmentId]
 * Get assignment details
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
    const context = await getUserContext(userId)

    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Get assignment with related data
    const { data: assignment, error } = await supabase
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
        show_answers_after_due,
        is_published,
        published_at,
        created_at,
        updated_at,
        class_id,
        document_id,
        exam_id,
        class:classes!assignments_class_id_fkey (
          id,
          name,
          subject,
          teacher_id
        ),
        document:documents!assignments_document_id_fkey (
          id,
          file_name,
          file_type
        )
      `)
      .eq('id', assignmentId)
      .single()

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check access to the class
    const access = await canAccessClass(userId, assignment.class_id)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Students can only see published assignments
    if (!access.isOwner && !assignment.is_published) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Get submission stats for teachers
    let submissionStats = null
    if (access.isOwner) {
      const { data: stats } = await supabase
        .from('assignment_submissions')
        .select('status')
        .eq('assignment_id', assignmentId)

      const statusCounts = stats?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Get class size
      const { count: totalStudents } = await supabase
        .from('class_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', assignment.class_id)
        .eq('status', 'active')

      submissionStats = {
        totalStudents: totalStudents || 0,
        submitted: statusCounts['submitted'] || 0,
        graded: statusCounts['graded'] || 0,
        inProgress: statusCounts['in_progress'] || 0,
        notStarted: (totalStudents || 0) - (stats?.length || 0),
      }
    }

    // Get student's own submission if they're a student
    let mySubmission = null
    if (access.isEnrolled) {
      const { data: submission } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          status,
          started_at,
          submitted_at,
          time_spent_seconds,
          score_percent,
          cards_reviewed,
          cards_mastered,
          attempt_number,
          feedback,
          graded_at
        `)
        .eq('assignment_id', assignmentId)
        .eq('student_id', context.userId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single()

      mySubmission = submission
    }

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        type: assignment.type,
        dueDate: assignment.due_date,
        minCardsToReview: assignment.min_cards_to_review,
        minScorePercent: assignment.min_score_percent,
        requiredTimeMinutes: assignment.required_time_minutes,
        allowLateSubmission: assignment.allow_late_submission,
        maxAttempts: assignment.max_attempts,
        showAnswersAfterDue: assignment.show_answers_after_due,
        isPublished: assignment.is_published,
        publishedAt: assignment.published_at,
        createdAt: assignment.created_at,
        class: assignment.class,
        document: assignment.document,
      },
      submissionStats,
      mySubmission,
      isOwner: access.isOwner,
    })
  } catch (error) {
    console.error('Error in GET /api/assignments/[assignmentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/assignments/[assignmentId]
 * Update assignment (teacher only)
 */
export async function PATCH(
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

    // Check permission
    const canEdit = await canManageClass(userId, assignment.class_id, 'assignment:edit')
    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()

    // Handle publishing
    if (body.isPublished !== undefined && body.isPublished === true) {
      body.published_at = new Date().toISOString()
    }

    // Fields that can be updated
    const allowedFields = [
      'title',
      'description',
      'instructions',
      'type',
      'document_id',
      'exam_id',
      'due_date',
      'min_cards_to_review',
      'min_score_percent',
      'required_time_minutes',
      'allow_late_submission',
      'max_attempts',
      'show_answers_after_due',
      'is_published',
      'published_at',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      const snakeField = field
      const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

      if (body[camelField] !== undefined) {
        updates[snakeField] = body[camelField]
      } else if (body[snakeField] !== undefined) {
        updates[snakeField] = body[snakeField]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    return NextResponse.json({
      assignment: updated,
      message: 'Assignment updated successfully',
    })
  } catch (error) {
    console.error('Error in PATCH /api/assignments/[assignmentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/assignments/[assignmentId]
 * Delete assignment (teacher only)
 */
export async function DELETE(
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

    // Check permission
    const canDelete = await canManageClass(userId, assignment.class_id, 'assignment:delete')
    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete assignment (cascades to submissions)
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      console.error('Error deleting assignment:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/assignments/[assignmentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
