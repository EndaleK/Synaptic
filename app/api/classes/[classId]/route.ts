import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { requireClassAccess, canManageClass } from '@/lib/permissions'

/**
 * GET /api/classes/[classId]
 * Get class details
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

    // Check access
    try {
      await requireClassAccess(userId, classId)
    } catch {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        subject,
        grade_level,
        section_code,
        description,
        join_code,
        max_students,
        allow_self_enrollment,
        is_archived,
        academic_year,
        semester,
        start_date,
        end_date,
        settings,
        created_at,
        updated_at,
        teacher:user_profiles!classes_teacher_id_fkey (
          id,
          full_name,
          email
        ),
        school:schools!classes_school_id_fkey (
          id,
          name,
          organization_id,
          organizations (
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', classId)
      .single()

    if (error || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get enrollment count
    const { count: enrollmentCount } = await supabase
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active')

    // Get assignment count
    const { count: assignmentCount } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        gradeLevel: classData.grade_level,
        sectionCode: classData.section_code,
        description: classData.description,
        joinCode: classData.join_code,
        maxStudents: classData.max_students,
        allowSelfEnrollment: classData.allow_self_enrollment,
        isArchived: classData.is_archived,
        academicYear: classData.academic_year,
        semester: classData.semester,
        startDate: classData.start_date,
        endDate: classData.end_date,
        settings: classData.settings,
        createdAt: classData.created_at,
        updatedAt: classData.updated_at,
        teacher: classData.teacher,
        school: classData.school,
        enrollmentCount: enrollmentCount || 0,
        assignmentCount: assignmentCount || 0,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/classes/[classId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/classes/[classId]
 * Update class details (teacher/admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Check edit permission
    const canEdit = await canManageClass(userId, classId, 'class:edit')
    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()

    // Fields that can be updated
    const allowedFields = [
      'name',
      'subject',
      'grade_level',
      'section_code',
      'description',
      'max_students',
      'allow_self_enrollment',
      'is_archived',
      'academic_year',
      'semester',
      'start_date',
      'end_date',
      'settings',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      // Handle camelCase to snake_case conversion
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

    const supabase = await createClient()

    const { data: classData, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single()

    if (error) {
      console.error('Error updating class:', error)
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
    }

    return NextResponse.json({
      class: classData,
      message: 'Class updated successfully',
    })
  } catch (error) {
    console.error('Error in PATCH /api/classes/[classId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/classes/[classId]
 * Delete a class (teacher/admin only)
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

    // Check delete permission
    const canDelete = await canManageClass(userId, classId, 'class:delete')
    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    // Soft delete by archiving (safer for data retention)
    const { error } = await supabase
      .from('classes')
      .update({ is_archived: true })
      .eq('id', classId)

    if (error) {
      console.error('Error deleting class:', error)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Class archived successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/classes/[classId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
