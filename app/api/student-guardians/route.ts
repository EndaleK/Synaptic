import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/student-guardians
 * Get all guardian relationships for the current user
 * - If user is a parent: returns students they can monitor
 * - If user is a student: returns guardians who can view their progress
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile', profileError, { userId })
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role') // 'parent' or 'student'

    let guardianships: any[] = []

    if (role === 'student') {
      // Get guardians who can view this student
      const { data, error } = await supabase
        .from('student_guardians')
        .select(`
          id,
          relationship,
          permission_level,
          verified_at,
          is_active,
          created_at,
          parent:user_profiles!student_guardians_parent_id_fkey(id, full_name, email)
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch student guardians', error, { userId })
        return NextResponse.json({ error: "Failed to fetch guardians" }, { status: 500 })
      }
      guardianships = data || []
    } else {
      // Default: get students this user can monitor as parent
      const { data, error } = await supabase
        .from('student_guardians')
        .select(`
          id,
          relationship,
          permission_level,
          verified_at,
          is_active,
          created_at,
          student:user_profiles!student_guardians_student_id_fkey(id, full_name, email)
        `)
        .eq('parent_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch linked students', error, { userId })
        return NextResponse.json({ error: "Failed to fetch linked students" }, { status: 500 })
      }
      guardianships = data || []
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/student-guardians', 200, duration, { userId, count: guardianships.length })

    return NextResponse.json({
      success: true,
      guardianships,
      userRole: role || 'parent'
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Student guardians error', error, {})
    logger.api('GET', '/api/student-guardians', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch guardian relationships" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/student-guardians
 * Create a new guardian relationship (link parent to student)
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
    const { studentEmail, relationship, permissionLevel = 'view_only' } = body

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email is required" }, { status: 400 })
    }

    if (!relationship || !['mother', 'father', 'guardian', 'grandparent', 'other'].includes(relationship)) {
      return NextResponse.json({ error: "Valid relationship type is required" }, { status: 400 })
    }

    if (!['view_only', 'view_grades', 'full_access'].includes(permissionLevel)) {
      return NextResponse.json({ error: "Invalid permission level" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get parent's profile
    const { data: parentProfile, error: parentError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (parentError || !parentProfile) {
      return NextResponse.json({ error: "Parent profile not found" }, { status: 404 })
    }

    // Find student by email
    const { data: studentProfile, error: studentError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('email', studentEmail.toLowerCase())
      .single()

    if (studentError || !studentProfile) {
      return NextResponse.json({ error: "Student not found with that email" }, { status: 404 })
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('student_guardians')
      .select('id')
      .eq('student_id', studentProfile.id)
      .eq('parent_id', parentProfile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Guardian relationship already exists" }, { status: 409 })
    }

    // Create the guardian relationship (pending verification)
    const { data: guardianship, error: createError } = await supabase
      .from('student_guardians')
      .insert({
        student_id: studentProfile.id,
        parent_id: parentProfile.id,
        relationship,
        permission_level: permissionLevel,
        requested_by: parentProfile.id,
        is_active: true // Can be set to false until student/admin verifies
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create guardian relationship', createError, { userId })
      return NextResponse.json({ error: "Failed to create guardian relationship" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/student-guardians', 201, duration, { userId, studentId: studentProfile.id })

    return NextResponse.json({
      success: true,
      guardianship,
      message: `Successfully linked to ${studentProfile.full_name || 'student'}`
    }, { status: 201 })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Create guardian relationship error', error, {})
    logger.api('POST', '/api/student-guardians', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to create guardian relationship" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/student-guardians
 * Remove a guardian relationship
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const guardianshipId = searchParams.get('id')

    if (!guardianshipId) {
      return NextResponse.json({ error: "Guardianship ID is required" }, { status: 400 })
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

    // Verify user owns this relationship (either as parent or student)
    const { data: guardianship, error: fetchError } = await supabase
      .from('student_guardians')
      .select('id, parent_id, student_id')
      .eq('id', guardianshipId)
      .single()

    if (fetchError || !guardianship) {
      return NextResponse.json({ error: "Guardian relationship not found" }, { status: 404 })
    }

    // Check permission: user must be either the parent or the student
    if (guardianship.parent_id !== profile.id && guardianship.student_id !== profile.id) {
      return NextResponse.json({ error: "Not authorized to modify this relationship" }, { status: 403 })
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('student_guardians')
      .update({ is_active: false })
      .eq('id', guardianshipId)

    if (deleteError) {
      logger.error('Failed to delete guardian relationship', deleteError, { userId })
      return NextResponse.json({ error: "Failed to delete relationship" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('DELETE', '/api/student-guardians', 200, duration, { userId, guardianshipId })

    return NextResponse.json({
      success: true,
      message: "Guardian relationship removed"
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Delete guardian relationship error', error, {})
    logger.api('DELETE', '/api/student-guardians', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to delete guardian relationship" },
      { status: 500 }
    )
  }
}
