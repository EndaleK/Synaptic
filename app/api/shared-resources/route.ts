import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

interface SharedResource {
  id: string
  organization_id: string
  title: string
  description: string | null
  resource_type: string
  subject: string | null
  grade_levels: number[]
  document_id: string | null
  external_url: string | null
  visibility: string
  visible_to_schools: string[]
  visible_to_classes: string[]
  tags: string[]
  curriculum_standards: Record<string, string[]>
  estimated_hours: number | null
  is_active: boolean
  created_by: number // BIGINT in database
  created_at: string
  updated_at: string
}

/**
 * GET /api/shared-resources
 * Get shared resources accessible to the user
 * Query params:
 *   - organizationId: Filter by organization
 *   - subject: Filter by subject
 *   - gradeLevel: Filter by grade level
 *   - search: Search by title/description
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
    const organizationId = searchParams.get('organizationId')
    const subject = searchParams.get('subject')
    const gradeLevel = searchParams.get('gradeLevel')
    const search = searchParams.get('search')

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

    // Get user's organization memberships and class enrollments
    const { data: orgMemberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', profile.id)
      .eq('is_active', true)

    const { data: classEnrollments } = await supabase
      .from('class_enrollments')
      .select('class_id, class:classes(organization_id)')
      .eq('student_id', profile.id)
      .eq('status', 'active')

    // Collect all accessible org IDs
    const orgIds = new Set<string>()
    orgMemberships?.forEach(m => orgIds.add(m.organization_id))
    classEnrollments?.forEach(e => {
      const classData = e.class as any
      if (classData?.organization_id) {
        orgIds.add(classData.organization_id)
      }
    })

    if (orgIds.size === 0) {
      return NextResponse.json({
        success: true,
        resources: [],
        message: "No organization memberships found"
      })
    }

    // Build query for shared resources
    let query = supabase
      .from('shared_resources')
      .select(`
        *,
        organization:organizations(id, name),
        document:documents(id, file_name, file_type),
        creator:user_profiles!shared_resources_created_by_fkey(id, full_name)
      `)
      .in('organization_id', Array.from(orgIds))
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (subject) {
      query = query.ilike('subject', `%${subject}%`)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: resources, error: resourcesError } = await query

    if (resourcesError) {
      logger.error('Failed to fetch shared resources', resourcesError, { userId })
      return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 })
    }

    // Filter by grade level if specified (array contains check)
    let filteredResources = resources || []
    if (gradeLevel) {
      const grade = parseInt(gradeLevel)
      filteredResources = filteredResources.filter(r =>
        r.grade_levels && r.grade_levels.includes(grade)
      )
    }

    // Filter by visibility
    // For now, allow all members to see 'all_members' visibility
    // More complex visibility checks can be added later
    filteredResources = filteredResources.filter(r =>
      r.visibility === 'all_members' ||
      (r.visibility === 'specific_classes' && classEnrollments?.some(e => r.visible_to_classes?.includes(e.class_id)))
    )

    // Get usage stats for each resource
    const resourceIds = filteredResources.map(r => r.id)
    const { data: usageStats } = resourceIds.length > 0 ? await supabase
      .from('resource_usage')
      .select('resource_id, action')
      .in('resource_id', resourceIds)
      .eq('user_id', profile.id) : { data: [] }

    // Attach usage info to resources
    const resourcesWithUsage = filteredResources.map(r => ({
      ...r,
      userUsage: usageStats?.filter(u => u.resource_id === r.id) || []
    }))

    const duration = Date.now() - startTime
    logger.api('GET', '/api/shared-resources', 200, duration, { userId, count: resourcesWithUsage.length })

    return NextResponse.json({
      success: true,
      resources: resourcesWithUsage
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Shared resources fetch error', error, {})
    logger.api('GET', '/api/shared-resources', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch shared resources" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shared-resources
 * Create a new shared resource (org admins only)
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
      organizationId,
      title,
      description,
      resourceType = 'document',
      subject,
      gradeLevels = [],
      documentId,
      externalUrl,
      visibility = 'all_members',
      visibleToSchools = [],
      visibleToClasses = [],
      tags = [],
      curriculumStandards = {},
      estimatedHours
    } = body

    if (!organizationId || !title) {
      return NextResponse.json({ error: "organizationId and title are required" }, { status: 400 })
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

    // Verify user is org admin
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', organizationId)
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || !['org_admin', 'school_admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Only organization administrators can create shared resources" }, { status: 403 })
    }

    // Create the resource
    const { data: resource, error: createError } = await supabase
      .from('shared_resources')
      .insert({
        organization_id: organizationId,
        title,
        description,
        resource_type: resourceType,
        subject,
        grade_levels: gradeLevels,
        document_id: documentId,
        external_url: externalUrl,
        visibility,
        visible_to_schools: visibleToSchools,
        visible_to_classes: visibleToClasses,
        tags,
        curriculum_standards: curriculumStandards,
        estimated_hours: estimatedHours,
        created_by: profile.id
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create shared resource', createError, { userId })
      return NextResponse.json({ error: "Failed to create resource" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/shared-resources', 201, duration, { userId, resourceId: resource.id })

    return NextResponse.json({
      success: true,
      resource
    }, { status: 201 })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Shared resource creation error', error, {})
    logger.api('POST', '/api/shared-resources', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to create shared resource" },
      { status: 500 }
    )
  }
}
