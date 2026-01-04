/**
 * API Route: /api/study-guide/status
 *
 * GET: Get the content generation status for a plan/date
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-guide/status
 * Get content generation status
 *
 * Query params:
 * - planId: string - The study plan ID
 * - date?: string - Optional date (defaults to today)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const planId = searchParams.get('planId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Validate UUID
    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
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

    // Get the guide day
    const { data: guideDay } = await supabase
      .from('study_guide_days')
      .select('*')
      .eq('plan_id', planId)
      .eq('date', date)
      .single()

    if (!guideDay) {
      return NextResponse.json({
        status: 'not_started',
        progress: 0,
        message: 'Content generation has not been started for this date',
      })
    }

    // Get generation queue items for this day
    const { data: queueItems } = await supabase
      .from('content_generation_queue')
      .select('*')
      .eq('guide_day_id', guideDay.id)
      .order('priority', { ascending: true })

    if (!queueItems || queueItems.length === 0) {
      // No items in queue, check guide day status
      if (guideDay.status === 'ready') {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          message: 'All content is ready',
          guideDay: {
            id: guideDay.id,
            date: guideDay.date,
            status: guideDay.status,
            hasFlashcards: guideDay.has_flashcards,
            hasPodcast: guideDay.has_podcast,
            hasMindmap: guideDay.has_mindmap,
            hasDailyQuiz: guideDay.has_daily_quiz,
          },
        })
      }

      return NextResponse.json({
        status: guideDay.status,
        progress: guideDay.status === 'pending' ? 0 : 50,
        message: 'Processing...',
      })
    }

    // Calculate progress from queue items
    const totalItems = queueItems.length
    const completedItems = queueItems.filter(q => q.status === 'completed').length
    const failedItems = queueItems.filter(q => q.status === 'failed').length
    const processingItems = queueItems.filter(q => q.status === 'processing').length

    const progress = Math.round((completedItems / totalItems) * 100)

    // Determine overall status
    let status: string
    let message: string

    if (failedItems > 0 && failedItems === totalItems) {
      status = 'failed'
      message = 'Content generation failed'
    } else if (completedItems === totalItems) {
      status = 'completed'
      message = 'All content is ready'

      // Update guide day status to ready
      await supabase
        .from('study_guide_days')
        .update({ status: 'ready' })
        .eq('id', guideDay.id)
    } else if (processingItems > 0) {
      status = 'processing'
      const currentItem = queueItems.find(q => q.status === 'processing')
      message = currentItem
        ? `Generating ${currentItem.content_type}...`
        : 'Processing content...'
    } else if (completedItems > 0) {
      status = 'partial'
      message = `${completedItems} of ${totalItems} content types ready`
    } else {
      status = 'pending'
      message = 'Waiting to start generation...'
    }

    // Build content statuses
    const contentStatuses = queueItems.map(item => ({
      contentType: item.content_type,
      status: item.status,
      resultId: item.result_id,
      error: item.error_message,
    }))

    return NextResponse.json({
      status,
      progress,
      message,
      contentStatuses,
      guideDay: {
        id: guideDay.id,
        date: guideDay.date,
        status: guideDay.status,
        hasFlashcards: guideDay.has_flashcards,
        hasPodcast: guideDay.has_podcast,
        hasMindmap: guideDay.has_mindmap,
        hasDailyQuiz: guideDay.has_daily_quiz,
        flashcardSetId: guideDay.flashcard_set_id,
        podcastId: guideDay.podcast_id,
        mindmapId: guideDay.mindmap_id,
        dailyQuizId: guideDay.daily_quiz_id,
      },
    })
  } catch (error) {
    console.error('[StudyGuide] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get generation status' },
      { status: 500 }
    )
  }
}
