/**
 * API Route: /api/referrals
 *
 * GET: Get user's referral stats and history
 * POST: Create a referral link click (for tracking)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ReferralStats {
  referral_code: string
  total_referrals: number
  referral_credits: number
  pending_referrals: number
  completed_referrals: number
  milestones: Array<{
    type: string
    achieved_at: string
    reward: string
  }>
  next_milestone: {
    target: number
    reward: string
  } | null
  recent_referrals: Array<{
    id: string
    referred_name: string
    status: string
    created_at: string
    reward_amount: number | null
  }>
}

/**
 * GET /api/referrals
 * Get user's referral statistics and history
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile with referral info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, referral_code, total_referrals, referral_credits')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get pending referrals count
    const { count: pendingCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', profile.id)
      .eq('status', 'pending')

    // Get completed referrals count
    const { count: completedCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', profile.id)
      .in('status', ['completed', 'rewarded'])

    // Get milestones
    const { data: milestones } = await supabase
      .from('referral_milestones')
      .select('milestone_type, achieved_at, reward_type, reward_value')
      .eq('user_id', profile.id)
      .order('achieved_at', { ascending: false })

    // Get recent referrals
    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        created_at,
        reward_amount,
        referred:user_profiles!referrals_referred_id_fkey (
          display_name
        )
      `)
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate next milestone
    const totalReferrals = profile.total_referrals || 0
    let nextMilestone = null
    if (totalReferrals < 1) {
      nextMilestone = { target: 1, reward: '50 bonus credits', progress: totalReferrals }
    } else if (totalReferrals < 5) {
      nextMilestone = { target: 5, reward: '1 free month', progress: totalReferrals }
    } else if (totalReferrals < 10) {
      nextMilestone = { target: 10, reward: '3 free months', progress: totalReferrals }
    } else if (totalReferrals < 25) {
      nextMilestone = { target: 25, reward: '1 year premium', progress: totalReferrals }
    }

    const stats: ReferralStats = {
      referral_code: profile.referral_code,
      total_referrals: totalReferrals,
      referral_credits: profile.referral_credits || 0,
      pending_referrals: pendingCount || 0,
      completed_referrals: completedCount || 0,
      milestones: (milestones || []).map(m => ({
        type: m.milestone_type,
        achieved_at: m.achieved_at,
        reward: `${m.reward_type}: ${m.reward_value}`
      })),
      next_milestone: nextMilestone,
      recent_referrals: (recentReferrals || []).map(r => ({
        id: r.id,
        referred_name: (r.referred as any)?.display_name || 'Anonymous',
        status: r.status,
        created_at: r.created_at,
        reward_amount: r.reward_amount
      }))
    }

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'
    const shareUrl = `${baseUrl}/signup?ref=${profile.referral_code}`

    return NextResponse.json({
      stats,
      shareUrl,
      shareMessage: `Join me on Synaptic - the AI-powered study platform! Use my link to get bonus credits: ${shareUrl}`
    })
  } catch (error) {
    console.error('[Referrals] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/referrals
 * Apply a referral code during signup
 *
 * Body: { referral_code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { referral_code } = body

    if (!referral_code) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, referred_by')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if already referred
    if (profile.referred_by) {
      return NextResponse.json(
        { error: 'You have already used a referral code' },
        { status: 400 }
      )
    }

    // Find referrer by code
    const { data: referrer } = await supabase
      .from('user_profiles')
      .select('id, referral_code')
      .eq('referral_code', referral_code.toUpperCase())
      .single()

    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Can't refer yourself
    if (referrer.id === profile.id) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      )
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: profile.id,
        referral_code: referral_code.toUpperCase(),
        status: 'pending'
      })
      .select()
      .single()

    if (referralError) {
      // Check if it's a unique constraint violation (already referred)
      if (referralError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already been referred' },
          { status: 400 }
        )
      }
      console.error('[Referrals] Create error:', referralError)
      return NextResponse.json(
        { error: 'Failed to apply referral code' },
        { status: 500 }
      )
    }

    // Update the referred user's profile
    await supabase
      .from('user_profiles')
      .update({ referred_by: referrer.id })
      .eq('id', profile.id)

    return NextResponse.json({
      success: true,
      message: 'Referral code applied! You\'ll both receive rewards when you complete your first study session.',
      referral_id: referral.id
    })
  } catch (error) {
    console.error('[Referrals] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to apply referral code' },
      { status: 500 }
    )
  }
}
