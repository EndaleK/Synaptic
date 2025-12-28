/**
 * API Route: /api/study-plans/[id]
 *
 * GET: Get a specific study plan with sessions
 * PATCH: Update plan status or settings
 * DELETE: Delete a study plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import { getStudyPlan, updatePlanStatus } from '@/lib/study-plan-generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-plans/[id]
 * Get a specific study plan with all sessions
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await params

    // Validate UUID
    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get plan with sessions
    const plan = await getStudyPlan(planId, profile.id)

    if (!plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('[StudyPlans] GET [id] error:', error)
    return NextResponse.json(
      { error: 'Failed to get study plan' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/study-plans/[id]
 * Update plan status or settings
 *
 * Body:
 * - status?: 'active' | 'paused' | 'completed' | 'abandoned'
 * - dailyTargetHours?: number
 * - masteryThreshold?: number
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await params

    // Validate UUID
    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { status, dailyTargetHours, masteryThreshold } = body

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (status) {
      const validStatuses = ['active', 'paused', 'completed', 'abandoned']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updates.status = status
    }

    if (dailyTargetHours !== undefined) {
      updates.daily_target_hours = dailyTargetHours
    }

    if (masteryThreshold !== undefined) {
      updates.mastery_threshold = masteryThreshold
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Update plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('study_plans')
      .update(updates)
      .eq('id', planId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError || !updatedPlan) {
      return NextResponse.json(
        { error: 'Failed to update plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
    })
  } catch (error) {
    console.error('[StudyPlans] PATCH [id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update study plan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/study-plans/[id]
 * Delete a study plan and its sessions
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await params

    // Validate UUID
    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Delete plan (sessions will cascade delete)
    const { error: deleteError } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', profile.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Study plan deleted',
    })
  } catch (error) {
    console.error('[StudyPlans] DELETE [id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete study plan' },
      { status: 500 }
    )
  }
}
