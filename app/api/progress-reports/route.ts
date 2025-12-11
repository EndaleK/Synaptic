import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/progress-reports
 * List progress reports for a student (as parent or student)
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

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    let targetStudentId = profile.id

    // If studentId provided, verify access
    if (studentId) {
      const studentIdNum = parseInt(studentId)

      // Check if user is the student or a guardian
      if (studentIdNum !== profile.id) {
        const { data: guardianship } = await supabase
          .from('student_guardians')
          .select('id')
          .eq('parent_id', profile.id)
          .eq('student_id', studentIdNum)
          .eq('is_active', true)
          .single()

        if (!guardianship) {
          return NextResponse.json({ error: "Not authorized to view this student's reports" }, { status: 403 })
        }
      }

      targetStudentId = studentIdNum
    }

    // Fetch reports
    const { data: reports, error: reportsError } = await supabase
      .from('progress_reports')
      .select(`
        id,
        title,
        report_type,
        period_start,
        period_end,
        pdf_url,
        status,
        shared_with_guardians,
        created_at,
        student:user_profiles!progress_reports_student_id_fkey(id, full_name)
      `)
      .eq('student_id', targetStudentId)
      .order('created_at', { ascending: false })

    if (reportsError) {
      logger.error('Failed to fetch progress reports', reportsError, { userId })
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/progress-reports', 200, duration, { userId, count: reports?.length || 0 })

    return NextResponse.json({
      success: true,
      reports: reports || []
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Progress reports error', error, {})
    logger.api('GET', '/api/progress-reports', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch progress reports" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/progress-reports
 * Generate a new progress report for a student
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { studentId, reportType = 'monthly', periodStart, periodEnd, title } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    if (!['monthly', 'quarterly', 'semester', 'annual', 'custom'].includes(reportType)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Verify access: user must be the student, their guardian, or their teacher
    const studentIdNum = parseInt(studentId)
    let hasAccess = studentIdNum === profile.id

    if (!hasAccess) {
      // Check guardian access
      const { data: guardianship } = await supabase
        .from('student_guardians')
        .select('id')
        .eq('parent_id', profile.id)
        .eq('student_id', studentIdNum)
        .eq('is_active', true)
        .single()

      if (guardianship) hasAccess = true
    }

    if (!hasAccess) {
      // Check teacher access (student enrolled in their class)
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('class:classes(teacher_id)')
        .eq('student_id', studentIdNum)
        .eq('status', 'active')

      if (enrollment?.some((e: any) => e.class?.teacher_id === profile.id)) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Not authorized to generate reports for this student" }, { status: 403 })
    }

    // Calculate period dates if not provided
    const now = new Date()
    let pStart: Date
    let pEnd: Date = now

    if (periodStart && periodEnd) {
      pStart = new Date(periodStart)
      pEnd = new Date(periodEnd)
    } else {
      // Calculate based on report type
      switch (reportType) {
        case 'monthly':
          pStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarterly':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3
          pStart = new Date(now.getFullYear(), quarterStart, 1)
          break
        case 'semester':
          pStart = now.getMonth() >= 6
            ? new Date(now.getFullYear(), 6, 1)
            : new Date(now.getFullYear(), 0, 1)
          break
        case 'annual':
          pStart = new Date(now.getFullYear(), 0, 1)
          break
        default:
          pStart = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }

    // Get student info
    const { data: student } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', studentIdNum)
      .single()

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Gather statistics for the report period
    const periodStartStr = pStart.toISOString()
    const periodEndStr = pEnd.toISOString()

    // Study sessions in period
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('start_time, duration_minutes, session_type, completed')
      .eq('user_id', studentIdNum)
      .eq('completed', true)
      .gte('start_time', periodStartStr)
      .lte('start_time', periodEndStr)

    const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
    const totalDays = new Set(
      sessions?.map(s => new Date(s.start_time).toISOString().split('T')[0])
    ).size

    // Calculate average daily minutes
    const daysDiff = Math.max(1, Math.ceil((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)))
    const averageDailyMinutes = Math.round(totalMinutes / daysDiff)

    // Time by mode
    const byMode: Record<string, number> = {}
    sessions?.forEach(s => {
      const type = s.session_type || 'other'
      byMode[type] = (byMode[type] || 0) + (s.duration_minutes || 0)
    })

    // Flashcard stats
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('times_reviewed, times_correct, last_reviewed_at, easiness_factor')
      .eq('user_id', studentIdNum)
      .gte('last_reviewed_at', periodStartStr)
      .lte('last_reviewed_at', periodEndStr)

    const totalReviewed = flashcards?.reduce((sum, f) => sum + (f.times_reviewed || 0), 0) || 0
    const totalCorrect = flashcards?.reduce((sum, f) => sum + (f.times_correct || 0), 0) || 0
    const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0

    // Count mastered vs learning
    const mastered = flashcards?.filter(f => (f.easiness_factor || 2.5) >= 2.5).length || 0
    const learning = (flashcards?.length || 0) - mastered

    // Assignment stats (if in classes)
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('status, score_percent, submitted_at, assignment:assignments(due_date)')
      .eq('student_id', studentIdNum)
      .gte('submitted_at', periodStartStr)
      .lte('submitted_at', periodEndStr)

    const completedAssignments = submissions?.filter(s =>
      s.status === 'submitted' || s.status === 'graded'
    ).length || 0

    const { count: totalAssignments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)

    const scoredSubmissions = submissions?.filter(s => s.score_percent !== null) || []
    const averageScore = scoredSubmissions.length > 0
      ? Math.round(scoredSubmissions.reduce((sum, s) => sum + (s.score_percent || 0), 0) / scoredSubmissions.length)
      : 0

    // Calculate on-time rate
    const onTime = submissions?.filter(s => {
      if (!s.submitted_at || !s.assignment?.due_date) return true
      return new Date(s.submitted_at) <= new Date(s.assignment.due_date)
    }).length || 0
    const onTimeRate = completedAssignments > 0 ? Math.round((onTime / completedAssignments) * 100) : 100

    // Build report data
    const reportData = {
      student: {
        name: student.full_name || 'Unknown Student',
        id: student.id.toString()
      },
      period: {
        start: pStart.toISOString(),
        end: pEnd.toISOString(),
        type: reportType
      },
      attendance: {
        totalDays: daysDiff,
        activeDays: totalDays,
        attendanceRate: Math.round((totalDays / daysDiff) * 100)
      },
      subjects: [], // Can be populated from curriculum units
      flashcards: {
        totalReviewed,
        accuracy,
        mastered,
        learning
      },
      studyTime: {
        totalMinutes,
        averageDailyMinutes,
        byMode
      },
      assignments: {
        completed: completedAssignments,
        total: totalAssignments || 0,
        averageScore,
        onTimeRate
      },
      streaks: {
        current: 0, // Would need separate streak calculation
        longest: 0
      },
      generatedAt: new Date().toISOString()
    }

    // Create report record
    const reportTitle = title || `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Progress Report - ${student.full_name}`

    const { data: report, error: createError } = await supabase
      .from('progress_reports')
      .insert({
        student_id: studentIdNum,
        title: reportTitle,
        report_type: reportType,
        period_start: pStart.toISOString().split('T')[0],
        period_end: pEnd.toISOString().split('T')[0],
        report_data: reportData,
        generated_by: profile.id,
        status: 'draft',
        shared_with_guardians: false
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create progress report', createError, { userId })
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/progress-reports', 201, duration, { userId, reportId: report.id })

    return NextResponse.json({
      success: true,
      report,
      reportData
    }, { status: 201 })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Create progress report error', error, {})
    logger.api('POST', '/api/progress-reports', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to create progress report" },
      { status: 500 }
    )
  }
}
