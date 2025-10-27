import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-preferences
 * Fetches user's study preferences (Pomodoro settings, notifications, etc.)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated study preferences request')
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

    // Get or create user study preferences
    let { data: preferences, error: prefError } = await supabase
      .from('user_study_preferences')
      .select('*')
      .eq('user_id', userProfileId)
      .single()

    // If no preferences exist, create default ones
    if (prefError || !preferences) {
      const { data: newPreferences, error: insertError } = await supabase
        .from('user_study_preferences')
        .insert({
          user_id: userProfileId,
          pomodoro_work_minutes: 25,
          pomodoro_short_break_minutes: 5,
          pomodoro_long_break_minutes: 15,
          pomodoro_sessions_until_long_break: 4,
          auto_start_breaks: false,
          auto_start_pomodoros: false,
          notification_sound_enabled: true,
          break_reminders_enabled: true,
          eye_break_interval_minutes: 20,
          daily_study_goal_minutes: 120,
          daily_flashcard_review_goal: 20
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Failed to create study preferences', insertError, { userId })
        return NextResponse.json({ error: "Failed to create preferences" }, { status: 500 })
      }

      preferences = newPreferences
    }

    const duration = Date.now() - startTime
    logger.api('GET', '/api/study-preferences', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      preferences
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Study preferences error', error, { userId: 'unknown' })
    logger.api('GET', '/api/study-preferences', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to fetch study preferences" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/study-preferences
 * Updates user's study preferences
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await req.json()

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

    // Update preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_study_preferences')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userProfileId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update study preferences', updateError, { userId })
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('PUT', '/api/study-preferences', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Update study preferences error', error, { userId: 'unknown' })
    logger.api('PUT', '/api/study-preferences', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to update study preferences" },
      { status: 500 }
    )
  }
}
