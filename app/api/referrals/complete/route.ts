/**
 * API Route: /api/referrals/complete
 *
 * POST: Mark a referral as complete (called after qualifying action)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/referrals/complete
 * Complete a pending referral and award credits
 *
 * This is called automatically when a referred user completes their first:
 * - Study session (5+ minutes)
 * - Flashcard review (10+ cards)
 * - Exam attempt
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, referred_by')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user was referred
    if (!profile.referred_by) {
      return NextResponse.json({
        success: false,
        message: 'User was not referred'
      })
    }

    // Find pending referral
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', profile.id)
      .eq('status', 'pending')
      .single()

    if (!referral) {
      return NextResponse.json({
        success: false,
        message: 'No pending referral found or already completed'
      })
    }

    // Update referral to completed
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', referral.id)

    if (updateError) {
      console.error('[Referrals Complete] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete referral' },
        { status: 500 }
      )
    }

    // Award credits to referrer
    const { data: referrer } = await supabase
      .from('user_profiles')
      .select('id, total_referrals, referral_credits')
      .eq('id', referral.referrer_id)
      .single()

    if (referrer) {
      const newTotalReferrals = (referrer.total_referrals || 0) + 1
      const newCredits = (referrer.referral_credits || 0) + 100 // 100 credits per referral

      await supabase
        .from('user_profiles')
        .update({
          total_referrals: newTotalReferrals,
          referral_credits: newCredits
        })
        .eq('id', referrer.id)

      // Create reward record for referrer
      await supabase
        .from('referral_rewards')
        .insert({
          user_id: referrer.id,
          referral_id: referral.id,
          reward_type: 'bonus_credits',
          reward_value: 100,
          status: 'applied',
          applied_at: new Date().toISOString()
        })

      // Check for milestones
      let milestone = null
      if (newTotalReferrals === 1) {
        milestone = { type: 'first_referral', bonus: 50 }
        await supabase.from('referral_milestones').insert({
          user_id: referrer.id,
          milestone_type: 'first_referral',
          referral_count: 1,
          reward_type: 'bonus_credits',
          reward_value: 50
        }).onConflict('user_id, milestone_type').ignore()

        await supabase
          .from('user_profiles')
          .update({ referral_credits: newCredits + 50 })
          .eq('id', referrer.id)
      } else if (newTotalReferrals === 5) {
        milestone = { type: '5_referrals', reward: '1 free month' }
        await supabase.from('referral_milestones').insert({
          user_id: referrer.id,
          milestone_type: '5_referrals',
          referral_count: 5,
          reward_type: 'free_month',
          reward_value: 1
        }).onConflict('user_id, milestone_type').ignore()
      } else if (newTotalReferrals === 10) {
        milestone = { type: '10_referrals', reward: '3 free months' }
        await supabase.from('referral_milestones').insert({
          user_id: referrer.id,
          milestone_type: '10_referrals',
          referral_count: 10,
          reward_type: 'free_month',
          reward_value: 3
        }).onConflict('user_id, milestone_type').ignore()
      } else if (newTotalReferrals === 25) {
        milestone = { type: '25_referrals', reward: '1 year premium' }
        await supabase.from('referral_milestones').insert({
          user_id: referrer.id,
          milestone_type: '25_referrals',
          referral_count: 25,
          reward_type: 'premium_features',
          reward_value: 12
        }).onConflict('user_id, milestone_type').ignore()
      }

      // Update referral as rewarded
      await supabase
        .from('referrals')
        .update({
          status: 'rewarded',
          referrer_rewarded_at: new Date().toISOString(),
          reward_type: 'bonus_credits',
          reward_amount: 100
        })
        .eq('id', referral.id)
    }

    // Award credits to referred user
    const { data: referred } = await supabase
      .from('user_profiles')
      .select('id, referral_credits')
      .eq('id', profile.id)
      .single()

    if (referred) {
      await supabase
        .from('user_profiles')
        .update({
          referral_credits: (referred.referral_credits || 0) + 50
        })
        .eq('id', profile.id)

      // Create reward record for referred user
      await supabase
        .from('referral_rewards')
        .insert({
          user_id: profile.id,
          referral_id: referral.id,
          reward_type: 'bonus_credits',
          reward_value: 50,
          status: 'applied',
          applied_at: new Date().toISOString()
        })

      // Update referral with referred reward
      await supabase
        .from('referrals')
        .update({
          referred_rewarded_at: new Date().toISOString()
        })
        .eq('id', referral.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Referral completed! Both you and your referrer have received bonus credits.',
      referrer_credits: 100,
      referred_credits: 50
    })
  } catch (error) {
    console.error('[Referrals Complete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to complete referral' },
      { status: 500 }
    )
  }
}
