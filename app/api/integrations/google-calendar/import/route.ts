import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * POST /api/integrations/google-calendar/import
 * Imports events from Google Calendar
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated Google Calendar import request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get stored Google Calendar credentials
    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', profile.id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({
        error: "Google Calendar not connected",
        connected: false
      }, { status: 400 })
    }

    let accessToken = integration.access_token

    // Check if token is expired and refresh if needed
    const tokenExpiry = new Date(integration.token_expiry)
    if (tokenExpiry < new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token')
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update stored token
      await supabase
        .from('calendar_integrations')
        .update({
          access_token: refreshData.access_token,
          token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', integration.id)
    }

    // Fetch events from Google Calendar (next 90 days)
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      throw new Error(`Failed to fetch calendar events: ${errorData.error?.message || 'Unknown error'}`)
    }

    const calendarData = await calendarResponse.json()
    const googleEvents = calendarData.items || []

    // Map event types based on keywords
    const mapEventType = (summary: string, description: string = ''): 'study_session' | 'exam' | 'assignment' | 'review' | 'break' | 'other' => {
      const text = `${summary} ${description}`.toLowerCase()

      if (text.includes('exam') || text.includes('test') || text.includes('quiz')) return 'exam'
      if (text.includes('assignment') || text.includes('homework') || text.includes('project')) return 'assignment'
      if (text.includes('review') || text.includes('revision')) return 'review'
      if (text.includes('study') || text.includes('learning')) return 'study_session'
      if (text.includes('break') || text.includes('rest')) return 'break'

      return 'other'
    }

    // Import events to database
    let importedCount = 0
    for (const event of googleEvents) {
      if (!event.summary) continue // Skip events without titles

      const eventType = mapEventType(event.summary, event.description)

      const startTime = event.start.dateTime || event.start.date
      const endTime = event.end.dateTime || event.end.date
      const allDay = !event.start.dateTime

      // Check if event already exists (by Google event ID)
      const { data: existingEvent } = await supabase
        .from('study_schedule')
        .select('id')
        .eq('user_id', profile.id)
        .eq('google_event_id', event.id)
        .single()

      if (existingEvent) {
        // Update existing event
        await supabase
          .from('study_schedule')
          .update({
            title: event.summary,
            description: event.description || null,
            event_type: eventType,
            start_time: startTime,
            end_time: endTime,
            all_day: allDay,
            location: event.location || null,
          })
          .eq('id', existingEvent.id)
      } else {
        // Insert new event
        await supabase
          .from('study_schedule')
          .insert({
            user_id: profile.id,
            title: event.summary,
            description: event.description || null,
            event_type: eventType,
            start_time: startTime,
            end_time: endTime,
            all_day: allDay,
            location: event.location || null,
            google_event_id: event.id,
          })
        importedCount++
      }
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/integrations/google-calendar/import', 200, duration, {
      userId,
      importedCount,
      totalEvents: googleEvents.length
    })

    return NextResponse.json({
      success: true,
      imported: importedCount,
      total: googleEvents.length,
      message: `Successfully imported ${importedCount} new events from Google Calendar`
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Google Calendar import error', error)
    logger.api('POST', '/api/integrations/google-calendar/import', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to import Google Calendar events" },
      { status: 500 }
    )
  }
}
