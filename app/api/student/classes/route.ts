import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'

/**
 * GET /api/student/classes
 * List classes the student is enrolled in
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

    // Get enrolled classes
    const { data: enrollments, error } = await supabase
      .from('class_enrollments')
      .select(`
        id,
        status,
        enrolled_at,
        class:classes!class_enrollments_class_id_fkey (
          id,
          name,
          subject,
          grade_level,
          section_code,
          description,
          teacher_id,
          school:schools!classes_school_id_fkey (
            id,
            name
          )
        )
      `)
      .eq('student_id', context.userId)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('Error fetching enrollments:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    // Get teacher info for each class
    const teacherIds = enrollments
      ?.map((e) => (e.class as any)?.teacher_id)
      .filter(Boolean) as string[]

    let teacherMap = new Map<string, { name: string | null; email: string }>()

    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', teacherIds)

      teachers?.forEach((t) => {
        teacherMap.set(t.id, { name: t.full_name, email: t.email })
      })
    }

    // Get enrollment counts
    const classIds = enrollments?.map((e) => (e.class as any)?.id).filter(Boolean) as string[]
    let enrollmentCounts = new Map<string, number>()

    if (classIds.length > 0) {
      const { data: counts } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'active')

      counts?.forEach((c) => {
        enrollmentCounts.set(c.class_id, (enrollmentCounts.get(c.class_id) || 0) + 1)
      })
    }

    // Transform data
    const classes = enrollments?.map((e) => {
      const cls = e.class as any
      const teacherId = cls?.teacher_id
      const teacher = teacherId ? teacherMap.get(teacherId) : null

      return {
        id: cls?.id,
        name: cls?.name,
        subject: cls?.subject,
        gradeLevel: cls?.grade_level,
        sectionCode: cls?.section_code,
        description: cls?.description,
        school: cls?.school,
        teacher: teacher ? { name: teacher.name } : null,
        enrollmentCount: enrollmentCounts.get(cls?.id) || 0,
        enrolledAt: e.enrolled_at,
      }
    }).filter((c) => c.id) || []

    return NextResponse.json({ classes })
  } catch (error) {
    console.error('Error in GET /api/student/classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
