import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Usage limits per tier
const USAGE_LIMITS = {
  free: {
    documents: 10,
    flashcards: 50,
    podcasts: 5,
    mindmaps: 10
  },
  premium: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity
  },
  enterprise: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    const { userId } = await auth()

    if (!userId) {
      logger.warn('Unauthenticated usage request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, subscription_tier, subscription_status, monthly_document_count')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile for usage', profileError, { userId })
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const tier = profile.subscription_tier || 'free'
    const limits = USAGE_LIMITS[tier as keyof typeof USAGE_LIMITS] || USAGE_LIMITS.free

    // Get current month's usage from usage_tracking table
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('action_type')
      .eq('user_id', profile.id)
      .gte('created_at', startOfMonth.toISOString())

    if (usageError) {
      logger.error('Failed to fetch usage data', usageError, { userId })
    }

    // Count usage by type
    const usage = {
      documents: profile.monthly_document_count || 0,
      flashcards: 0,
      podcasts: 0,
      mindmaps: 0
    }

    usageData?.forEach((record) => {
      if (record.action_type === 'flashcard_generation' || record.action_type.includes('flashcard')) {
        usage.flashcards++
      } else if (record.action_type === 'podcast_generation' || record.action_type.includes('podcast')) {
        usage.podcasts++
      } else if (record.action_type === 'mindmap_generation' || record.action_type.includes('mindmap')) {
        usage.mindmaps++
      }
    })

    const duration = Date.now() - startTime
    logger.api('GET', '/api/usage', 200, duration, {
      userId,
      tier,
      documents: usage.documents,
      flashcards: usage.flashcards
    })

    return NextResponse.json({
      tier,
      limits: {
        documents: { used: usage.documents, limit: limits.documents },
        flashcards: { used: usage.flashcards, limit: limits.flashcards },
        podcasts: { used: usage.podcasts, limit: limits.podcasts },
        mindmaps: { used: usage.mindmaps, limit: limits.mindmaps }
      }
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Usage check failed', error, {
      userId: 'unknown',
      errorMessage: error?.message
    })
    logger.api('GET', '/api/usage', 500, duration, {
      error: error?.message
    })

    return NextResponse.json(
      { error: 'Failed to fetch usage data', message: error?.message },
      { status: 500 }
    )
  }
}
