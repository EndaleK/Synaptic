import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, checkPermission, canAccessClass } from '@/lib/permissions'
import type { CreateAssignmentRequest } from '@/lib/types/institutional'

/**
 * GET /api/assignments
 * List assignments
 * - Teachers: assignments they created
 * - Students: assignments in their enrolled classes
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
    const classId = searchParams.get('classId')
    const status = searchParams.get('status') // 'upcoming', 'past', 'all'

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
        published_at,
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

    // Filter by class if specified
    if (classId) {
      // Verify user has access to this class
      const access = await canAccessClass(userId, classId)
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      query = query.eq('class_id', classId)
    } else if (context.organization) {
      // Get assignments based on role
      if (context.organization.role === 'teacher') {
        query = query.eq('created_by', context.userId)
      } else if (context.organization.role === 'student') {
        // Get enrolled classes first
        const { data: enrollments } = await supabase
          .from('class_enrollments')
          .select('class_id')
          .eq('student_id', context.userId)
          .eq('status', 'active')

        const classIds = enrollments?.map(e => e.class_id) || []
        if (classIds.length === 0) {
          return NextResponse.json({ assignments: [] })
        }
        query = query.in('class_id', classIds).eq('is_published', true)
      }
    }

    // Filter by status
    const now = new Date().toISOString()
    if (status === 'upcoming') {
      query = query.gte('due_date', now)
    } else if (status === 'past') {
      query = query.lt('due_date', now)
    }

    query = query.order('due_date', { ascending: true, nullsFirst: false })

    const { data: assignments, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    // For students, include their submission status
    const submissionMap = new Map<string, { status: string; score?: number }>()

    if (context.organization?.role === 'student' && assignments?.length) {
      const assignmentIds = assignments.map(a => a.id)
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score_percent')
        .eq('student_id', context.userId)
        .in('assignment_id', assignmentIds)

      submissions?.forEach(s => {
        submissionMap.set(s.assignment_id, {
          status: s.status,
          score: s.score_percent,
        })
      })
    }

    const transformedAssignments = assignments?.map(a => ({
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
      isPublished: a.is_published,
      publishedAt: a.published_at,
      createdAt: a.created_at,
      class: a.class,
      document: a.document,
      submission: submissionMap.get(a.id) || null,
    })) || []

    return NextResponse.json({ assignments: transformedAssignments })
  } catch (error) {
    console.error('Error in GET /api/assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/assignments
 * Create a new assignment (teachers only)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkPermission(userId, 'assignment:create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body: CreateAssignmentRequest = await req.json()

    // Validate required fields
    if (!body.classId || !body.title || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, title, type' },
        { status: 400 }
      )
    }

    // Verify user has access to the class
    const access = await canAccessClass(userId, body.classId)
    if (!access.allowed || !access.isOwner) {
      return NextResponse.json({ error: 'Not authorized for this class' }, { status: 403 })
    }

    const supabase = await createClient()

    // Create the assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        class_id: body.classId,
        created_by: context.userId,
        title: body.title,
        description: body.description,
        instructions: body.instructions,
        type: body.type,
        document_id: body.documentId,
        exam_id: body.examId,
        due_date: body.dueDate,
        min_cards_to_review: body.minCardsToReview,
        min_score_percent: body.minScorePercent,
        required_time_minutes: body.requiredTimeMinutes,
        allow_late_submission: body.allowLateSubmission ?? true,
        max_attempts: body.maxAttempts,
        is_published: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        dueDate: assignment.due_date,
        isPublished: assignment.is_published,
      },
      message: 'Assignment created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
