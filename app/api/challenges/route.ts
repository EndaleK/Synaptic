/**
 * API Route: /api/challenges
 *
 * GET: Get user's challenges (created and participating)
 * POST: Create a new challenge
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ChallengeInput {
  title: string
  description?: string
  challenge_type: 'flashcards' | 'streak' | 'study_time' | 'exams' | 'custom'
  goal_value: number
  goal_unit: string
  start_date: string
  end_date: string
  visibility?: 'private' | 'friends' | 'public'
  max_participants?: number
}

/**
 * GET /api/challenges
 * Get challenges for the current user
 *
 * Query params:
 * - filter: 'all' | 'created' | 'participating' | 'active' (default: 'all')
 * - limit: number (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

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

    let query = supabase
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
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (filter === 'created') {
      query = query.eq('creator_id', profile.id)
    } else if (filter === 'participating') {
      // Get challenge IDs user is participating in
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', profile.id)

      const challengeIds = participations?.map(p => p.challenge_id) || []
      if (challengeIds.length > 0) {
        query = query.in('id', challengeIds)
      } else {
        return NextResponse.json({ challenges: [], total: 0 })
      }
    } else if (filter === 'active') {
      const today = new Date().toISOString().split('T')[0]
      query = query
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
    }

    // For 'all', get both created and participating
    if (filter === 'all') {
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', profile.id)

      const challengeIds = participations?.map(p => p.challenge_id) || []

      query = query.or(`creator_id.eq.${profile.id}${challengeIds.length > 0 ? `,id.in.(${challengeIds.join(',')})` : ''}`)
    }

    const { data: challenges, error } = await query

    if (error) {
      console.error('[Challenges] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
    }

    // Transform data and add user-specific info
    const transformedChallenges = (challenges || []).map(challenge => {
      const userParticipation = challenge.participants?.find(
        (p: any) => p.user_id === profile.id
      )
      const isCreator = challenge.creator_id === profile.id

      return {
        ...challenge,
        is_creator: isCreator,
        is_participating: !!userParticipation,
        user_progress: userParticipation?.current_progress || 0,
        user_completed: !!userParticipation?.completed_at,
        participant_count: challenge.participants?.length || 0,
        progress_percentage: Math.min(
          ((userParticipation?.current_progress || 0) / challenge.goal_value) * 100,
          100
        )
      }
    })

    return NextResponse.json({
      challenges: transformedChallenges,
      total: transformedChallenges.length
    })
  } catch (error) {
    console.error('[Challenges] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/challenges
 * Create a new challenge
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChallengeInput = await req.json()

    // Validate required fields
    if (!body.title || !body.challenge_type || !body.goal_value || !body.goal_unit || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, challenge_type, goal_value, goal_unit, start_date, end_date' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(body.start_date)
    const endDate = new Date(body.end_date)
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

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

    // Create the challenge
    const { data: challenge, error: createError } = await supabase
      .from('study_challenges')
      .insert({
        creator_id: profile.id,
        title: body.title,
        description: body.description,
        challenge_type: body.challenge_type,
        goal_value: body.goal_value,
        goal_unit: body.goal_unit,
        start_date: body.start_date,
        end_date: body.end_date,
        visibility: body.visibility || 'private',
        max_participants: body.max_participants || 50,
        status: new Date(body.start_date) <= new Date() ? 'active' : 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('[Challenges] Create error:', createError)
      return NextResponse.json(
        { error: 'Failed to create challenge' },
        { status: 500 }
      )
    }

    // Auto-join the creator as a participant
    const { error: joinError } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challenge.id,
        user_id: profile.id
      })

    if (joinError) {
      console.error('[Challenges] Auto-join error:', joinError)
      // Don't fail the request, but log it
    }

    return NextResponse.json({
      challenge,
      message: 'Challenge created successfully'
    })
  } catch (error) {
    console.error('[Challenges] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    )
  }
}
