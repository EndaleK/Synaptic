import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'
import type { OrganizationRole } from '@/lib/types/institutional'
import { randomBytes } from 'crypto'

/**
 * POST /api/organizations/[orgId]/invite
 * Send invitations to join the organization
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
    const { emails, role, schoolId } = body as {
      emails: string[]
      role: OrganizationRole
      schoolId?: string
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails are required' }, { status: 400 })
    }

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

    if (!adminMembership || !['org_admin', 'school_admin'].includes(adminMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // School admins can't invite org admins
    if (adminMembership.role === 'school_admin' && role === 'org_admin') {
      return NextResponse.json({ error: 'Cannot invite organization admins' }, { status: 403 })
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, max_seats, current_seats')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check seat limits
    if (org.current_seats + emails.length > org.max_seats) {
      return NextResponse.json(
        { error: `Insufficient seats. Available: ${org.max_seats - org.current_seats}` },
        { status: 400 }
      )
    }

    // Create invitations
    const inviteResults = {
      sent: [] as string[],
      failed: [] as { email: string; reason: string }[],
      existing: [] as string[],
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiration

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()

      // Check if user already exists in organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('user_profiles.email', normalizedEmail)

      if (existingMember && existingMember.length > 0) {
        inviteResults.existing.push(normalizedEmail)
        continue
      }

      // Check for existing pending invite
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', normalizedEmail)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingInvite) {
        inviteResults.existing.push(normalizedEmail)
        continue
      }

      // Generate invite code
      const inviteCode = randomBytes(16).toString('hex')

      // Create invitation
      const { error: inviteError } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: orgId,
          school_id: schoolId || null,
          email: normalizedEmail,
          role,
          invite_code: inviteCode,
          invited_by: context.userId,
          expires_at: expiresAt.toISOString(),
        })

      if (inviteError) {
        console.error('Error creating invite:', inviteError)
        inviteResults.failed.push({ email: normalizedEmail, reason: 'Database error' })
        continue
      }

      // TODO: Send email notification
      // For now, just log the invite code
      console.log(`Invite code for ${normalizedEmail}: ${inviteCode}`)

      inviteResults.sent.push(normalizedEmail)
    }

    return NextResponse.json({
      success: true,
      results: inviteResults,
      message: `${inviteResults.sent.length} invitation(s) sent successfully`,
    })
  } catch (error) {
    console.error('Error in POST /api/organizations/[orgId]/invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
