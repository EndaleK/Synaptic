import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, requirePermission } from '@/lib/permissions'

/**
 * GET /api/organizations/[orgId]
 * Get organization details
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

    // Check user is a member of this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get organization details
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        type,
        logo_url,
        primary_color,
        secondary_color,
        admin_email,
        billing_email,
        phone,
        address,
        subscription_tier,
        max_seats,
        current_seats,
        subscription_start,
        subscription_end,
        settings,
        ferpa_agreement_signed,
        data_retention_days,
        created_at,
        updated_at
      `)
      .eq('id', orgId)
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get schools count
    const { count: schoolsCount } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    // Get members count by role
    const { data: memberCounts } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('is_active', true)

    const roleCounts = memberCounts?.reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      organization: {
        ...organization,
        schoolsCount: schoolsCount || 0,
        memberCounts: roleCounts,
      },
      userRole: membership.role,
    })
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/organizations/[orgId]
 * Update organization details (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await params

    // Require org:edit permission
    try {
      await requirePermission(userId, 'org:edit')
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()

    // Fields that can be updated
    const allowedFields = [
      'name',
      'logo_url',
      'primary_color',
      'secondary_color',
      'admin_email',
      'billing_email',
      'phone',
      'address',
      'settings',
      'ferpa_agreement_signed',
      'data_retention_days',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[orgId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
