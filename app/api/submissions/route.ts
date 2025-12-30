import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, canAccessClass } from '@/lib/permissions'

/**
 * POST /api/submissions
 * Create or update a submission (student starting/completing an assignment)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { assignmentId, action } = body as {
      assignmentId: string
      action: 'start' | 'submit' | 'update'
      scorePercent?: number
      cardsReviewed?: number
      cardsMastered?: number
      timeSpentSeconds?: number
    }

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get assignment to verify access
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, class_id, is_published, max_attempts')
      .eq('id', assignmentId)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (!assignment.is_published) {
      return NextResponse.json({ error: 'Assignment is not available' }, { status: 403 })
    }

    // Verify student is enrolled in the class
    const access = await canAccessClass(userId, assignment.class_id)
    if (!access.allowed || !access.isEnrolled) {
      return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 403 })
    }

    // Check for existing submission
    const { data: existingSubmission } = await supabase
      .from('assignment_submissions')
      .select('id, status, attempt_number')
      .eq('assignment_id', assignmentId)
      .eq('student_id', context.userId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single()

    if (action === 'start') {
      // Check if we need a new attempt or can continue existing
      if (existingSubmission) {
        if (existingSubmission.status === 'in_progress') {
          // Continue existing attempt
          return NextResponse.json({
            submission: {
              id: existingSubmission.id,
              status: 'in_progress',
            },
            message: 'Continuing existing attempt',
          })
        }

        // Check max attempts
        if (assignment.max_attempts && existingSubmission.attempt_number >= assignment.max_attempts) {
          return NextResponse.json(
            { error: 'Maximum attempts reached' },
            { status: 400 }
          )
        }
      }

      // Create new submission
      const attemptNumber = existingSubmission ? existingSubmission.attempt_number + 1 : 1

      const { data: newSubmission, error: createError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: context.userId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          attempt_number: attemptNumber,
          time_spent_seconds: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating submission:', createError)
        return NextResponse.json({ error: 'Failed to start assignment' }, { status: 500 })
      }

      return NextResponse.json({
        submission: {
          id: newSubmission.id,
          status: 'in_progress',
          attemptNumber,
        },
        message: 'Assignment started',
      }, { status: 201 })
    }

    if (action === 'submit' || action === 'update') {
      if (!existingSubmission) {
        return NextResponse.json({ error: 'No submission found' }, { status: 404 })
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (body.scorePercent !== undefined) {
        updates.score_percent = body.scorePercent
      }
      if (body.cardsReviewed !== undefined) {
        updates.cards_reviewed = body.cardsReviewed
      }
      if (body.cardsMastered !== undefined) {
        updates.cards_mastered = body.cardsMastered
      }
      if (body.timeSpentSeconds !== undefined) {
        updates.time_spent_seconds = body.timeSpentSeconds
      }

      if (action === 'submit') {
        updates.status = 'submitted'
        updates.submitted_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update(updates)
        .eq('id', existingSubmission.id)

      if (updateError) {
        console.error('Error updating submission:', updateError)
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: action === 'submit' ? 'Assignment submitted' : 'Progress saved',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
