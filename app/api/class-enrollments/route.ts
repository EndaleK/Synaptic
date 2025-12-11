import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/class-enrollments
 * Get class enrollments for a student (for parents viewing their child's classes)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    let targetStudentId = profile.id

    // If studentId provided, verify access (must be guardian or the student themselves)
    if (studentId) {
      const studentIdNum = parseInt(studentId)

      if (studentIdNum !== profile.id) {
        // Check if user is a guardian of this student
        const { data: guardianship } = await supabase
          .from('student_guardians')
          .select('id')
          .eq('parent_id', profile.id)
          .eq('student_id', studentIdNum)
          .eq('is_active', true)
          .single()

        if (!guardianship) {
          return NextResponse.json({ error: "Not authorized to view this student's enrollments" }, { status: 403 })
        }
      }

      targetStudentId = studentIdNum
    }

    // Fetch enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .select(`
        id,
        class_id,
        status,
        enrolled_at,
        class:classes(
          id,
          name,
          subject,
          grade_level,
          teacher:user_profiles!classes_teacher_id_fkey(id, full_name)
        )
      `)
      .eq('student_id', targetStudentId)
      .eq('status', 'active')

    if (enrollmentsError) {
      logger.error('Failed to fetch enrollments', enrollmentsError, { userId })
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/class-enrollments', 200, duration, { userId, count: enrollments?.length || 0 })

    return NextResponse.json({
      success: true,
      enrollments: enrollments || []
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Class enrollments error', error, {})
    logger.api('GET', '/api/class-enrollments', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch class enrollments" },
      { status: 500 }
    )
  }
}
