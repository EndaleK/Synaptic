/**
 * API Route: /api/challenges/[id]
 *
 * GET: Get challenge details with leaderboard
 * PATCH: Update challenge (creator only)
 * DELETE: Delete challenge (creator only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/challenges/[id]
 * Get challenge details with participants and leaderboard
 */
export async function GET(
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

    // Get challenge with participants
    const { data: challenge, error } = await supabase
      .from('study_challenges')
      .select(`
        *,
        creator:user_profiles!study_challenges_creator_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        participants:challenge_participants (
          id,
          user_id,
          current_progress,
          completed_at,
          joined_at,
          user:user_profiles (
            id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('id', challengeId)
      .single()

    if (error || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if user can access this challenge
    const isCreator = challenge.creator_id === profile.id
    const isParticipant = challenge.participants?.some((p: any) => p.user_id === profile.id)
    const isPublic = challenge.visibility === 'public'

    if (!isCreator && !isParticipant && !isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Sort participants by progress for leaderboard
    const leaderboard = (challenge.participants || [])
      .sort((a: any, b: any) => b.current_progress - a.current_progress)
      .map((p: any, index: number) => ({
        rank: index + 1,
        user_id: p.user_id,
        display_name: p.user?.display_name || 'Anonymous',
        avatar_url: p.user?.avatar_url,
        current_progress: p.current_progress,
        completed_at: p.completed_at,
        is_current_user: p.user_id === profile.id,
        progress_percentage: Math.min((p.current_progress / challenge.goal_value) * 100, 100)
      }))

    // Find current user's participation
    const userParticipation = challenge.participants?.find((p: any) => p.user_id === profile.id)

    return NextResponse.json({
      challenge: {
        ...challenge,
        is_creator: isCreator,
        is_participating: !!userParticipation,
        user_progress: userParticipation?.current_progress || 0,
        user_completed: !!userParticipation?.completed_at,
        participant_count: challenge.participants?.length || 0
      },
      leaderboard,
      user_rank: leaderboard.findIndex((p: any) => p.is_current_user) + 1 || null
    })
  } catch (error) {
    console.error('[Challenge] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/challenges/[id]
 * Update challenge (creator only)
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: challengeId } = await context.params
    const updates = await req.json()

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

    // Verify user is the creator
    const { data: challenge } = await supabase
      .from('study_challenges')
      .select('creator_id, status')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.creator_id !== profile.id) {
      return NextResponse.json({ error: 'Only the creator can update this challenge' }, { status: 403 })
    }

    // Don't allow certain updates after challenge has started
    const restrictedFields = ['start_date', 'challenge_type', 'goal_value', 'goal_unit']
    if (challenge.status === 'active') {
      for (const field of restrictedFields) {
        if (updates[field] !== undefined) {
          return NextResponse.json(
            { error: `Cannot update ${field} after challenge has started` },
            { status: 400 }
          )
        }
      }
    }

    // Update challenge
    const { data: updated, error } = await supabase
      .from('study_challenges')
      .update(updates)
      .eq('id', challengeId)
      .select()
      .single()

    if (error) {
      console.error('[Challenge] Update error:', error)
      return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
    }

    return NextResponse.json({ challenge: updated })
  } catch (error) {
    console.error('[Challenge] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update challenge' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/challenges/[id]
 * Delete challenge (creator only)
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

    // Verify user is the creator
    const { data: challenge } = await supabase
      .from('study_challenges')
      .select('creator_id')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.creator_id !== profile.id) {
      return NextResponse.json({ error: 'Only the creator can delete this challenge' }, { status: 403 })
    }

    // Delete challenge (cascade will handle participants and progress logs)
    const { error } = await supabase
      .from('study_challenges')
      .delete()
      .eq('id', challengeId)

    if (error) {
      console.error('[Challenge] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Challenge] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    )
  }
}
