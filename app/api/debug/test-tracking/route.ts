/**
 * Test endpoint to verify incrementUsage works
 * Directly calls incrementUsage for flashcards
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { incrementUsage } from '@/lib/usage-limits'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🧪 TEST: Starting tracking test for userId:', userId)

    // Test incrementUsage
    console.log('🧪 TEST: Calling incrementUsage...')
    await incrementUsage(userId, 'flashcards')
    console.log('🧪 TEST: incrementUsage call completed')

    // Verify it was inserted
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      })
    }

    const { data: records, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('🧪 TEST: Query results:', {
      recordCount: records?.length || 0,
      error: error?.message || null,
      records: records || []
    })

    return NextResponse.json({
      success: true,
      message: 'Test tracking completed',
      userId,
      profileId: profile.id,
      totalRecords: records?.length || 0,
      latestRecords: records?.map(r => ({
        actionType: r.action_type,
        createdAt: r.created_at
      })) || [],
      diagnosis: records && records.length > 0
        ? 'SUCCESS: Tracking is working! The issue is that the actual API routes are not calling incrementUsage.'
        : 'FAILURE: incrementUsage was called but no record was inserted. Database permission or RLS issue.'
    })

  } catch (error: unknown) {
    console.error('🧪 TEST ERROR:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message,
        stack: error?.stack
      },
      { status: 500 }
    )
  }
}
