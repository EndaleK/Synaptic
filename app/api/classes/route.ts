import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, checkPermission } from '@/lib/permissions'
import type { CreateClassRequest } from '@/lib/types/institutional'

/**
 * GET /api/classes
 * List classes for the current user
 * - Teachers: classes they teach
 * - Students: classes they're enrolled in
 * - Admins: all classes in their school/org
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
    const schoolId = searchParams.get('schoolId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // If user is not part of an organization, return empty
    if (!context.organization) {
      return NextResponse.json({ classes: [] })
    }

    const role = context.organization.role

    let query = supabase
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
        is_archived,
        academic_year,
        semester,
        start_date,
        end_date,
        created_at,
        teacher:user_profiles!classes_teacher_id_fkey (
          id,
          full_name,
          email
        ),
        school:schools!classes_school_id_fkey (
          id,
          name,
          organization_id
        ),
        _count:class_enrollments(count)
      `)

    // Filter by school if specified
    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    // Filter archived unless requested
    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    // Role-based filtering
    if (role === 'teacher' || role === 'teaching_assistant') {
      // Teachers see only their classes
      query = query.eq('teacher_id', context.userId)
    } else if (role === 'student') {
      // Students see enrolled classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', context.userId)
        .eq('status', 'active')

      const classIds = enrollments?.map(e => e.class_id) || []
      if (classIds.length === 0) {
        return NextResponse.json({ classes: [] })
      }
      query = query.in('id', classIds)
    } else if (role === 'school_admin') {
      // School admins see all classes in their school
      query = query.eq('school_id', context.organization.schoolId)
    }
    // org_admin sees all classes (no additional filter needed, just org scope)

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: classes, error } = await query

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    // Transform the response
    const transformedClasses = classes?.map(c => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      gradeLevel: c.grade_level,
      sectionCode: c.section_code,
      description: c.description,
      joinCode: c.join_code,
      maxStudents: c.max_students,
      isArchived: c.is_archived,
      academicYear: c.academic_year,
      semester: c.semester,
      startDate: c.start_date,
      endDate: c.end_date,
      createdAt: c.created_at,
      teacher: c.teacher,
      school: c.school,
      enrollmentCount: (c._count as { count: number }[])?.[0]?.count || 0,
    })) || []

    return NextResponse.json({ classes: transformedClasses })
  } catch (error) {
    console.error('Error in GET /api/classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/classes
 * Create a new class (teachers only)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkPermission(userId, 'class:create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const context = await getUserContext(userId)
    if (!context?.organization) {
      return NextResponse.json({ error: 'Not a member of any organization' }, { status: 403 })
    }

    const body: CreateClassRequest = await req.json()

    // Validate required fields
    if (!body.schoolId || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, name' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify school exists and is in user's organization
    const { data: school } = await supabase
      .from('schools')
      .select('id, organization_id')
      .eq('id', body.schoolId)
      .single()

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    if (school.organization_id !== context.organization.organizationId) {
      return NextResponse.json({ error: 'School not in your organization' }, { status: 403 })
    }

    // Create the class (join_code is auto-generated by trigger)
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        school_id: body.schoolId,
        teacher_id: context.userId,
        name: body.name,
        subject: body.subject,
        grade_level: body.gradeLevel,
        section_code: body.sectionCode,
        description: body.description,
        academic_year: body.academicYear,
        semester: body.semester,
        max_students: body.maxStudents || 35,
        allow_self_enrollment: true,
      })
      .select(`
        id,
        name,
        subject,
        grade_level,
        section_code,
        join_code,
        max_students,
        academic_year,
        semester,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error creating class:', error)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json({
      class: {
        id: newClass.id,
        name: newClass.name,
        subject: newClass.subject,
        gradeLevel: newClass.grade_level,
        sectionCode: newClass.section_code,
        joinCode: newClass.join_code,
        maxStudents: newClass.max_students,
        academicYear: newClass.academic_year,
        semester: newClass.semester,
        createdAt: newClass.created_at,
      },
      message: 'Class created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
