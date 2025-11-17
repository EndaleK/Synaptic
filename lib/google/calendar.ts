/**
 * Google Calendar Integration
 *
 * Sync study sessions and schedules with Google Calendar
 */

import { google } from 'googleapis'
import { getGoogleOAuth2Client } from './config'

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: string // ISO date string
  end: string // ISO date string
  colorId?: string
}

export interface GoogleCalendarSyncResult {
  success: boolean
  eventId?: string
  eventUrl?: string
  error?: string
}

/**
 * Create a study session event in Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<GoogleCalendarSyncResult> {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: event.colorId || '9', // Purple color for study events
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    })

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventUrl: response.data.htmlLink || undefined,
    }
  } catch (error) {
    console.error('Google Calendar create error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create calendar event',
    }
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<GoogleCalendarSyncResult> {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const updateData: any = {}
    if (event.summary) updateData.summary = event.summary
    if (event.description) updateData.description = event.description
    if (event.start) {
      updateData.start = {
        dateTime: event.start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    }
    if (event.end) {
      updateData.end = {
        dateTime: event.end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updateData,
    })

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventUrl: response.data.htmlLink || undefined,
    }
  } catch (error) {
    console.error('Google Calendar update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update calendar event',
    }
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<GoogleCalendarSyncResult> {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })

    return {
      success: true,
      eventId,
    }
  } catch (error) {
    console.error('Google Calendar delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete calendar event',
    }
  }
}

/**
 * Get upcoming study events from Google Calendar
 */
export async function getUpcomingEvents(
  accessToken: string,
  maxResults = 10
) {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
      q: 'Synaptic', // Filter for Synaptic study events
    })

    return {
      success: true,
      events: response.data.items || [],
    }
  } catch (error) {
    console.error('Google Calendar list error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get calendar events',
      events: [],
    }
  }
}

/**
 * Batch create multiple study events
 */
export async function batchCreateEvents(
  accessToken: string,
  events: CalendarEvent[]
): Promise<{ success: boolean; created: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    events.map(event => createCalendarEvent(accessToken, event))
  )

  const created = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - created
  const errors = results
    .filter(r => r.status === 'fulfilled' && !r.value.success)
    .map(r => (r as any).value.error)

  return {
    success: failed === 0,
    created,
    failed,
    errors,
  }
}
