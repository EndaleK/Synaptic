import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * POST /api/resource-usage
 * Track when a user accesses or uses a shared resource
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
    const { resourceId, action, studentId, metadata = {} } = body

    if (!resourceId || !action) {
      return NextResponse.json(
        { error: "resourceId and action are required" },
        { status: 400 }
      )
    }

    // Validate action type
    const validActions = [
      'viewed',
      'downloaded',
      'generated_flashcards',
      'generated_podcast',
      'generated_mindmap',
      'completed'
    ]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
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

    // Verify the resource exists and user has access
    const { data: resource, error: resourceError } = await supabase
      .from('shared_resources')
      .select('id, organization_id')
      .eq('id', resourceId)
      .eq('is_active', true)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    // Verify user has access to this resource's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', resource.organization_id)
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      // Also check class enrollments
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('id, class:classes(organization_id)')
        .eq('student_id', profile.id)
        .eq('status', 'active')

      const hasAccess = enrollment?.some(e => {
        const classData = e.class as any
        return classData?.organization_id === resource.organization_id
      })

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this resource" }, { status: 403 })
      }
    }

    // Create usage record
    const { data: usage, error: usageError } = await supabase
      .from('resource_usage')
      .insert({
        resource_id: resourceId,
        user_id: profile.id,
        student_id: studentId || null,
        action,
        metadata
      })
      .select()
      .single()

    if (usageError) {
      logger.error('Failed to create resource usage record', usageError, { userId })
      return NextResponse.json({ error: "Failed to track usage" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/resource-usage', 201, duration, { userId, resourceId, action })

    return NextResponse.json({
      success: true,
      usage
    }, { status: 201 })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Resource usage tracking error', error, {})
    logger.api('POST', '/api/resource-usage', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to track resource usage" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/resource-usage
 * Get usage history for the current user
 * Query params:
 *   - resourceId: Filter by resource
 *   - studentId: Filter by student (for parents)
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
    const resourceId = searchParams.get('resourceId')
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

    // Build query
    let query = supabase
      .from('resource_usage')
      .select(`
        *,
        resource:shared_resources(id, title, resource_type, organization:organizations(name))
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (resourceId) {
      query = query.eq('resource_id', resourceId)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: usage, error: usageError } = await query.limit(100)

    if (usageError) {
      logger.error('Failed to fetch resource usage', usageError, { userId })
      return NextResponse.json({ error: "Failed to fetch usage history" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/resource-usage', 200, duration, { userId, count: usage?.length || 0 })

    return NextResponse.json({
      success: true,
      usage: usage || []
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Resource usage fetch error', error, {})
    logger.api('GET', '/api/resource-usage', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch resource usage" },
      { status: 500 }
    )
  }
}
