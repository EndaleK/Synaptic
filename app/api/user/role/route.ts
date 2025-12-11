import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { UserRole } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const VALID_ROLES: UserRole[] = ['learner', 'parent', 'educator', 'institution']

/**
 * PATCH /api/user/role
 * Update user's role and onboarding status
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { primary_role, roles, onboarding_completed, onboarding_step } = body

    // Validate primary_role if provided
    if (primary_role && !VALID_ROLES.includes(primary_role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate roles array if provided
    if (roles) {
      if (!Array.isArray(roles)) {
        return NextResponse.json(
          { error: 'roles must be an array' },
          { status: 400 }
        )
      }
      for (const role of roles) {
        if (!VALID_ROLES.includes(role)) {
          return NextResponse.json(
            { error: `Invalid role in array: ${role}` },
            { status: 400 }
          )
        }
      }
    }

    const supabase = await createClient()

    // Build update object
    const updates: Record<string, unknown> = {}
    if (primary_role !== undefined) updates.primary_role = primary_role
    if (roles !== undefined) updates.roles = roles
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed
    if (onboarding_step !== undefined) updates.onboarding_step = onboarding_step

    // Update user profile
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update user role', updateError, { userId })
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('PATCH', '/api/user/role', 200, duration, { userId, primary_role })

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('User role update error', error, {})
    logger.api('PATCH', '/api/user/role', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to update role' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/role
 * Get user's current role and onboarding status
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

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, primary_role, roles, onboarding_completed, onboarding_step')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      logger.error('Failed to fetch user role', error, { userId })
      return NextResponse.json(
        { error: 'Failed to fetch role' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/user/role', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      ...profile,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('User role fetch error', error, {})
    logger.api('GET', '/api/user/role', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch role' },
      { status: 500 }
    )
  }
}
