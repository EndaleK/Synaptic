import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-schedule/events
 * Fetches study schedule events for a date range
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated get events request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end date parameters are required" },
        { status: 400 }
      )
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

    const userProfileId = profile.id

    // Fetch events within date range
    const { data: events, error: eventsError } = await supabase
      .from('study_schedule')
      .select('*')
      .eq('user_id', userProfileId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true })

    if (eventsError) {
      logger.error('Failed to fetch study events', eventsError, { userId })
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    // Format events for frontend
    const formattedEvents = (events || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.event_type,
      startTime: event.start_time,
      endTime: event.end_time,
      allDay: event.all_day,
      location: event.location,
      color: event.color,
      documentId: event.document_id
    }))

    const duration = Date.now() - startTime
    logger.api('GET', '/api/study-schedule/events', 200, duration, {
      userId,
      eventCount: formattedEvents.length
    })

    return NextResponse.json({
      success: true,
      events: formattedEvents
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Get events error', error, { userId: 'unknown' })
    logger.api('GET', '/api/study-schedule/events', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-schedule/events
 * Creates a new study schedule event
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated create event request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      eventType,
      startTime: eventStartTime,
      endTime: eventEndTime,
      allDay,
      location,
      color,
      documentId
    } = body

    if (!title || !eventType || !eventStartTime || !eventEndTime) {
      return NextResponse.json(
        { error: "title, eventType, startTime, and endTime are required" },
        { status: 400 }
      )
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

    const userProfileId = profile.id

    // Determine if this is an exam event
    const isExamEvent = eventType === 'exam'
    const examDateValue = isExamEvent
      ? new Date(eventStartTime).toISOString().split('T')[0]
      : null

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('study_schedule')
      .insert({
        user_id: userProfileId,
        document_id: documentId || null,
        event_type: eventType,
        title,
        description: description || null,
        start_time: eventStartTime,
        end_time: eventEndTime,
        all_day: allDay || false,
        location: location || null,
        color: color || '#3b82f6',
        recurrence: 'none',
        completed: false,
        exam_date: examDateValue, // Set exam_date for exam events
      })
      .select()
      .single()

    if (eventError) {
      logger.error('Failed to create study event', eventError, { userId })
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/study-schedule/events', 200, duration, {
      userId,
      eventId: event.id
    })

    // Build response
    const response: {
      success: boolean
      event: {
        id: string
        title: string
        description: string | null
        eventType: string
        startTime: string
        endTime: string
        allDay: boolean
        location: string | null
        color: string
        documentId: string | null
        examDate?: string
      }
      promptStudyPlan?: boolean
    } = {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        startTime: event.start_time,
        endTime: event.end_time,
        allDay: event.all_day,
        location: event.location,
        color: event.color,
        documentId: event.document_id,
        examDate: event.exam_date,
      },
    }

    // If this is an exam event, include flag to prompt study plan creation
    if (isExamEvent) {
      response.promptStudyPlan = true
    }

    return NextResponse.json(response)

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Create event error', error, { userId: 'unknown' })
    logger.api('POST', '/api/study-schedule/events', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    )
  }
}
