import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, checkPermission } from '@/lib/permissions'

/**
 * GET /api/schools
 * List schools in the user's organization
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!context.organization) {
      return NextResponse.json({ schools: [] })
    }

    const supabase = await createClient()

    const { data: schools, error } = await supabase
      .from('schools')
      .select(`
        id,
        name,
        slug,
        type,
        principal_name,
        principal_email,
        is_active,
        created_at
      `)
      .eq('organization_id', context.organization.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching schools:', error)
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
    }

    return NextResponse.json({
      schools: schools?.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        type: s.type,
        principalName: s.principal_name,
        principalEmail: s.principal_email,
        isActive: s.is_active,
        createdAt: s.created_at,
      })) || [],
    })
  } catch (error) {
    console.error('Error in GET /api/schools:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/schools
 * Create a new school (org_admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkPermission(userId, 'school:create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const context = await getUserContext(userId)
    if (!context?.organization) {
      return NextResponse.json({ error: 'Not in an organization' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Auto-generate slug from name if not provided
    let slug = body.slug
    if (!slug) {
      slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove duplicate hyphens
        .slice(0, 50) // Limit length
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if slug exists in this org
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('organization_id', context.organization.organizationId)
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A school with this slug already exists' },
        { status: 409 }
      )
    }

    const { data: school, error } = await supabase
      .from('schools')
      .insert({
        organization_id: context.organization.organizationId,
        name: body.name,
        slug: slug,
        type: body.type || 'other',
        principal_name: body.principalName,
        principal_email: body.principalEmail,
        address: body.address,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating school:', error)
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
    }

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        type: school.type,
      },
      message: 'School created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/schools:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
