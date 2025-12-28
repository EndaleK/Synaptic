import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { adaptPlan, evaluatePlanProgress, rescheduleWeakTopics } from '@/lib/adaptive-scheduler'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/study-plans/[id]/adapt
 * Adapt a study plan based on current progress
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  const { id: planId } = await params

  try {
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated adapt plan request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userProfileId = profile.id

    // Verify plan ownership
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id, title')
      .eq('id', planId)
      .eq('user_id', userProfileId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    // Get body for options
    let options: { action?: string } = {}
    try {
      options = await req.json()
    } catch {
      // No body, use defaults
    }

    let result

    if (options.action === 'reschedule-weak') {
      // Specifically reschedule weak topics
      result = await rescheduleWeakTopics(planId, userProfileId)
    } else {
      // General adaptation
      result = await adaptPlan(planId, userProfileId)
    }

    // Get updated progress
    const progress = await evaluatePlanProgress(planId, userProfileId)

    const duration = Date.now() - startTime
    logger.api('POST', `/api/study-plans/${planId}/adapt`, 200, duration, {
      userId,
      planId,
      ...result,
    })

    return NextResponse.json({
      success: result.success,
      result,
      progress,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Adapt plan error', error, { planId })
    logger.api('POST', `/api/study-plans/${planId}/adapt`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to adapt plan' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/study-plans/[id]/adapt
 * Get plan progress and adaptation suggestions
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  const { id: planId } = await params

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userProfileId = profile.id

    // Get plan progress
    const progress = await evaluatePlanProgress(planId, userProfileId)

    if (!progress) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    // Generate suggestions
    const suggestions: string[] = []

    if (progress.behindSchedule) {
      suggestions.push('You are behind schedule. Consider adding more study sessions.')
    }

    if (progress.weakTopics.length > 0) {
      suggestions.push(`Focus on weak topics: ${progress.weakTopics.slice(0, 3).map(t => t.topic).join(', ')}`)
    }

    if (progress.daysRemaining <= 3) {
      suggestions.push('Exam is very close! Focus on review and practice exams.')
    }

    if (progress.skippedSessions > 3) {
      suggestions.push('You have skipped several sessions. Consider rescheduling them.')
    }

    const duration = Date.now() - startTime
    logger.api('GET', `/api/study-plans/${planId}/adapt`, 200, duration, { userId, planId })

    return NextResponse.json({
      success: true,
      progress,
      suggestions,
      canAdapt: progress.behindSchedule || progress.weakTopics.length > 0,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Get plan progress error', error, { planId })
    logger.api('GET', `/api/study-plans/${planId}/adapt`, 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to get progress' },
      { status: 500 }
    )
  }
}
