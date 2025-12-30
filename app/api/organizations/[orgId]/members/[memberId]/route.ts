import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'
import type { OrganizationRole } from '@/lib/types/institutional'

/**
 * PATCH /api/organizations/[orgId]/members/[memberId]
 * Update a member's role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberId } = await params
    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { role } = body as { role: OrganizationRole }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has admin access to this organization
    const { data: adminMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!adminMembership || adminMembership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Only org admins can change roles' }, { status: 403 })
    }

    // Prevent changing your own role
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', memberId)
      .single()

    if (targetMember?.user_id === context.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('organization_id', orgId)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Role updated successfully' })
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[orgId]/members/[memberId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/organizations/[orgId]/members/[memberId]
 * Remove a member from the organization
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberId } = await params
    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Verify user has admin access to this organization
    const { data: adminMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .single()

    if (!adminMembership || !['org_admin', 'school_admin'].includes(adminMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent removing yourself
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('id', memberId)
      .single()

    if (targetMember?.user_id === context.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    // School admins can't remove org admins
    if (adminMembership.role === 'school_admin' && targetMember?.role === 'org_admin') {
      return NextResponse.json({ error: 'Cannot remove organization admins' }, { status: 403 })
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from('organization_members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('organization_id', orgId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Update seat count
    await supabase.rpc('decrement_org_seats', { org_id: orgId })

    return NextResponse.json({ success: true, message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[orgId]/members/[memberId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
