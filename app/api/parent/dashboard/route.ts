import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

interface StudentSummary {
  id: number
  name: string
  email: string
  relationship: string
  permissionLevel: string
  // Study statistics
  currentStreak: number
  longestStreak: number
  totalStudyMinutes: number
  weeklyStudyMinutes: number
  // Flashcard stats
  totalFlashcards: number
  flashcardsReviewedWeek: number
  averageAccuracy: number
  // Assignment stats (if in classes)
  assignmentsCompleted: number
  assignmentsPending: number
  averageScore: number | null
  // Activity
  lastActiveAt: string | null
  recentActivity: Array<{
    type: string
    description: string
    timestamp: string
  }>
}

/**
 * GET /api/parent/dashboard
 * Aggregated view of all linked students' progress for parent monitoring
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get parent's profile
    const { data: parentProfile, error: parentError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('clerk_user_id', userId)
      .single()

    if (parentError || !parentProfile) {
      logger.error('Failed to fetch parent profile', parentError, { userId })
      return NextResponse.json({ error: "Parent profile not found" }, { status: 404 })
    }

    // Get all linked students
    const { data: guardianships, error: guardianError } = await supabase
      .from('student_guardians')
      .select(`
        id,
        relationship,
        permission_level,
        student:user_profiles!student_guardians_student_id_fkey(id, full_name, email)
      `)
      .eq('parent_id', parentProfile.id)
      .eq('is_active', true)

    if (guardianError) {
      logger.error('Failed to fetch linked students', guardianError, { userId })
      return NextResponse.json({ error: "Failed to fetch linked students" }, { status: 500 })
    }

    if (!guardianships || guardianships.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
        message: "No linked students found. Add students to monitor their progress."
      })
    }

    // Aggregate data for each student
    const students: StudentSummary[] = []

    for (const guardianship of guardianships) {
      const student = guardianship.student as { id: number; full_name: string; email: string }
      if (!student) continue

      const studentId = student.id

      // Calculate date ranges
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - 7)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Get study sessions
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('start_time, duration_minutes, completed')
        .eq('user_id', studentId)
        .eq('completed', true)
        .order('start_time', { ascending: false })

      const totalStudyMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
      const weeklyStudyMinutes = sessions
        ?.filter(s => new Date(s.start_time) >= weekStart)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0

      // Calculate streak
      const sessionDates = new Set<string>()
      sessions?.forEach(session => {
        const dateStr = new Date(session.start_time).toISOString().split('T')[0]
        sessionDates.add(dateStr)
      })

      const sortedDates = Array.from(sessionDates).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
      )

      let currentStreak = 0
      const todayStr = now.toISOString().split('T')[0]
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        const checkDate = new Date(now)
        if (sortedDates[0] === yesterdayStr) {
          checkDate.setDate(checkDate.getDate() - 1)
        }

        for (let i = 0; i < sortedDates.length; i++) {
          const expectedDateStr = checkDate.toISOString().split('T')[0]
          if (sessionDates.has(expectedDateStr)) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      // Calculate longest streak
      let longestStreak = 0
      let tempStreak = 0
      let lastDate: Date | null = null

      sortedDates.slice().reverse().forEach(dateStr => {
        const date = new Date(dateStr)
        if (lastDate) {
          const dayDiff = Math.floor((date.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
          if (dayDiff === 1) {
            tempStreak++
          } else {
            longestStreak = Math.max(longestStreak, tempStreak)
            tempStreak = 1
          }
        } else {
          tempStreak = 1
        }
        lastDate = date
      })
      longestStreak = Math.max(longestStreak, tempStreak)

      // Get flashcard statistics
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('times_reviewed, times_correct, last_reviewed_at')
        .eq('user_id', studentId)

      const totalFlashcards = flashcards?.length || 0
      const totalReviews = flashcards?.reduce((sum, f) => sum + (f.times_reviewed || 0), 0) || 0
      const totalCorrect = flashcards?.reduce((sum, f) => sum + (f.times_correct || 0), 0) || 0
      const averageAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0

      const flashcardsReviewedWeek = flashcards?.filter(f =>
        f.last_reviewed_at && new Date(f.last_reviewed_at) >= weekStart
      ).length || 0

      // Get assignment statistics (if student is enrolled in classes)
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('status', 'active')

      let assignmentsCompleted = 0
      let assignmentsPending = 0
      let totalScore = 0
      let scoredAssignments = 0

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id)

        // Get submissions for this student
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('status, score_percent, assignment:assignments(class_id)')
          .eq('student_id', studentId)

        submissions?.forEach(sub => {
          if (sub.status === 'submitted' || sub.status === 'graded') {
            assignmentsCompleted++
            if (sub.score_percent !== null) {
              totalScore += sub.score_percent
              scoredAssignments++
            }
          } else if (sub.status === 'in_progress' || sub.status === 'not_started') {
            assignmentsPending++
          }
        })

        // Count pending assignments not yet started
        const { count: totalAssignments } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('is_published', true)

        const unstarted = (totalAssignments || 0) - (assignmentsCompleted + assignmentsPending)
        if (unstarted > 0) {
          assignmentsPending += unstarted
        }
      }

      const averageScore = scoredAssignments > 0 ? Math.round(totalScore / scoredAssignments) : null

      // Get recent activity
      const recentActivity: Array<{ type: string; description: string; timestamp: string }> = []

      // Recent study sessions
      if (sessions && sessions.length > 0) {
        const recentSessions = sessions.slice(0, 3)
        recentSessions.forEach(session => {
          recentActivity.push({
            type: 'study_session',
            description: `Studied for ${session.duration_minutes} minutes`,
            timestamp: session.start_time
          })
        })
      }

      // Sort by timestamp
      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Determine last active
      const lastActiveAt = sessions && sessions.length > 0 ? sessions[0].start_time : null

      students.push({
        id: studentId,
        name: student.full_name || 'Unknown Student',
        email: student.email || '',
        relationship: guardianship.relationship,
        permissionLevel: guardianship.permission_level,
        currentStreak,
        longestStreak,
        totalStudyMinutes,
        weeklyStudyMinutes,
        totalFlashcards,
        flashcardsReviewedWeek,
        averageAccuracy,
        assignmentsCompleted,
        assignmentsPending,
        averageScore,
        lastActiveAt,
        recentActivity: recentActivity.slice(0, 5)
      })
    }

    // Calculate aggregate stats
    const aggregateStats = {
      totalStudents: students.length,
      totalStudyMinutesAllStudents: students.reduce((sum, s) => sum + s.totalStudyMinutes, 0),
      totalFlashcardsAllStudents: students.reduce((sum, s) => sum + s.totalFlashcards, 0),
      averageStreakAllStudents: students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.currentStreak, 0) / students.length)
        : 0,
      studentsActiveToday: students.filter(s =>
        s.lastActiveAt && new Date(s.lastActiveAt).toDateString() === new Date().toDateString()
      ).length
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/parent/dashboard', 200, duration, {
      userId,
      studentCount: students.length
    })

    return NextResponse.json({
      success: true,
      students,
      aggregateStats,
      parentName: parentProfile.full_name
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Parent dashboard error', error, {})
    logger.api('GET', '/api/parent/dashboard', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch parent dashboard" },
      { status: 500 }
    )
  }
}
