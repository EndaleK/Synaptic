/**
 * Diagnostic endpoint to test usage tracking
 * GET /api/debug/usage-tracking
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { incrementUsage, checkUsageLimit } from '@/lib/usage-limits'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 1. Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, subscription_tier')
      .eq('clerk_user_id', userId)
      .single()

    // 2. Check if usage_tracking table exists and has data
    const { data: usageData, error: usageError, count } = await supabase
      .from('usage_tracking')
      .select('*', { count: 'exact' })
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 3. Test incrementUsage function
    console.log('🧪 Testing incrementUsage function...')
    await incrementUsage(userId, 'flashcards')

    // 4. Check usage limits
    const flashcardLimit = await checkUsageLimit(userId, 'flashcards')
    const podcastLimit = await checkUsageLimit(userId, 'podcasts')
    const mindmapLimit = await checkUsageLimit(userId, 'mindmaps')

    // 5. Count this month's usage by feature
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyUsage } = await supabase
      .from('usage_tracking')
      .select('action_type')
      .eq('user_id', profile?.id)
      .gte('created_at', firstDayOfMonth.toISOString())

    const usageCounts = {
      flashcards: monthlyUsage?.filter(u => u.action_type === 'flashcard_generation').length || 0,
      podcasts: monthlyUsage?.filter(u => u.action_type === 'podcast_generation').length || 0,
      mindmaps: monthlyUsage?.filter(u => u.action_type === 'mindmap_generation').length || 0,
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        userProfile: {
          found: !!profile,
          id: profile?.id,
          clerkUserId: profile?.clerk_user_id,
          tier: profile?.subscription_tier,
          error: profileError?.message
        },
        usageTrackingTable: {
          accessible: !usageError,
          totalRecords: count,
          error: usageError?.message,
          recentRecords: usageData?.length || 0
        },
        usageLimits: {
          flashcards: flashcardLimit,
          podcasts: podcastLimit,
          mindmaps: mindmapLimit
        },
        monthlyUsage: usageCounts,
        testIncrement: {
          executed: true,
          message: 'Check server logs for success/error messages'
        },
        recentUsageRecords: usageData?.map(record => ({
          actionType: record.action_type,
          createdAt: record.created_at,
          metadata: record.metadata
        }))
      }
    })

  } catch (error: any) {
    console.error('🔴 Diagnostic endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
