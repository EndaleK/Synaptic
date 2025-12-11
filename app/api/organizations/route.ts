import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/permissions'
import type { CreateOrganizationRequest } from '@/lib/types/institutional'

/**
 * GET /api/organizations
 * List organizations the user belongs to
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

    const supabase = await createClient()

    // Get all organizations the user belongs to
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        is_active,
        organizations (
          id,
          name,
          slug,
          type,
          logo_url,
          primary_color,
          secondary_color,
          subscription_tier,
          max_seats,
          current_seats,
          created_at
        )
      `)
      .eq('user_id', context.userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    const organizations = memberships?.map(m => ({
      ...m.organizations,
      role: m.role,
    })) || []

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error in GET /api/organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/organizations
 * Create a new organization (for onboarding)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body: CreateOrganizationRequest = await req.json()

    console.log('[ORG CREATE] Request body:', JSON.stringify(body))
    console.log('[ORG CREATE] User context:', JSON.stringify({ userId: context.userId, email: context.email }))

    // Validate required fields (adminEmail is optional - will use user's email if not provided)
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      )
    }

    // Map frontend types to database enum values
    // Frontend uses: 'school', 'co-op', 'tutoring', 'other'
    // Database expects: 'k12_district', 'university', 'corporate', 'other'
    const typeMapping: Record<string, string> = {
      'school': 'k12_district',
      'co-op': 'k12_district', // Co-ops are similar to school structures
      'tutoring': 'corporate', // Tutoring businesses are corporate entities
      'other': 'other',
      // Also accept DB values directly for backwards compatibility
      'k12_district': 'k12_district',
      'university': 'university',
      'corporate': 'corporate',
    }

    const dbType = typeMapping[body.type] || 'other'
    console.log('[ORG CREATE] Type mapping:', body.type, '->', dbType)

    // Get admin email from body or fall back to user's email from context
    const adminEmail = body.adminEmail || context.email
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email required - please provide or update your profile email' },
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

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      )
    }

    // Create the organization
    console.log('[ORG CREATE] Attempting insert with:', {
      name: body.name,
      slug,
      type: dbType,
      admin_email: adminEmail,
    })

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        slug: slug,
        type: dbType,
        admin_email: adminEmail,
        billing_email: body.billingEmail || adminEmail,
        subscription_tier: 'pilot',
        max_seats: 100,
        current_seats: 0,
      })
      .select()
      .single()

    if (orgError) {
      console.error('[ORG CREATE] Error creating organization:', JSON.stringify(orgError, null, 2))
      console.error('[ORG CREATE] Error code:', orgError.code)
      console.error('[ORG CREATE] Error message:', orgError.message)
      console.error('[ORG CREATE] Error details:', orgError.details)
      return NextResponse.json({ error: 'Failed to create organization', details: orgError.message }, { status: 500 })
    }

    console.log('[ORG CREATE] Organization created:', organization.id)

    // Add the creating user as org_admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: context.userId,
        role: 'org_admin',
        invited_by: context.userId,
        accepted_at: new Date().toISOString(),
        is_active: true,
      })

    if (memberError) {
      console.error('Error adding admin member:', memberError)
      // Rollback organization creation
      await supabase.from('organizations').delete().eq('id', organization.id)
      return NextResponse.json({ error: 'Failed to set up organization admin' }, { status: 500 })
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        subscriptionTier: organization.subscription_tier,
      },
      message: 'Organization created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
