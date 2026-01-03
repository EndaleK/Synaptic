import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'
import type { JoinClassRequest } from '@/lib/types/institutional'

/**
 * POST /api/classes/join
 * Join a class using a join code
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

    const body: JoinClassRequest = await req.json()

    if (!body.joinCode) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 })
    }

    // Normalize join code (uppercase, trim)
    const joinCode = body.joinCode.toUpperCase().trim()

    if (joinCode.length !== 6) {
      return NextResponse.json({ error: 'Join code must be 6 characters' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find class by join code
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        subject,
        max_students,
        allow_self_enrollment,
        is_archived,
        teacher_id,
        school:schools!classes_school_id_fkey (
          id,
          name,
          organization_id
        )
      `)
      .eq('join_code', joinCode)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })
    }

    // Check if class is archived
    if (classData.is_archived) {
      return NextResponse.json({ error: 'This class is no longer active' }, { status: 400 })
    }

    // Check if self-enrollment is allowed
    if (!classData.allow_self_enrollment) {
      return NextResponse.json(
        { error: 'Self-enrollment is not allowed for this class. Contact your teacher.' },
        { status: 403 }
      )
    }

    // Check if user is the teacher (can't enroll in own class as student)
    if (classData.teacher_id === context.userId) {
      return NextResponse.json(
        { error: 'You are the teacher of this class' },
        { status: 400 }
      )
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('class_enrollments')
      .select('id, status')
      .eq('class_id', classData.id)
      .eq('student_id', context.userId)
      .single()

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json(
          { error: 'You are already enrolled in this class' },
          { status: 400 }
        )
      }

      // Re-activate if previously dropped
      if (existingEnrollment.status === 'dropped') {
        const { error: updateError } = await supabase
          .from('class_enrollments')
          .update({ status: 'active', enrolled_at: new Date().toISOString() })
          .eq('id', existingEnrollment.id)

        if (updateError) {
          console.error('Error re-enrolling:', updateError)
          return NextResponse.json({ error: 'Failed to re-enroll' }, { status: 500 })
        }

        return NextResponse.json({
          message: 'Re-enrolled in class successfully',
          class: {
            id: classData.id,
            name: classData.name,
            subject: classData.subject,
          },
        })
      }
    }

    // Check class capacity
    const { count: currentEnrollment } = await supabase
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classData.id)
      .eq('status', 'active')

    if (currentEnrollment && currentEnrollment >= classData.max_students) {
      return NextResponse.json({ error: 'Class is full' }, { status: 400 })
    }

    // Check if user is in the same organization (if institutional user)
    const schoolData = classData.school as unknown as { id: string; name: string; organization_id: string }
    const school = schoolData

    if (context.organization) {
      if (school.organization_id !== context.organization.organizationId) {
        return NextResponse.json(
          { error: 'This class is not in your organization' },
          { status: 403 }
        )
      }
    } else {
      // Individual user joining - add them to org as student
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: school.organization_id,
          user_id: context.userId,
          role: 'student',
          accepted_at: new Date().toISOString(),
          is_active: true,
        })

      if (memberError && !memberError.message.includes('duplicate')) {
        console.error('Error adding to organization:', memberError)
        // Continue anyway - they might already be a member
      }
    }

    // Create enrollment
    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classData.id,
        student_id: context.userId,
        enrolled_by: context.userId,
        status: 'active',
      })

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError)
      return NextResponse.json({ error: 'Failed to join class' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Joined class successfully',
      class: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        school: {
          id: school.id,
          name: school.name,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/classes/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/classes/join?code=ABC123
 * Preview a class before joining (get basic info)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const joinCode = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()

    if (!joinCode || joinCode.length !== 6) {
      return NextResponse.json({ error: 'Valid join code required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        subject,
        grade_level,
        description,
        max_students,
        allow_self_enrollment,
        is_archived,
        teacher:user_profiles!classes_teacher_id_fkey (
          full_name
        ),
        school:schools!classes_school_id_fkey (
          name,
          organizations (
            name
          )
        )
      `)
      .eq('join_code', joinCode)
      .single()

    if (error || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classData.is_archived) {
      return NextResponse.json({ error: 'This class is no longer active' }, { status: 400 })
    }

    // Get current enrollment count
    const { count: enrollmentCount } = await supabase
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classData.id)
      .eq('status', 'active')

    const school = classData.school as unknown as { name: string; organizations: { name: string } }
    const teacher = classData.teacher as unknown as { full_name: string }

    return NextResponse.json({
      class: {
        name: classData.name,
        subject: classData.subject,
        gradeLevel: classData.grade_level,
        description: classData.description,
        teacherName: teacher?.full_name || 'Unknown',
        schoolName: school?.name,
        organizationName: school?.organizations?.name,
        enrollmentCount: enrollmentCount || 0,
        maxStudents: classData.max_students,
        isFull: (enrollmentCount || 0) >= classData.max_students,
        allowSelfEnrollment: classData.allow_self_enrollment,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/classes/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
