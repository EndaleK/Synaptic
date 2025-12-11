import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/shared-resources/[id]
 * Get a single shared resource by ID
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

    // Get the resource with related data
    const { data: resource, error: resourceError } = await supabase
      .from('shared_resources')
      .select(`
        *,
        organization:organizations(id, name),
        document:documents(id, file_name, file_type, extracted_text),
        creator:user_profiles!shared_resources_created_by_fkey(id, full_name)
      `)
      .eq('id', id)
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
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const duration = Date.now() - startTime
    logger.api('GET', `/api/shared-resources/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      resource
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Shared resource fetch error', error, {})
    logger.api('GET', `/api/shared-resources/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch shared resource" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shared-resources/[id]
 * Update a shared resource (org admins only)
 */
export async function PATCH(
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

    // Get the resource to verify ownership
    const { data: resource, error: resourceError } = await supabase
      .from('shared_resources')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    // Verify user is org admin
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', resource.organization_id)
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || !['org_admin', 'school_admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Only organization administrators can update shared resources" }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.resource_type !== undefined) updateData.resource_type = body.resource_type
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.grade_levels !== undefined) updateData.grade_levels = body.grade_levels
    if (body.document_id !== undefined) updateData.document_id = body.document_id
    if (body.external_url !== undefined) updateData.external_url = body.external_url
    if (body.visibility !== undefined) updateData.visibility = body.visibility
    if (body.visible_to_schools !== undefined) updateData.visible_to_schools = body.visible_to_schools
    if (body.visible_to_classes !== undefined) updateData.visible_to_classes = body.visible_to_classes
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.curriculum_standards !== undefined) updateData.curriculum_standards = body.curriculum_standards
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Update the resource
    const { data: updatedResource, error: updateError } = await supabase
      .from('shared_resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update shared resource', updateError, { userId })
      return NextResponse.json({ error: "Failed to update resource" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('PATCH', `/api/shared-resources/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      resource: updatedResource
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Shared resource update error', error, {})
    logger.api('PATCH', `/api/shared-resources/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to update shared resource" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/shared-resources/[id]
 * Delete a shared resource (org admins only)
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

    // Get the resource to verify ownership
    const { data: resource, error: resourceError } = await supabase
      .from('shared_resources')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    // Verify user is org admin
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', resource.organization_id)
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || !['org_admin', 'school_admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Only organization administrators can delete shared resources" }, { status: 403 })
    }

    // Delete the resource
    const { error: deleteError } = await supabase
      .from('shared_resources')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Failed to delete shared resource', deleteError, { userId })
      return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('DELETE', `/api/shared-resources/${id}`, 200, duration, { userId })

    return NextResponse.json({
      success: true,
      message: "Resource deleted successfully"
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Shared resource delete error', error, {})
    logger.api('DELETE', `/api/shared-resources/${id}`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to delete shared resource" },
      { status: 500 }
    )
  }
}
