import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface ChildData {
  firstName: string
  lastName: string
  email?: string
  gradeLevel?: string
  birthYear?: string
}

/**
 * POST /api/children
 * Create managed child accounts for a parent
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { children } = body as { children: ChildData[] }

    if (!children || !Array.isArray(children) || children.length === 0) {
      return NextResponse.json(
        { error: 'At least one child is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get parent's profile
    const { data: parentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !parentProfile) {
      return NextResponse.json(
        { error: 'Parent profile not found' },
        { status: 404 }
      )
    }

    const createdChildren: Array<{ id: string; firstName: string; lastName: string }> = []

    for (const child of children) {
      if (!child.firstName || !child.lastName) {
        continue // Skip invalid entries
      }

      // Generate a unique email for managed accounts without email
      const childEmail = child.email ||
        `${child.firstName.toLowerCase()}.${child.lastName.toLowerCase()}.${Date.now()}@managed.synaptic.app`

      // Create user profile for child (managed account)
      const { data: childProfile, error: childError } = await supabase
        .from('user_profiles')
        .insert({
          // For managed accounts, we don't have a Clerk user ID yet
          // They'll get one when/if they create their own login
          clerk_user_id: `managed_${parentProfile.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: childEmail,
          full_name: `${child.firstName} ${child.lastName}`,
          primary_role: 'learner',
          roles: ['learner'],
          onboarding_completed: true,
          is_managed_account: true,
          managed_by: parentProfile.id,
          subscription_tier: 'free',
          subscription_status: 'inactive',
          documents_used_this_month: 0,
        })
        .select('id')
        .single()

      if (childError) {
        logger.error('Failed to create child profile', childError, { userId, child: child.firstName })
        continue
      }

      // Create student_guardians link
      await supabase.from('student_guardians').insert({
        student_id: childProfile.id,
        parent_id: parentProfile.id,
        relationship: 'guardian', // Can be updated later
        permission_level: 'full_access',
        is_active: true,
        verified_at: new Date().toISOString(),
        verified_by: parentProfile.id,
        requested_by: parentProfile.id,
      })

      createdChildren.push({
        id: childProfile.id,
        firstName: child.firstName,
        lastName: child.lastName,
      })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/children', 201, duration, {
      userId,
      childrenCount: createdChildren.length
    })

    return NextResponse.json({
      success: true,
      children: createdChildren,
      message: `Created ${createdChildren.length} child account(s)`,
    }, { status: 201 })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Children creation error', error, {})
    logger.api('POST', '/api/children', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to create child accounts' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/children
 * Get all children linked to the current parent
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get parent's profile
    const { data: parentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !parentProfile) {
      return NextResponse.json(
        { error: 'Parent profile not found' },
        { status: 404 }
      )
    }

    // Get all linked children via student_guardians
    const { data: guardianLinks, error: linksError } = await supabase
      .from('student_guardians')
      .select(`
        id,
        relationship,
        permission_level,
        student:user_profiles!student_guardians_student_id_fkey(
          id,
          full_name,
          email,
          primary_role,
          is_managed_account,
          created_at
        )
      `)
      .eq('parent_id', parentProfile.id)
      .eq('is_active', true)

    if (linksError) {
      logger.error('Failed to fetch children', linksError, { userId })
      return NextResponse.json(
        { error: 'Failed to fetch children' },
        { status: 500 }
      )
    }

    // Format response
    const children = guardianLinks?.map((link) => {
      // Supabase returns related records - handle both single object and array cases
      const studentData = link.student as unknown as {
        id: string
        full_name: string
        email: string
        primary_role: string
        is_managed_account: boolean
        created_at: string
      } | null

      return {
        id: studentData?.id,
        name: studentData?.full_name,
        email: studentData?.email,
        isManagedAccount: studentData?.is_managed_account,
        relationship: link.relationship,
        permissionLevel: link.permission_level,
        createdAt: studentData?.created_at,
      }
    }).filter(c => c.id) || []

    const duration = Date.now() - startTime
    logger.api('GET', '/api/children', 200, duration, { userId, count: children.length })

    return NextResponse.json({
      success: true,
      children,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Children fetch error', error, {})
    logger.api('GET', '/api/children', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch children' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/children?id=<childId>
 * Remove a child from parent's family
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get('id')

    if (!childId) {
      return NextResponse.json(
        { error: 'Child ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get parent's profile
    const { data: parentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !parentProfile) {
      return NextResponse.json(
        { error: 'Parent profile not found' },
        { status: 404 }
      )
    }

    // Deactivate the guardian link (soft delete)
    const { error: deleteError } = await supabase
      .from('student_guardians')
      .update({ is_active: false })
      .eq('parent_id', parentProfile.id)
      .eq('student_id', childId)

    if (deleteError) {
      logger.error('Failed to remove child', deleteError, { userId, childId })
      return NextResponse.json(
        { error: 'Failed to remove child' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('DELETE', '/api/children', 200, duration, { userId, childId })

    return NextResponse.json({
      success: true,
      message: 'Child removed from family',
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Children delete error', error, {})
    logger.api('DELETE', '/api/children', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to remove child' },
      { status: 500 }
    )
  }
}
