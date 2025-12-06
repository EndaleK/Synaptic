import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { requireClassAccess, canManageClass } from '@/lib/permissions'

/**
 * GET /api/classes/[classId]/students
 * List students enrolled in a class
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Require class access with student viewing permission
    const { isOwner } = await requireClassAccess(userId, classId)
    if (!isOwner) {
      // Only teachers/admins can see student list
      const canView = await canManageClass(userId, classId, 'class:view_students')
      if (!canView) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    const supabase = await createClient()
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'

    let query = supabase
      .from('class_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        student:user_profiles!class_enrollments_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('class_id', classId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.order('enrolled_at', { ascending: false })

    const { data: enrollments, error } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Get student progress data (flashcard stats, study time, etc.)
    const studentIds = enrollments?.map(e => (e.student as { id: string })?.id).filter(Boolean) || []

    // Get flashcard stats for these students in this class
    const { data: flashcardStats } = await supabase
      .from('flashcards')
      .select('user_id, times_reviewed, times_correct')
      .eq('class_id', classId)
      .in('user_id', studentIds)

    // Aggregate stats by student
    const statsMap = new Map<string, { reviewed: number; correct: number }>()
    flashcardStats?.forEach(f => {
      const existing = statsMap.get(f.user_id) || { reviewed: 0, correct: 0 }
      statsMap.set(f.user_id, {
        reviewed: existing.reviewed + (f.times_reviewed || 0),
        correct: existing.correct + (f.times_correct || 0),
      })
    })

    const students = enrollments?.map(e => {
      const student = e.student as { id: string; full_name: string; email: string }
      const stats = statsMap.get(student?.id) || { reviewed: 0, correct: 0 }

      return {
        enrollmentId: e.id,
        enrolledAt: e.enrolled_at,
        status: e.status,
        student: {
          id: student?.id,
          fullName: student?.full_name,
          email: student?.email,
        },
        stats: {
          cardsReviewed: stats.reviewed,
          accuracy: stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0,
        },
      }
    }) || []

    return NextResponse.json({
      students,
      total: students.length,
    })
  } catch (error) {
    console.error('Error in GET /api/classes/[classId]/students:', error)
    if ((error as Error).name === 'UnauthorizedError') {
      return NextResponse.json({ error: (error as Error).message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/classes/[classId]/students
 * Add a student to the class (teacher/admin)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Check permission to manage students
    const canManage = await canManageClass(userId, classId, 'class:manage_students')
    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()
    const { studentEmail, studentId } = body

    if (!studentEmail && !studentId) {
      return NextResponse.json(
        { error: 'Either studentEmail or studentId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find student by email or ID
    let studentProfileId = studentId

    if (studentEmail && !studentId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', studentEmail)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      studentProfileId = profile.id
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id, status')
      .eq('class_id', classId)
      .eq('student_id', studentProfileId)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'Student already enrolled' }, { status: 400 })
      }

      // Re-activate if dropped
      const { error: updateError } = await supabase
        .from('class_enrollments')
        .update({ status: 'active', enrolled_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to re-enroll student' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Student re-enrolled successfully' })
    }

    // Get teacher's user ID for enrolled_by
    const { data: teacherProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    // Create enrollment
    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: studentProfileId,
        enrolled_by: teacherProfile?.id,
        status: 'active',
      })

    if (enrollError) {
      console.error('Error enrolling student:', enrollError)
      return NextResponse.json({ error: 'Failed to enroll student' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Student enrolled successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/classes/[classId]/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/classes/[classId]/students
 * Remove a student from the class
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Check permission
    const canManage = await canManageClass(userId, classId, 'class:manage_students')
    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()
    const { enrollmentId, studentId } = body

    if (!enrollmentId && !studentId) {
      return NextResponse.json(
        { error: 'Either enrollmentId or studentId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('class_enrollments')
      .update({ status: 'dropped' })
      .eq('class_id', classId)

    if (enrollmentId) {
      query = query.eq('id', enrollmentId)
    } else {
      query = query.eq('student_id', studentId)
    }

    const { error } = await query

    if (error) {
      console.error('Error removing student:', error)
      return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Student removed successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/classes/[classId]/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
