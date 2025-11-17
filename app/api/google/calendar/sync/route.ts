/**
 * Google Calendar Sync API Route
 *
 * Create study events in Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google/calendar'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { action, eventId, event } = body

    // Get user's Google access token
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_access_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile?.google_access_token) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google account first.' },
        { status: 403 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'create':
        if (!event || !event.summary || !event.start || !event.end) {
          return NextResponse.json(
            { error: 'Missing required event fields: summary, start, end' },
            { status: 400 }
          )
        }

        const createResult = await createCalendarEvent(profile.google_access_token, event)

        if (!createResult.success) {
          return NextResponse.json(
            { error: createResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          eventId: createResult.eventId,
          eventUrl: createResult.eventUrl,
        })

      case 'update':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing eventId for update' },
            { status: 400 }
          )
        }

        const updateResult = await updateCalendarEvent(profile.google_access_token, eventId, event)

        if (!updateResult.success) {
          return NextResponse.json(
            { error: updateResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          eventId: updateResult.eventId,
          eventUrl: updateResult.eventUrl,
        })

      case 'delete':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing eventId for delete' },
            { status: 400 }
          )
        }

        const deleteResult = await deleteCalendarEvent(profile.google_access_token, eventId)

        if (!deleteResult.success) {
          return NextResponse.json(
            { error: deleteResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          eventId: deleteResult.eventId,
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be create, update, or delete' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync with Google Calendar' },
      { status: 500 }
    )
  }
}
