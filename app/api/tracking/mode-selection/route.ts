/**
 * Mode Selection Tracking API
 *
 * POST - Record a new mode selection event
 * PATCH - Update an existing event with duration/completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

const VALID_MODES = [
  'flashcards', 'chat', 'podcast', 'quick-summary', 'exam',
  'mindmap', 'writer', 'video', 'studyguide', 'classes',
]

const VALID_SOURCES = [
  'dashboard', 'sidebar', 'recommendation', 'bottom_nav', 'keyboard_shortcut', 'study_buddy',
]

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, source, documentId, isFirstAction } = body

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode', validModes: VALID_MODES },
        { status: 400 }
      )
    }

    // Validate source
    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source', validSources: VALID_SOURCES },
        { status: 400 }
      )
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

    // Insert mode selection event
    const { data: event, error: insertError } = await supabase
      .from('mode_selection_events')
      .insert({
        user_id: userProfile.id,
        mode,
        source: source || 'dashboard',
        document_id: documentId || null,
        is_first_action: isFirstAction || false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[ModeSelectionAPI] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }

    return NextResponse.json({ eventId: event.id, recorded: true })
  } catch (error) {
    console.error('[ModeSelectionAPI] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle sendBeacon which sends data as query param
    const url = new URL(request.url)
    const isSendBeacon = url.searchParams.get('method') === 'PATCH'

    let body: { eventId: string; durationSeconds: number; actionCompleted: boolean }

    if (isSendBeacon) {
      const text = await request.text()
      body = JSON.parse(text)
    } else {
      body = await request.json()
    }

    const { eventId, durationSeconds, actionCompleted } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
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

    // Update the event (only if it belongs to this user)
    const { error: updateError } = await supabase
      .from('mode_selection_events')
      .update({
        duration_seconds: durationSeconds || null,
        action_completed: actionCompleted || false,
      })
      .eq('id', eventId)
      .eq('user_id', userProfile.id)

    if (updateError) {
      console.error('[ModeSelectionAPI] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error('[ModeSelectionAPI] PATCH Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Retrieve mode selection statistics for the current user
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

    // Get mode selection counts grouped by mode
    const { data: modeStats, error: statsError } = await supabase
      .from('mode_selection_events')
      .select('mode, duration_seconds, action_completed')
      .eq('user_id', userProfile.id)

    if (statsError) {
      console.error('[ModeSelectionAPI] Stats error:', statsError)
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
    }

    // Aggregate by mode
    const aggregated: Record<string, {
      sessions: number
      totalSeconds: number
      completedActions: number
    }> = {}

    for (const event of modeStats || []) {
      if (!aggregated[event.mode]) {
        aggregated[event.mode] = { sessions: 0, totalSeconds: 0, completedActions: 0 }
      }
      aggregated[event.mode].sessions++
      aggregated[event.mode].totalSeconds += event.duration_seconds || 0
      if (event.action_completed) {
        aggregated[event.mode].completedActions++
      }
    }

    // Calculate totals
    const totalSessions = Object.values(aggregated).reduce((sum, m) => sum + m.sessions, 0)

    return NextResponse.json({
      totalSessions,
      modeEngagement: aggregated,
    })
  } catch (error) {
    console.error('[ModeSelectionAPI] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
