/**
 * API Route: /api/challenges/[id]/join
 *
 * POST: Join a challenge
 * DELETE: Leave a challenge
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/challenges/[id]/join
 * Join a challenge
 *
 * Body (optional):
 * - invite_code: string (required for private challenges)
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: challengeId } = await context.params
    const body = await req.json().catch(() => ({}))

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get challenge
    const { data: challenge } = await supabase
      .from('study_challenges')
      .select('id, visibility, invite_code, status, max_participants, creator_id')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if challenge is joinable
    if (challenge.status === 'completed' || challenge.status === 'cancelled') {
      return NextResponse.json({ error: 'This challenge is no longer active' }, { status: 400 })
    }

    // Check if already a participant
    const { data: existingParticipation } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', profile.id)
      .single()

    if (existingParticipation) {
      return NextResponse.json({ error: 'Already participating in this challenge' }, { status: 400 })
    }

    // Check access for private challenges
    if (challenge.visibility === 'private') {
      if (challenge.creator_id !== profile.id && body.invite_code !== challenge.invite_code) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
      }
    }

    // Check participant limit
    const { count } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId)

    if (count && count >= (challenge.max_participants || 50)) {
      return NextResponse.json({ error: 'Challenge is full' }, { status: 400 })
    }

    // Join the challenge
    const { data: participation, error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: profile.id
      })
      .select()
      .single()

    if (error) {
      console.error('[Challenge Join] Error:', error)
      return NextResponse.json({ error: 'Failed to join challenge' }, { status: 500 })
    }

    return NextResponse.json({
      participation,
      message: 'Successfully joined the challenge!'
    })
  } catch (error) {
    console.error('[Challenge Join] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to join challenge' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/challenges/[id]/join
 * Leave a challenge
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: challengeId } = await context.params

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is the creator (creators can't leave their own challenge)
    const { data: challenge } = await supabase
      .from('study_challenges')
      .select('creator_id')
      .eq('id', challengeId)
      .single()

    if (challenge?.creator_id === profile.id) {
      return NextResponse.json(
        { error: 'Challenge creator cannot leave. Delete the challenge instead.' },
        { status: 400 }
      )
    }

    // Leave the challenge
    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', profile.id)

    if (error) {
      console.error('[Challenge Leave] Error:', error)
      return NextResponse.json({ error: 'Failed to leave challenge' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Left the challenge'
    })
  } catch (error) {
    console.error('[Challenge Leave] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to leave challenge' },
      { status: 500 }
    )
  }
}
