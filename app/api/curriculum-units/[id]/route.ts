import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/curriculum-units/[id]
 * Get a specific curriculum unit
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get the unit
    const { data: unit, error: unitError } = await supabase
      .from('curriculum_units')
      .select('*, class:classes(id, name, teacher_id)')
      .eq('id', id)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: "Curriculum unit not found" }, { status: 404 })
    }

    const duration = Date.now() - startTime
    logger.api('GET', `/api/curriculum-units/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      unit
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Get curriculum unit error', error, {})
    logger.api('GET', `/api/curriculum-units/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch curriculum unit" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/curriculum-units/[id]
 * Update a curriculum unit (teachers only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      subject,
      standards,
      startDate,
      endDate,
      isRequired,
      estimatedHours,
    } = body

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

    // Get the unit and verify ownership
    const { data: unit, error: unitError } = await supabase
      .from('curriculum_units')
      .select('*, class:classes(teacher_id)')
      .eq('id', id)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: "Curriculum unit not found" }, { status: 404 })
    }

    // Check if user is the teacher
    if ((unit.class as any)?.teacher_id !== profile.id) {
      return NextResponse.json({ error: "Only the class teacher can update curriculum units" }, { status: 403 })
    }

    // Update the unit
    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (subject !== undefined) updates.subject = subject
    if (standards !== undefined) updates.standards = standards
    if (startDate !== undefined) updates.start_date = startDate
    if (endDate !== undefined) updates.end_date = endDate
    if (isRequired !== undefined) updates.is_required = isRequired
    if (estimatedHours !== undefined) updates.estimated_hours = estimatedHours

    const { data: updatedUnit, error: updateError } = await supabase
      .from('curriculum_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update curriculum unit', updateError, { userId })
      return NextResponse.json({ error: "Failed to update unit" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('PUT', `/api/curriculum-units/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      unit: updatedUnit
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Update curriculum unit error', error, {})
    logger.api('PUT', `/api/curriculum-units/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to update curriculum unit" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/curriculum-units/[id]
 * Delete a curriculum unit (teachers only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get the unit and verify ownership
    const { data: unit, error: unitError } = await supabase
      .from('curriculum_units')
      .select('*, class:classes(teacher_id)')
      .eq('id', id)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: "Curriculum unit not found" }, { status: 404 })
    }

    // Check if user is the teacher
    if ((unit.class as any)?.teacher_id !== profile.id) {
      return NextResponse.json({ error: "Only the class teacher can delete curriculum units" }, { status: 403 })
    }

    // Delete student progress first (cascade might not be enabled)
    await supabase
      .from('student_unit_progress')
      .delete()
      .eq('unit_id', id)

    // Delete the unit
    const { error: deleteError } = await supabase
      .from('curriculum_units')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Failed to delete curriculum unit', deleteError, { userId })
      return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('DELETE', `/api/curriculum-units/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      message: "Curriculum unit deleted"
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Delete curriculum unit error', error, {})
    logger.api('DELETE', `/api/curriculum-units/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to delete curriculum unit" },
      { status: 500 }
    )
  }
}
