/**
 * Behavioral Learning Style API
 *
 * GET - Get user's behavioral learning style scores
 * POST - Recalculate and update behavioral scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateBehavioralScores,
  type ModeEngagement,
  type BehavioralScores,
} from '@/lib/behavioral-learning/style-inference'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get existing behavioral scores
    const { data: behaviorScores, error: scoresError } = await supabase
      .from('user_behavior_scores')
      .select('*')
      .eq('user_id', userProfile.id)
      .single()

    if (scoresError && scoresError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('[BehavioralAPI] Error fetching scores:', scoresError)
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
    }

    // If no scores exist, return defaults
    if (!behaviorScores) {
      return NextResponse.json({
        scores: {
          visual: 50,
          auditory: 50,
          kinesthetic: 50,
          readingWriting: 50,
          confidence: 0,
          dominantStyle: 'mixed',
          totalSessions: 0,
        } as BehavioralScores,
        modeEngagement: {},
        lastCalculated: null,
      })
    }

    return NextResponse.json({
      scores: {
        visual: behaviorScores.behavioral_visual,
        auditory: behaviorScores.behavioral_auditory,
        kinesthetic: behaviorScores.behavioral_kinesthetic,
        readingWriting: behaviorScores.behavioral_reading_writing,
        confidence: parseFloat(behaviorScores.behavioral_confidence) || 0,
        dominantStyle: behaviorScores.behavioral_dominant_style || 'mixed',
        totalSessions: behaviorScores.total_sessions || 0,
      } as BehavioralScores,
      modeEngagement: behaviorScores.mode_engagement || {},
      lastCalculated: behaviorScores.last_calculated_at,
    })
  } catch (error) {
    console.error('[BehavioralAPI] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Recalculate behavioral scores from mode selection events
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch all mode selection events for this user
    const { data: events, error: eventsError } = await supabase
      .from('mode_selection_events')
      .select('mode, duration_seconds, action_completed')
      .eq('user_id', userProfile.id)

    if (eventsError) {
      console.error('[BehavioralAPI] Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Aggregate events into mode engagement
    const modeEngagement: Record<string, ModeEngagement> = {}

    for (const event of events || []) {
      if (!modeEngagement[event.mode]) {
        modeEngagement[event.mode] = {
          sessions: 0,
          totalSeconds: 0,
          completedActions: 0,
        }
      }
      modeEngagement[event.mode].sessions++
      modeEngagement[event.mode].totalSeconds += event.duration_seconds || 0
      if (event.action_completed) {
        modeEngagement[event.mode].completedActions++
      }
    }

    // Calculate behavioral scores
    const scores = calculateBehavioralScores(modeEngagement)

    // Upsert behavioral scores
    const { error: upsertError } = await supabase
      .from('user_behavior_scores')
      .upsert(
        {
          user_id: userProfile.id,
          behavioral_visual: scores.visual,
          behavioral_auditory: scores.auditory,
          behavioral_kinesthetic: scores.kinesthetic,
          behavioral_reading_writing: scores.readingWriting,
          behavioral_confidence: scores.confidence,
          behavioral_dominant_style: scores.dominantStyle,
          mode_engagement: modeEngagement,
          total_sessions: scores.totalSessions,
          last_calculated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (upsertError) {
      console.error('[BehavioralAPI] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 })
    }

    return NextResponse.json({
      scores,
      modeEngagement,
      calculated: true,
    })
  } catch (error) {
    console.error('[BehavioralAPI] POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
