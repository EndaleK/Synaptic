import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

interface CompleteSessionRequestBody {
  sessionId: string
  durationMinutes: number
  breaksTaken?: number
  notes?: string
}

/**
 * POST /api/study-sessions/complete
 * Completes a study session
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated complete session request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: CompleteSessionRequestBody = await req.json()
    const { sessionId, durationMinutes, breaksTaken, notes } = body

    if (!sessionId || durationMinutes === undefined) {
      return NextResponse.json(
        { error: "sessionId and durationMinutes are required" },
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
    const now = new Date()

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userProfileId)
      .single()

    if (sessionError || !session) {
      logger.error('Study session not found', sessionError, { userId, sessionId })
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Update study session
    const { error: updateError } = await supabase
      .from('study_sessions')
      .update({
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        completed: true,
        breaks_taken: breaksTaken || 0,
        notes: notes || null
      })
      .eq('id', sessionId)

    if (updateError) {
      logger.error('Failed to complete study session', updateError, { userId, sessionId })
      return NextResponse.json({ error: "Failed to complete session" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/study-sessions/complete', 200, duration, {
      userId,
      sessionId,
      durationMinutes
    })

    return NextResponse.json({
      success: true,
      sessionId,
      durationMinutes,
      completedAt: now.toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Complete session error', error, { userId: 'unknown' })
    logger.api('POST', '/api/study-sessions/complete', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to complete session" },
      { status: 500 }
    )
  }
}
