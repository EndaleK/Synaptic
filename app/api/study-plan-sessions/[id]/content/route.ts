/**
 * API Route: /api/study-plan-sessions/[id]/content
 *
 * GET: Get the generated content for a study session
 *
 * Returns all content (flashcards, podcast, mindmap, quiz) associated with the session.
 * Includes status for each content type so the UI can show loading states.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContent } from '@/lib/session-content-orchestrator'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study-plan-sessions/[id]/content
 * Get session content status and IDs
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

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('study_plan_sessions')
      .select('id, status, topic, topics, has_daily_quiz, has_weekly_exam')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get content from orchestrator
    const contentResult = await getSessionContent(sessionId, profile.id)

    // Fetch actual content details for ready items
    const contentDetails: Record<string, unknown> = {}

    if (contentResult.content.flashcards) {
      const { data: flashcardSet } = await supabase
        .from('flashcard_sets')
        .select('id, name, flashcard_count')
        .eq('id', contentResult.content.flashcards.id)
        .single()

      if (flashcardSet) {
        contentDetails.flashcards = {
          id: flashcardSet.id,
          name: flashcardSet.name,
          count: flashcardSet.flashcard_count,
        }
      }
    }

    if (contentResult.content.podcast) {
      const { data: podcast } = await supabase
        .from('podcasts')
        .select('id, title, duration, audio_url')
        .eq('id', contentResult.content.podcast.id)
        .single()

      if (podcast) {
        contentDetails.podcast = {
          id: podcast.id,
          title: podcast.title,
          duration: podcast.duration,
          audioUrl: podcast.audio_url,
        }
      }
    }

    if (contentResult.content.mindmap) {
      const { data: mindmap } = await supabase
        .from('mindmaps')
        .select('id, title, node_count')
        .eq('id', contentResult.content.mindmap.id)
        .single()

      if (mindmap) {
        contentDetails.mindmap = {
          id: mindmap.id,
          title: mindmap.title,
          nodeCount: mindmap.node_count,
        }
      }
    }

    if (contentResult.content.dailyQuiz) {
      const { data: exam } = await supabase
        .from('exams')
        .select('id, title, question_count')
        .eq('id', contentResult.content.dailyQuiz.id)
        .single()

      if (exam) {
        contentDetails.dailyQuiz = {
          id: exam.id,
          title: exam.title,
          questionCount: exam.question_count,
        }
      }
    }

    if (contentResult.content.weeklyExam) {
      const { data: exam } = await supabase
        .from('exams')
        .select('id, title, question_count')
        .eq('id', contentResult.content.weeklyExam.id)
        .single()

      if (exam) {
        contentDetails.weeklyExam = {
          id: exam.id,
          title: exam.title,
          questionCount: exam.question_count,
        }
      }
    }

    return NextResponse.json({
      sessionId,
      sessionStatus: session.status,
      topic: session.topic || session.topics?.[0]?.name,
      hasDailyQuiz: session.has_daily_quiz,
      hasWeeklyExam: session.has_weekly_exam,
      content: contentDetails,
      contentStatus: contentResult.status,
      allReady: contentResult.allReady,
    })
  } catch (error) {
    console.error('[SessionContent] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get session content' },
      { status: 500 }
    )
  }
}
