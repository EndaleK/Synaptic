import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

interface StartSessionRequestBody {
  documentId?: string
  sessionType: 'pomodoro' | 'custom' | 'review' | 'chat' | 'podcast' | 'mindmap' | 'video' | 'writing' | 'exam'
  plannedDurationMinutes: number
}

/**
 * POST /api/study-sessions/start
 * Starts a new study session
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated start session request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: StartSessionRequestBody = await req.json()
    const { documentId, sessionType, plannedDurationMinutes } = body

    if (!sessionType || !plannedDurationMinutes) {
      return NextResponse.json(
        { error: "sessionType and plannedDurationMinutes are required" },
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

    // Create study session
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userProfileId,
        document_id: documentId || null,
        session_type: sessionType,
        start_time: now.toISOString(),
        planned_duration_minutes: plannedDurationMinutes,
        completed: false
      })
      .select()
      .single()

    if (sessionError) {
      logger.error('Failed to create study session', sessionError, { userId })
      return NextResponse.json({ error: "Failed to start session" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/study-sessions/start', 200, duration, {
      userId,
      sessionType,
      sessionId: session.id
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      startTime: session.start_time
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Start session error', error, { userId: 'unknown' })
    logger.api('POST', '/api/study-sessions/start', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to start session" },
      { status: 500 }
    )
  }
}
