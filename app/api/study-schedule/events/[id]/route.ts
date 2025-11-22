import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { validateUUIDParam } from "@/lib/validation/uuid"

export const dynamic = 'force-dynamic'

/**
 * PUT /api/study-schedule/events/[id]
 * Updates a study schedule event
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const eventId = params.id

  try {
    // Validate UUID format
    try {
      validateUUIDParam(eventId, 'event ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid event ID format' },
        { status: 400 }
      )
    }

    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated update event request')
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
      color
    } = body

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

    // Verify event belongs to user
    const { data: existingEvent, error: checkError } = await supabase
      .from('study_schedule')
      .select('id')
      .eq('id', eventId)
      .eq('user_id', userProfileId)
      .single()

    if (checkError || !existingEvent) {
      logger.error('Study event not found', checkError, { userId, eventId })
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Update event
    const { data: event, error: eventError } = await supabase
      .from('study_schedule')
      .update({
        title,
        description: description || null,
        event_type: eventType,
        start_time: eventStartTime,
        end_time: eventEndTime,
        all_day: allDay || false,
        location: location || null,
        color: color || '#3b82f6',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (eventError) {
      logger.error('Failed to update study event', eventError, { userId, eventId })
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('PUT', `/api/study-schedule/events/${eventId}`, 200, duration, {
      userId,
      eventId
    })

    return NextResponse.json({
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
        documentId: event.document_id
      }
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Update event error', error, { userId: 'unknown' })
    logger.api('PUT', `/api/study-schedule/events/${eventId}`, 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/study-schedule/events/[id]
 * Deletes a study schedule event
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const eventId = params.id

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated delete event request')
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

    const userProfileId = profile.id

    // Delete event (RLS policies ensure user can only delete their own events)
    const { error: deleteError } = await supabase
      .from('study_schedule')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userProfileId)

    if (deleteError) {
      logger.error('Failed to delete study event', deleteError, { userId, eventId })
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('DELETE', `/api/study-schedule/events/${eventId}`, 200, duration, {
      userId,
      eventId
    })

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Delete event error', error, { userId: 'unknown' })
    logger.api('DELETE', `/api/study-schedule/events/${eventId}`, 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    )
  }
}
