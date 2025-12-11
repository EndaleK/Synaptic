import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

interface ComplianceItem {
  id: string
  category: string
  label: string
  description: string
  required: boolean
  completed: boolean
  value?: number | string | null
  target?: number | string | null
  status: 'complete' | 'partial' | 'incomplete' | 'not_applicable'
  details?: string
}

interface ComplianceResult {
  jurisdiction: {
    code: string
    name: string
    country: string
    regulationLevel: string
  }
  items: ComplianceItem[]
  overallScore: number // 0-100
  confidenceScore: number // 0-100
  summary: {
    complete: number
    partial: number
    incomplete: number
    total: number
  }
}

/**
 * GET /api/compliance/check
 * Check compliance status for the current user based on their jurisdiction
 * Query params:
 *   - studentId: Optional - check for a specific student (for parents/teachers)
 *   - period: Optional - 'current_year', 'all_time' (default: current_year)
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
    const studentIdParam = searchParams.get('studentId')
    const period = searchParams.get('period') || 'current_year'

    const supabase = await createClient()

    // Get user profile with jurisdiction
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, jurisdiction_code, jurisdiction_country')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Determine target user (self or student if guardian/teacher)
    let targetProfileId: string = profile.id
    if (studentIdParam) {
      // studentIdParam is a UUID string
      const studentId = studentIdParam
      // Verify access to this student
      const { data: guardianship } = await supabase
        .from('student_guardians')
        .select('id')
        .eq('parent_id', profile.id)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .single()

      if (!guardianship) {
        // Also check if teacher has access
        const { data: teacherAccess } = await supabase
          .from('class_enrollments')
          .select(`
            id,
            class:classes!inner(teacher_id)
          `)
          .eq('student_id', studentId)
          .limit(1)
          .single()

        const hasTeacherAccess = teacherAccess &&
          (teacherAccess.class as any)?.teacher_id === profile.id

        if (!hasTeacherAccess) {
          return NextResponse.json({ error: "Not authorized to view this student" }, { status: 403 })
        }
      }
      targetProfileId = studentId
    }

    // Get jurisdiction requirements
    const jurisdictionCode = profile.jurisdiction_code || 'AB'
    const jurisdictionCountry = profile.jurisdiction_country || 'CA'

    const { data: jurisdictionData, error: jurisdictionError } = await supabase
      .from('state_compliance_templates')
      .select('*')
      .eq('state_code', jurisdictionCode)
      .eq('country', jurisdictionCountry)
      .single()

    if (jurisdictionError || !jurisdictionData) {
      return NextResponse.json({ error: "Jurisdiction not found" }, { status: 404 })
    }

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate = now

    if (period === 'current_year') {
      // School year starts September 1
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      if (currentMonth >= 8) { // September or later
        startDate = new Date(currentYear, 8, 1) // September 1 this year
      } else {
        startDate = new Date(currentYear - 1, 8, 1) // September 1 last year
      }
    } else {
      startDate = new Date(0) // All time
    }

    // Gather study statistics
    const { data: studyStats } = await supabase
      .from('study_sessions')
      .select('duration_minutes, created_at')
      .eq('user_id', targetProfileId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const totalStudyMinutes = studyStats?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
    const totalStudyHours = Math.round(totalStudyMinutes / 60)
    const studyDays = new Set(studyStats?.map(s => s.created_at.split('T')[0])).size

    // Get flashcard performance
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, repetitions, easiness_factor')
      .eq('user_id', targetProfileId)

    const flashcardCount = flashcards?.length || 0
    const masteredCards = flashcards?.filter(f =>
      f.repetitions >= 3 && f.easiness_factor >= 2.0
    ).length || 0

    // Get documents/subjects covered
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, metadata')
      .eq('user_id', targetProfileId)
      .gte('created_at', startDate.toISOString())

    const documentCount = documents?.length || 0

    // Get curriculum units progress (if enrolled in classes)
    const { data: unitProgress } = await supabase
      .from('student_unit_progress')
      .select('*, unit:curriculum_units(title, subject)')
      .eq('student_id', targetProfileId)

    // Build compliance items based on jurisdiction requirements
    const requirements = jurisdictionData.requirements || {}
    const items: ComplianceItem[] = []

    // 1. Registration/Notification
    if (requirements.notification?.required) {
      const deadline = requirements.notification.deadline || 'September 30'
      items.push({
        id: 'registration',
        category: 'Administrative',
        label: 'Registration with School Board',
        description: `Register with supervising school board by ${deadline}`,
        required: true,
        completed: false, // Would need a separate flag in user_profiles to track this
        status: 'incomplete',
        details: `Deadline: ${deadline}`
      })
    }

    // 2. Education Plan
    if (requirements.curriculum?.education_plan_required) {
      items.push({
        id: 'education_plan',
        category: 'Administrative',
        label: 'Written Education Plan',
        description: 'Submit written outline of activities, resources, and evaluation methods',
        required: true,
        completed: documentCount > 0, // Simplistic check - could be more sophisticated
        status: documentCount > 0 ? 'complete' : 'incomplete',
        details: documentCount > 0
          ? `${documentCount} curriculum documents uploaded`
          : 'No curriculum documents uploaded yet'
      })
    }

    // 3. Core Subjects
    if (requirements.curriculum?.subjects_required) {
      const requiredSubjects = requirements.curriculum.subjects_required as string[]
      // In a real implementation, we'd check documents/units against subject categories
      items.push({
        id: 'core_subjects',
        category: 'Curriculum',
        label: 'Core Subjects Coverage',
        description: `Cover required subjects: ${requiredSubjects.join(', ')}`,
        required: true,
        completed: documentCount >= requiredSubjects.length,
        value: documentCount,
        target: requiredSubjects.length,
        status: documentCount >= requiredSubjects.length ? 'complete' :
                documentCount > 0 ? 'partial' : 'incomplete',
        details: `${documentCount} subjects covered of ${requiredSubjects.length} required`
      })
    }

    // 4. Attendance/Hours (Alberta requires 2 assessments, not specific hours, but tracking helps)
    if (requirements.assessment?.required) {
      const assessmentsPerYear = requirements.assessment.assessments_per_year || 2
      // Calculate how many "assessment periods" have passed
      const monthsInSchoolYear = Math.min(
        12,
        (now.getMonth() >= 8 ? now.getMonth() - 8 : now.getMonth() + 4)
      )
      const expectedAssessments = Math.floor((monthsInSchoolYear / 12) * assessmentsPerYear)

      items.push({
        id: 'assessments',
        category: 'Assessment',
        label: 'Progress Assessments',
        description: `Complete ${assessmentsPerYear} assessments per year by supervising teacher`,
        required: true,
        completed: false, // Would need assessment tracking
        value: 0,
        target: assessmentsPerYear,
        status: 'incomplete',
        details: `${assessmentsPerYear} assessments required per year`
      })
    }

    // 5. Study Time (bonus tracking, not required by Alberta but helpful for parents)
    items.push({
      id: 'study_time',
      category: 'Progress',
      label: 'Study Hours Logged',
      description: 'Track study time for documentation',
      required: false,
      completed: totalStudyHours >= 100,
      value: totalStudyHours,
      target: 900, // Common benchmark (900 hours/year for some US states)
      status: totalStudyHours >= 200 ? 'complete' :
              totalStudyHours >= 100 ? 'partial' : 'incomplete',
      details: `${totalStudyHours} hours logged this school year`
    })

    // 6. Study Days
    items.push({
      id: 'study_days',
      category: 'Progress',
      label: 'Active Study Days',
      description: 'Track days with study activity',
      required: false,
      completed: studyDays >= 50,
      value: studyDays,
      target: 172, // Alberta school year requirement
      status: studyDays >= 100 ? 'complete' :
              studyDays >= 50 ? 'partial' : 'incomplete',
      details: `${studyDays} active study days recorded`
    })

    // 7. Flashcard Mastery
    items.push({
      id: 'flashcard_mastery',
      category: 'Progress',
      label: 'Flashcard Mastery',
      description: 'Cards learned through spaced repetition',
      required: false,
      completed: masteredCards >= 100,
      value: masteredCards,
      target: flashcardCount,
      status: flashcardCount === 0 ? 'not_applicable' :
              masteredCards / flashcardCount >= 0.8 ? 'complete' :
              masteredCards / flashcardCount >= 0.5 ? 'partial' : 'incomplete',
      details: `${masteredCards} of ${flashcardCount} cards mastered`
    })

    // Calculate scores
    const requiredItems = items.filter(i => i.required)
    const completedRequired = requiredItems.filter(i => i.status === 'complete').length
    const partialRequired = requiredItems.filter(i => i.status === 'partial').length

    const overallScore = requiredItems.length > 0
      ? Math.round(((completedRequired + partialRequired * 0.5) / requiredItems.length) * 100)
      : 100

    // Confidence score based on progress metrics
    const progressItems = items.filter(i => !i.required)
    const progressScore = progressItems.length > 0
      ? progressItems.reduce((sum, item) => {
          if (item.status === 'complete') return sum + 100
          if (item.status === 'partial') return sum + 50
          return sum
        }, 0) / progressItems.length
      : 0

    const confidenceScore = Math.round((overallScore * 0.6) + (progressScore * 0.4))

    const result: ComplianceResult = {
      jurisdiction: {
        code: jurisdictionCode,
        name: jurisdictionData.jurisdiction_name,
        country: jurisdictionCountry,
        regulationLevel: jurisdictionData.regulation_level
      },
      items,
      overallScore,
      confidenceScore,
      summary: {
        complete: items.filter(i => i.status === 'complete').length,
        partial: items.filter(i => i.status === 'partial').length,
        incomplete: items.filter(i => i.status === 'incomplete').length,
        total: items.length
      }
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/compliance/check', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      compliance: result
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Compliance check error', error, {})
    logger.api('GET', '/api/compliance/check', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to check compliance" },
      { status: 500 }
    )
  }
}
