import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext, checkPermission } from '@/lib/permissions'

/**
 * GET /api/organizations/[orgId]/members
 * List all members in an organization
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
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only org_admin and school_admin can view all members
    if (!['org_admin', 'school_admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all members with their user profile info
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        school_id,
        is_active,
        accepted_at,
        created_at,
        schools (
          id,
          name
        ),
        user_profiles!organization_members_user_id_fkey (
          email,
          full_name
        )
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Fetch pending invites
    const { data: invites, error: invitesError } = await supabase
      .from('organization_invites')
      .select('id, email, role, school_id, expires_at, created_at')
      .eq('organization_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Error fetching invites:', invitesError)
    }

    // Transform members data
    const transformedMembers = members?.map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: (m.user_profiles as any)?.email || 'Unknown',
      fullName: (m.user_profiles as any)?.full_name || null,
      role: m.role,
      schoolId: m.school_id,
      schoolName: (m.schools as any)?.name || null,
      isActive: m.is_active,
      acceptedAt: m.accepted_at,
      createdAt: m.created_at,
    })) || []

    return NextResponse.json({
      members: transformedMembers,
      pendingInvites: invites || [],
    })
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
