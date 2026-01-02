/**
 * API Route: /api/study-plan-sessions/[id]/start
 *
 * POST: Start a study session and trigger lazy content generation
 *
 * This endpoint:
 * 1. Marks the session as 'in_progress'
 * 2. Checks for existing content
 * 3. Triggers lazy generation for missing content
 * 4. Uses SSE streaming to report progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateSessionContent,
  getSessionContent,
  getRecommendedContentTypes,
  type ContentType,
} from '@/lib/session-content-orchestrator'
import { createSSEStream, createSSEHeaders } from '@/lib/sse-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for content generation

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/study-plan-sessions/[id]/start
 * Start a session and generate content
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

    // Check if client wants SSE streaming
    const acceptSSE = req.headers.get('accept')?.includes('text/event-stream')

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, learning_style')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get session with plan info
    const { data: session, error: sessionError } = await supabase
      .from('study_plan_sessions')
      .select(`
        *,
        study_plans!inner(
          id,
          title,
          documents,
          learning_style
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session already completed' },
        { status: 400 }
      )
    }

    // Mark session as in_progress if not already
    if (session.status !== 'in_progress') {
      await supabase
        .from('study_plan_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
    }

    // Extract document info from plan
    const planDocs = session.study_plans?.documents as Array<{
      documentId: string
      documentName: string
    }> | undefined
    const documentId = planDocs?.[0]?.documentId || session.document_id

    if (!documentId) {
      return NextResponse.json(
        { error: 'No document associated with session' },
        { status: 400 }
      )
    }

    // Determine which content types to generate
    const learningStyle = session.study_plans?.learning_style || profile.learning_style || 'mixed'
    const recommendedTypes = getRecommendedContentTypes(
      learningStyle,
      session.has_daily_quiz ?? true
    )

    // Parse request body for custom content types
    let requestedTypes: ContentType[] | undefined
    try {
      const body = await req.json()
      if (body.contentTypes && Array.isArray(body.contentTypes)) {
        requestedTypes = body.contentTypes as ContentType[]
      }
    } catch {
      // No body or invalid JSON, use recommended types
    }

    const contentTypes = requestedTypes || recommendedTypes

    // Build session content request
    const topicFocus = session.topic || session.topics?.[0]?.name || 'General'
    const topicPages = session.topic_pages as { startPage?: number; endPage?: number } | undefined

    // If not SSE, just return current content status
    if (!acceptSSE) {
      const currentContent = await getSessionContent(sessionId, profile.id)

      // Check if all content is ready
      if (currentContent.allReady) {
        return NextResponse.json({
          sessionId,
          status: 'ready',
          content: currentContent.content,
          contentStatus: currentContent.status,
        })
      }

      // Trigger generation in background (without waiting)
      generateSessionContent({
        sessionId,
        userId: profile.id,
        documentId,
        topicFocus,
        topicPages,
        generateTypes: contentTypes,
      }).catch((err) => {
        console.error('[StartSession] Background generation error:', err)
      })

      return NextResponse.json({
        sessionId,
        status: 'generating',
        content: currentContent.content,
        contentStatus: currentContent.status,
        message: 'Content generation started. Poll /api/study-plan-sessions/[id]/content for updates.',
      })
    }

    // SSE streaming response for real-time progress
    const stream = createSSEStream(async (send) => {
      send({
        type: 'progress',
        progress: 0,
        message: 'Starting session...',
        data: { sessionId },
      })

      try {
        const result = await generateSessionContent(
          {
            sessionId,
            userId: profile.id,
            documentId,
            topicFocus,
            topicPages,
            generateTypes: contentTypes,
          },
          (type, status, message) => {
            // Calculate progress based on content types
            const completedCount = Object.values(result?.status || {}).filter(
              (s) => s === 'ready' || s === 'failed' || s === 'skipped'
            ).length
            const progress = Math.round((completedCount / contentTypes.length) * 100)

            send({
              type: 'progress',
              progress,
              message,
              data: { contentType: type, status },
            })
          }
        )

        send({
          type: 'complete',
          data: {
            sessionId,
            content: result.content,
            contentStatus: result.status,
            allReady: result.allReady,
          },
        })
      } catch (error) {
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Content generation failed',
        })
      }
    })

    return new Response(stream, { headers: createSSEHeaders() })
  } catch (error) {
    console.error('[StartSession] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    )
  }
}
