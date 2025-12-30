import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'
import type { SchoolType } from '@/lib/types/institutional'

/**
 * GET /api/organizations/[orgId]/schools
 * List all schools in an organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await params
    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, school_id')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query - school admins only see their school
    let query = supabase
      .from('schools')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name')

    if (membership.role === 'school_admin' && membership.school_id) {
      query = query.eq('id', membership.school_id)
    }

    const { data: schools, error } = await query

    if (error) {
      console.error('Error fetching schools:', error)
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
    }

    return NextResponse.json({ schools: schools || [] })
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]/schools:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/organizations/[orgId]/schools
 * Create a new school in the organization
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await params
    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, type, principalName, principalEmail } = body as {
      name: string
      type?: SchoolType
      principalName?: string
      principalEmail?: string
    }

    if (!name) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has org_admin access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Only org admins can create schools' }, { status: 403 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)

    // Check for duplicate slug within organization
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', slug)
      .single()

    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

    // Create the school
    const { data: school, error: createError } = await supabase
      .from('schools')
      .insert({
        organization_id: orgId,
        name,
        slug: finalSlug,
        type: type || 'other',
        principal_name: principalName || null,
        principal_email: principalEmail || null,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating school:', createError)
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
    console.error('Error in POST /api/organizations/[orgId]/schools:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
