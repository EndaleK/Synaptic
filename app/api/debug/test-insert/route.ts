/**
 * Deep diagnostic: Test direct database insert
 * Shows exact error from Supabase
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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

    console.log('🔍 DEEP TEST: Starting direct insert test')
    console.log('🔍 Clerk userId:', userId)

    const supabase = await createClient()

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email')
      .eq('clerk_user_id', userId)
      .single()

    console.log('🔍 Profile query result:', { profile, error: profileError })

    if (profileError || !profile) {
      return NextResponse.json({
        step: 'profile_lookup',
        success: false,
        error: profileError?.message || 'Profile not found',
        profileError: profileError
      })
    }

    console.log('🔍 Found profile ID:', profile.id)

    // Try direct insert
    console.log('🔍 Attempting direct insert to usage_tracking...')
    const { data: insertedData, error: insertError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: profile.id,
        action_type: 'flashcard_generation',
        metadata: { test: true, timestamp: new Date().toISOString() }
      })
      .select()

    console.log('🔍 Insert result:', {
      data: insertedData,
      error: insertError
    })

    if (insertError) {
      return NextResponse.json({
        step: 'insert',
        success: false,
        error: insertError.message,
        errorDetails: {
          message: insertError.message,
          hint: insertError.hint,
          details: insertError.details,
          code: insertError.code
        },
        diagnosis: 'Database insert failed. Check error details for root cause.'
      })
    }

    // Verify it exists
    const { data: verifyData, count } = await supabase
      .from('usage_tracking')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)

    console.log('🔍 Verification query:', {
      count,
      records: verifyData
    })

    return NextResponse.json({
      step: 'complete',
      success: true,
      userId,
      profileId: profile.id,
      insertedRecord: insertedData,
      totalRecords: count || 0,
      allRecords: verifyData?.map(r => ({
        actionType: r.action_type,
        createdAt: r.created_at
      })),
      diagnosis: 'SUCCESS! Insert worked. The issue was the missing RLS policies.'
    })

  } catch (error: unknown) {
    console.error('🔍 DEEP TEST ERROR:', error)
    return NextResponse.json(
      {
        step: 'exception',
        success: false,
        error: error?.message,
        stack: error?.stack
      },
      { status: 500 }
    )
  }
}
