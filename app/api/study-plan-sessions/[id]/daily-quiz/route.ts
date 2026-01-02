/**
 * API Route: /api/study-plan-sessions/[id]/daily-quiz
 *
 * GET: Get existing daily quiz for a session
 * POST: Generate a new daily quiz for a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyQuiz, getSessionQuiz } from '@/lib/session-exam-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for quiz generation

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study-plan-sessions/[id]/daily-quiz
 * Get existing daily quiz
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get existing quiz
    const quiz = await getSessionQuiz(sessionId, profile.id)

    if (!quiz) {
      return NextResponse.json({ error: 'No quiz found for this session' }, { status: 404 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('[DailyQuiz] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get daily quiz' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-plan-sessions/[id]/daily-quiz
 * Generate a new daily quiz
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('study_plan_sessions')
      .select(`
        *,
        study_plans(documents)
      `)
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if quiz already exists
    const existingQuiz = await getSessionQuiz(sessionId, profile.id)
    if (existingQuiz) {
      return NextResponse.json(existingQuiz)
    }

    // Get document ID
    const planDocs = session.study_plans?.documents as Array<{
      documentId: string
    }> | undefined
    const documentId = planDocs?.[0]?.documentId || session.document_id

    if (!documentId) {
      return NextResponse.json(
        { error: 'No document associated with session' },
        { status: 400 }
      )
    }

    // Parse request body for options
    let questionCount = 7
    try {
      const body = await req.json()
      if (body.questionCount) {
        questionCount = Math.min(Math.max(body.questionCount, 5), 15) // 5-15 questions
      }
    } catch {
      // Use defaults
    }

    // Generate quiz
    const quiz = await generateDailyQuiz({
      sessionId,
      userId: profile.id,
      documentId,
      topicFocus: session.topic || session.topics?.[0]?.name || 'General',
      topicPages: session.topic_pages,
      questionCount,
    })

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('[DailyQuiz] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily quiz' },
      { status: 500 }
    )
  }
}
