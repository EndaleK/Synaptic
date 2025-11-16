import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Usage limits per tier (Updated Nov 14, 2025 - Growth strategy)
// NOTE: These must match lib/usage-limits.ts
const USAGE_LIMITS = {
  free: {
    documents: 10,        // Increased from 5
    flashcards: 100,      // Increased from 50
    podcasts: 5,          // Increased from 3
    mindmaps: 10,         // Increased from 5
    exams: 5,             // Mock exam generation limit
    videos: 10,           // Video processing limit
    chat_messages: 50     // NEW limit
  },
  premium: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity,
    exams: Infinity,
    videos: Infinity,
    chat_messages: Infinity
  },
  enterprise: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity,
    exams: Infinity,
    videos: Infinity,
    chat_messages: Infinity
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

    console.log('🎯 Usage API called:', { userId, timestamp: new Date().toISOString() })

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

    console.log('📊 Usage data fetched from database:', {
      userId,
      profileId: profile.id,
      recordCount: usageData?.length || 0,
      startOfMonth: startOfMonth.toISOString(),
      actionTypes: usageData?.map(r => r.action_type) || [],
      error: usageError ? usageError.message : null
    })

    if (usageError) {
      logger.error('Failed to fetch usage data', usageError, { userId })
    }

    // Count usage by type
    const usage = {
      documents: 0,
      flashcards: 0,
      podcasts: 0,
      mindmaps: 0,
      exams: 0,
      videos: 0,
      chat_messages: 0
    }

    usageData?.forEach((record) => {
      if (record.action_type === 'document_upload' || record.action_type.includes('document')) {
        usage.documents++
      } else if (record.action_type === 'flashcard_generation' || record.action_type.includes('flashcard')) {
        usage.flashcards++
      } else if (record.action_type === 'podcast_generation' || record.action_type.includes('podcast')) {
        usage.podcasts++
      } else if (record.action_type === 'mindmap_generation' || record.action_type.includes('mindmap')) {
        usage.mindmaps++
      } else if (record.action_type === 'exam_creation' || record.action_type.includes('exam')) {
        usage.exams++
      } else if (record.action_type === 'video_processing' || record.action_type.includes('video')) {
        usage.videos++
      } else if (record.action_type === 'chat_message' || record.action_type.includes('chat')) {
        usage.chat_messages++
      }
    })

    console.log('📊 Final usage counts calculated:', { userId, tier, usage })

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
        mindmaps: { used: usage.mindmaps, limit: limits.mindmaps },
        exams: { used: usage.exams, limit: limits.exams },
        videos: { used: usage.videos, limit: limits.videos },
        chat_messages: { used: usage.chat_messages, limit: limits.chat_messages }
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
