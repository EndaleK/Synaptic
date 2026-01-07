/**
 * API Route: /api/study-guide/prepare
 *
 * POST: Prepare today's study content for a plan
 *       Triggers generation of flashcards, mindmaps, podcasts, and quizzes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import type { StudyGuideTopic } from '@/lib/supabase/types'
import { generateGuideDayQuiz, getGuideDayQuiz } from '@/lib/session-exam-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for content generation

/**
 * POST /api/study-guide/prepare
 * Prepare today's study content
 *
 * Body:
 * - planId: string - The study plan ID
 * - date?: string - Optional date (defaults to today)
 * - contentTypes?: string[] - Optional content types to generate (defaults to all)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { planId, date, contentTypes } = body

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

    const targetDate = date || new Date().toISOString().split('T')[0]
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

    // Verify plan ownership
    const { data: plan } = await supabase
      .from('study_plans')
      .select('id, title, start_date')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (!plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    // Get sessions for the target date
    const { data: sessions } = await supabase
      .from('study_plan_sessions')
      .select('*')
      .eq('plan_id', planId)
      .eq('scheduled_date', targetDate)

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'No study sessions are scheduled for today. Please check your study plan schedule or add sessions for this date.' },
        { status: 404 }
      )
    }

    // Calculate week number
    const startDate = new Date(plan.start_date)
    const targetDateObj = new Date(targetDate)
    const msPerDay = 24 * 60 * 60 * 1000
    const daysDiff = Math.floor((targetDateObj.getTime() - startDate.getTime()) / msPerDay)
    const weekNumber = Math.floor(daysDiff / 7) + 1
    const dayOfWeek = targetDateObj.getDay()

    // Build topics from sessions
    const topics: StudyGuideTopic[] = sessions.map(session => ({
      topicId: session.id,
      title: session.topic || 'Study Session',
      documentId: session.document_id || undefined,
      documentName: session.document_name || undefined,
      pageRange: session.topic_pages ? {
        start: session.topic_pages.startPage || 0,
        end: session.topic_pages.endPage || 0,
      } : undefined,
      estimatedMinutes: session.estimated_minutes || 30,
    }))

    const estimatedTotalMinutes = sessions.reduce(
      (sum, s) => sum + (s.estimated_minutes || 30),
      0
    )

    // Check if guide day already exists
    const { data: existingDay } = await supabase
      .from('study_guide_days')
      .select('id, status')
      .eq('plan_id', planId)
      .eq('date', targetDate)
      .single()

    let guideDayId: string

    if (existingDay) {
      // Update existing day
      const { error: updateError } = await supabase
        .from('study_guide_days')
        .update({
          status: 'generating',
          topics,
          estimated_total_minutes: estimatedTotalMinutes,
        })
        .eq('id', existingDay.id)

      if (updateError) {
        console.error('[StudyGuide] Failed to update guide day:', updateError)
        return NextResponse.json(
          { error: 'Failed to update guide day' },
          { status: 500 }
        )
      }

      guideDayId = existingDay.id
    } else {
      // Create new guide day
      const { data: newDay, error: createError } = await supabase
        .from('study_guide_days')
        .insert({
          plan_id: planId,
          user_id: profile.id,
          date: targetDate,
          week_number: weekNumber,
          day_of_week: dayOfWeek,
          topics,
          status: 'generating',
          estimated_total_minutes: estimatedTotalMinutes,
          has_flashcards: false,
          has_podcast: false,
          has_mindmap: false,
          has_daily_quiz: sessions.some(s => s.has_daily_quiz),
          has_chat: true,
        })
        .select('id')
        .single()

      if (createError || !newDay) {
        console.error('[StudyGuide] Failed to create guide day:', createError)
        return NextResponse.json(
          { error: 'Failed to create guide day' },
          { status: 500 }
        )
      }

      guideDayId = newDay.id
    }

    // Determine which content types to generate
    const typesToGenerate = contentTypes || ['flashcards', 'mindmap', 'podcast', 'daily_quiz']

    // Queue content generation for each type
    for (const contentType of typesToGenerate) {
      // Check if already queued
      const { data: existingQueue } = await supabase
        .from('content_generation_queue')
        .select('id')
        .eq('guide_day_id', guideDayId)
        .eq('content_type', contentType)
        .single()

      if (!existingQueue) {
        // Get the first session's document for content generation
        const primarySession = sessions[0]

        await supabase
          .from('content_generation_queue')
          .insert({
            user_id: profile.id,
            plan_id: planId,
            guide_day_id: guideDayId,
            session_id: primarySession.id,
            content_type: contentType,
            document_id: primarySession.document_id,
            topic_focus: primarySession.topic,
            topic_pages: primarySession.topic_pages,
            priority: contentType === 'flashcards' ? 1 : contentType === 'daily_quiz' ? 2 : 5,
            status: 'pending',
          })
      }
    }

    // Mark the guide day as having started generation
    await supabase
      .from('study_guide_days')
      .update({ generated_at: new Date().toISOString() })
      .eq('id', guideDayId)

    // Generate daily quiz synchronously (it's quick and important)
    let dailyQuizGenerated = false
    if (typesToGenerate.includes('daily_quiz')) {
      try {
        // Check if quiz already exists
        const existingQuiz = await getGuideDayQuiz(guideDayId, profile.id.toString())

        if (!existingQuiz) {
          // Get document ID from sessions
          const documentId = sessions.find(s => s.document_id)?.document_id

          if (documentId) {
            // Prepare topics array for quiz generation
            const quizTopics = topics.map(t => ({
              title: t.title,
              pageRange: t.pageRange ? {
                start: t.pageRange.start,
                end: t.pageRange.end,
              } : undefined,
            }))

            await generateGuideDayQuiz({
              guideDayId,
              planId,
              userId: profile.id.toString(),
              documentId,
              topics: quizTopics,
              questionCount: Math.min(topics.length * 3, 10), // 3 questions per topic, max 10
            })

            dailyQuizGenerated = true

            // Update queue status
            await supabase
              .from('content_generation_queue')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('guide_day_id', guideDayId)
              .eq('content_type', 'daily_quiz')
          }
        } else {
          dailyQuizGenerated = true
        }
      } catch (quizError) {
        console.error('[StudyGuide] Daily quiz generation failed:', quizError)
        // Update queue status to failed
        await supabase
          .from('content_generation_queue')
          .update({
            status: 'failed',
            error_message: quizError instanceof Error ? quizError.message : 'Unknown error'
          })
          .eq('guide_day_id', guideDayId)
          .eq('content_type', 'daily_quiz')
      }
    }

    // Update guide day status based on what was generated
    const newStatus = dailyQuizGenerated ? 'partial' : 'generating'
    await supabase
      .from('study_guide_days')
      .update({ status: newStatus })
      .eq('id', guideDayId)

    return NextResponse.json({
      success: true,
      guideDayId,
      date: targetDate,
      contentTypesQueued: typesToGenerate,
      dailyQuizGenerated,
      message: dailyQuizGenerated
        ? 'Daily quiz ready. Other content being prepared.'
        : 'Content generation started',
    })
  } catch (error) {
    console.error('[StudyGuide] Prepare error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare study content' },
      { status: 500 }
    )
  }
}
