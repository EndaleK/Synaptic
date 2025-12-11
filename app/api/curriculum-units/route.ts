import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/curriculum-units
 * Get curriculum units for a class (with optional student progress)
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
    const classId = searchParams.get('classId')
    const studentId = searchParams.get('studentId') // Optional: get progress for specific student

    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 })
    }

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

    // Verify access to class (teacher, enrolled student, or parent of enrolled student)
    const { data: classData } = await supabase
      .from('classes')
      .select('id, teacher_id, name')
      .eq('id', classId)
      .single()

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const isTeacher = classData.teacher_id === profile.id

    // Check if enrolled student
    const { data: enrollment } = await supabase
      .from('class_enrollments')
      .select('id, student_id')
      .eq('class_id', classId)
      .eq('student_id', profile.id)
      .eq('status', 'active')
      .single()

    const isStudent = !!enrollment

    // Check if parent of enrolled student
    let isParent = false
    if (!isTeacher && !isStudent) {
      const { data: guardianEnrollment } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          guardians:student_guardians!inner(parent_id)
        `)
        .eq('class_id', classId)
        .eq('status', 'active')
        .eq('student_guardians.parent_id', profile.id)
        .eq('student_guardians.is_active', true)

      isParent = guardianEnrollment && guardianEnrollment.length > 0
    }

    if (!isTeacher && !isStudent && !isParent) {
      return NextResponse.json({ error: "Not authorized to view this class" }, { status: 403 })
    }

    // Get curriculum units
    const { data: units, error: unitsError } = await supabase
      .from('curriculum_units')
      .select('*')
      .eq('class_id', classId)
      .order('order_index', { ascending: true })

    if (unitsError) {
      logger.error('Failed to fetch curriculum units', unitsError, { userId })
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
    }

    // If studentId provided or user is student, fetch progress
    let progress: any[] = []
    const targetStudentId = studentId ? parseInt(studentId) : (isStudent ? profile.id : null)

    if (targetStudentId && units && units.length > 0) {
      const unitIds = units.map(u => u.id)

      const { data: studentProgress } = await supabase
        .from('student_unit_progress')
        .select('*')
        .eq('student_id', targetStudentId)
        .in('unit_id', unitIds)

      progress = studentProgress || []
    }

    // Merge progress with units
    const unitsWithProgress = units?.map(unit => {
      const unitProgress = progress.find(p => p.unit_id === unit.id)
      return {
        ...unit,
        progress: unitProgress || {
          status: 'not_started',
          mastery_percent: 0,
          time_spent_minutes: 0
        }
      }
    }) || []

    // Calculate overall progress
    const totalUnits = unitsWithProgress.length
    const completedUnits = unitsWithProgress.filter(u => u.progress.status === 'completed').length
    const overallProgress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0

    const duration = Date.now() - startTime
    logger.api('GET', '/api/curriculum-units', 200, duration, { userId, classId, count: units?.length || 0 })

    return NextResponse.json({
      success: true,
      className: classData.name,
      units: unitsWithProgress,
      summary: {
        totalUnits,
        completedUnits,
        overallProgress
      }
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Curriculum units error', error, {})
    logger.api('GET', '/api/curriculum-units', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch curriculum units" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/curriculum-units
 * Create a new curriculum unit (teachers only)
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
    const {
      classId,
      title,
      description,
      subject,
      standards,
      startDate,
      endDate,
      documentId,
      isRequired = true,
      estimatedHours
    } = body

    if (!classId || !title) {
      return NextResponse.json({ error: "Class ID and title are required" }, { status: 400 })
    }

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

    // Verify user is teacher of this class
    const { data: classData } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', classId)
      .single()

    if (!classData || classData.teacher_id !== profile.id) {
      return NextResponse.json({ error: "Only the class teacher can create curriculum units" }, { status: 403 })
    }

    // Get next order index
    const { data: existingUnits } = await supabase
      .from('curriculum_units')
      .select('order_index')
      .eq('class_id', classId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = (existingUnits?.[0]?.order_index ?? -1) + 1

    // Create unit
    const { data: unit, error: createError } = await supabase
      .from('curriculum_units')
      .insert({
        class_id: classId,
        title,
        description,
        subject,
        standards: standards || [],
        start_date: startDate,
        end_date: endDate,
        document_id: documentId,
        order_index: nextOrderIndex,
        is_required: isRequired,
        estimated_hours: estimatedHours,
        created_by: profile.id
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create curriculum unit', createError, { userId })
      return NextResponse.json({ error: "Failed to create unit" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/curriculum-units', 201, duration, { userId, unitId: unit.id })

    return NextResponse.json({
      success: true,
      unit
    }, { status: 201 })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Create curriculum unit error', error, {})
    logger.api('POST', '/api/curriculum-units', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to create curriculum unit" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/curriculum-units
 * Update student progress on a curriculum unit
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { unitId, status, masteryPercent, timeSpentMinutes } = body

    if (!unitId) {
      return NextResponse.json({ error: "Unit ID is required" }, { status: 400 })
    }

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

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('student_unit_progress')
      .select('id')
      .eq('unit_id', unitId)
      .eq('student_id', profile.id)
      .single()

    const updates: any = {
      last_activity_at: new Date().toISOString()
    }

    if (status) {
      updates.status = status
      if (status === 'in_progress' && !existing) {
        updates.started_at = new Date().toISOString()
      }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }

    if (masteryPercent !== undefined) {
      updates.mastery_percent = Math.min(100, Math.max(0, masteryPercent))
    }

    if (timeSpentMinutes !== undefined) {
      updates.time_spent_minutes = timeSpentMinutes
    }

    let progress
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('student_unit_progress')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update progress', error, { userId })
        return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
      }
      progress = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('student_unit_progress')
        .insert({
          unit_id: unitId,
          student_id: profile.id,
          status: status || 'not_started',
          mastery_percent: masteryPercent || 0,
          time_spent_minutes: timeSpentMinutes || 0,
          started_at: status === 'in_progress' ? new Date().toISOString() : null,
          last_activity_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create progress', error, { userId })
        return NextResponse.json({ error: "Failed to create progress" }, { status: 500 })
      }
      progress = data
    }

    const duration = Date.now() - startTime
    logger.api('PATCH', '/api/curriculum-units', 200, duration, { userId, unitId })

    return NextResponse.json({
      success: true,
      progress
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Update progress error', error, {})
    logger.api('PATCH', '/api/curriculum-units', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to update progress" },
      { status: 500 }
    )
  }
}
