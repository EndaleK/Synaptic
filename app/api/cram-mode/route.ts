/**
 * API Route: /api/cram-mode
 *
 * POST: Start a new cram mode session
 * GET: Get active cram session for user
 * PUT: Update cram session progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateCramPlan,
  calculateCramProgress,
  CramPlan
} from '@/lib/cram-mode-generator'

export const runtime = 'nodejs'
export const maxDuration = 30

interface StartCramRequest {
  examDate: string
  examId?: string
  studyPlanId?: string
  weakTopics: string[]
  allTopics: string[]
  documentIds: string[]
  dailyAvailableMinutes?: number
}

/**
 * POST /api/cram-mode
 * Start a new cram mode session
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StartCramRequest = await req.json()
    const {
      examDate,
      examId,
      studyPlanId,
      weakTopics,
      allTopics,
      documentIds,
      dailyAvailableMinutes = 90
    } = body

    if (!examDate) {
      return NextResponse.json(
        { error: 'examDate is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check for existing active cram session
    const { data: existingSession } = await supabase
      .from('cram_sessions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .single()

    if (existingSession) {
      // Mark existing session as abandoned
      await supabase
        .from('cram_sessions')
        .update({ status: 'abandoned' })
        .eq('id', existingSession.id)
    }

    // Generate cram plan
    const cramPlan = generateCramPlan({
      examDate: new Date(examDate),
      weakTopics: weakTopics || [],
      allTopics: allTopics || [],
      documentsIds: documentIds || [],
      dailyAvailableMinutes,
      examId,
      studyPlanId
    })

    // Create cram session in database
    const { data: session, error: sessionError } = await supabase
      .from('cram_sessions')
      .insert({
        user_id: profile.id,
        exam_id: examId || null,
        study_plan_id: studyPlanId || null,
        exam_date: examDate,
        status: 'active',
        focus_topics: weakTopics,
        daily_progress: {},
        total_minutes_studied: 0,
        flashcards_reviewed: 0,
        mini_exams_completed: 0,
        weak_topics_improved: []
      })
      .select()
      .single()

    if (sessionError) {
      console.error('[CramMode] Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create cram session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      plan: cramPlan,
      message: 'Cram mode started successfully'
    })
  } catch (error) {
    console.error('[CramMode] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to start cram mode' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cram-mode
 * Get active cram session for user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get active cram session
    const { data: session, error: sessionError } = await supabase
      .from('cram_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        active: false,
        session: null
      })
    }

    // Regenerate plan from session data
    const plan = generateCramPlan({
      examDate: new Date(session.exam_date),
      weakTopics: session.focus_topics || [],
      allTopics: session.focus_topics || [], // Use focus topics as all topics if not stored
      documentsIds: [],
      dailyAvailableMinutes: 90,
      examId: session.exam_id,
      studyPlanId: session.study_plan_id
    })

    return NextResponse.json({
      active: true,
      session,
      plan,
      progress: {
        totalMinutesStudied: session.total_minutes_studied,
        flashcardsReviewed: session.flashcards_reviewed,
        miniExamsCompleted: session.mini_exams_completed,
        weakTopicsImproved: session.weak_topics_improved
      }
    })
  } catch (error) {
    console.error('[CramMode] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get cram session' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cram-mode
 * Update cram session progress
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      sessionId,
      minutesStudied,
      flashcardsReviewed,
      miniExamCompleted,
      topicImproved,
      markComplete
    } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('cram_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Cram session not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (minutesStudied) {
      updates.total_minutes_studied = (session.total_minutes_studied || 0) + minutesStudied
    }

    if (flashcardsReviewed) {
      updates.flashcards_reviewed = (session.flashcards_reviewed || 0) + flashcardsReviewed
    }

    if (miniExamCompleted) {
      updates.mini_exams_completed = (session.mini_exams_completed || 0) + 1
    }

    if (topicImproved) {
      const currentTopics = session.weak_topics_improved || []
      if (!currentTopics.includes(topicImproved)) {
        updates.weak_topics_improved = [...currentTopics, topicImproved]
      }
    }

    // Update daily progress
    const today = new Date().toISOString().split('T')[0]
    const dailyProgress = session.daily_progress || {}
    if (!dailyProgress[today]) {
      dailyProgress[today] = {
        minutesStudied: 0,
        sessionsCompleted: 0
      }
    }
    if (minutesStudied) {
      dailyProgress[today].minutesStudied += minutesStudied
      dailyProgress[today].sessionsCompleted += 1
    }
    updates.daily_progress = dailyProgress

    if (markComplete) {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('cram_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('[CramMode] Error updating session:', updateError)
      return NextResponse.json(
        { error: 'Failed to update cram session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session: updatedSession,
      message: 'Progress updated successfully'
    })
  } catch (error) {
    console.error('[CramMode] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update cram session' },
      { status: 500 }
    )
  }
}
