/**
 * Debug endpoint to check if user profile exists
 * Helps diagnose tracking issues
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', clerkUserId: null },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email, subscription_tier, subscription_status, created_at')
      .eq('clerk_user_id', userId)
      .single()

    // Check usage tracking records
    let usageCount = 0
    if (profile) {
      const { count } = await supabase
        .from('usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      usageCount = count || 0
    }

    return NextResponse.json({
      clerkUserId: userId,
      profileExists: !!profile,
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        tier: profile.subscription_tier,
        status: profile.subscription_status,
        createdAt: profile.created_at
      } : null,
      profileError: profileError ? {
        message: profileError.message,
        code: profileError.code,
        hint: profileError.hint
      } : null,
      usageTrackingRecords: usageCount,
      diagnosis: !profile
        ? 'PROBLEM: User profile does not exist in database. This is why tracking fails.'
        : usageCount === 0
        ? 'Profile exists but no usage records found. Check if incrementUsage is being called.'
        : 'Profile and tracking records exist. Issue may be elsewhere.'
    })

  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        message: error?.message,
        stack: error?.stack
      },
      { status: 500 }
    )
  }
}
