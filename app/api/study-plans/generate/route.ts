/**
 * API Route: /api/study-plans/generate
 *
 * POST: Generate and optionally save a study plan from syllabus-extracted topics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateStudyPlan,
  StudyPlanInput,
  TopicInput,
  GeneratedStudyPlan
} from '@/lib/study-plan-optimizer'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RequestBody {
  examDate: string
  examName: string
  topics: TopicInput[]
  dailyTargetHours?: number
  startDate?: string
  includeWeekends?: boolean
  documentId?: string
  save?: boolean
  existingMasteryLevels?: Record<string, number>
}

/**
 * POST /api/study-plans/generate
 * Generate a study plan from syllabus-extracted topics
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RequestBody = await req.json()
    const {
      examDate,
      examName,
      topics,
      dailyTargetHours = 2,
      startDate = new Date().toISOString().split('T')[0],
      includeWeekends = true,
      documentId,
      save = false,
      existingMasteryLevels = {}
    } = body

    // Validate required fields
    if (!examDate) {
      return NextResponse.json(
        { error: 'examDate is required' },
        { status: 400 }
      )
    }

    if (!examName) {
      return NextResponse.json(
        { error: 'examName is required' },
        { status: 400 }
      )
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'At least one topic is required' },
        { status: 400 }
      )
    }

    // Validate exam date is in the future
    const examDateObj = new Date(examDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (examDateObj <= today) {
      return NextResponse.json(
        { error: 'Exam date must be in the future' },
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

    // Get existing mastery levels from flashcard performance if not provided
    let masteryLevels = existingMasteryLevels
    if (Object.keys(masteryLevels).length === 0) {
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('topic, times_reviewed, times_correct')
        .eq('user_id', profile.id)

      if (flashcards && flashcards.length > 0) {
        const topicStats = new Map<string, { correct: number; reviewed: number }>()

        flashcards.forEach(card => {
          const topic = card.topic || 'General'
          const existing = topicStats.get(topic) || { correct: 0, reviewed: 0 }
          existing.correct += card.times_correct || 0
          existing.reviewed += card.times_reviewed || 0
          topicStats.set(topic, existing)
        })

        topicStats.forEach((stats, topic) => {
          if (stats.reviewed > 0) {
            masteryLevels[topic] = Math.round((stats.correct / stats.reviewed) * 100)
          }
        })
      }
    }

    console.log(
      `[StudyPlans/Generate] Creating plan for exam "${examName}" on ${examDate} with ${topics.length} topics`
    )

    // Generate the study plan using the optimizer
    const planInput: StudyPlanInput = {
      examDate,
      examName,
      topics: topics.map(t => ({
        name: t.name,
        weight: t.weight || 50,
        estimatedHours: t.estimatedHours || 2,
        prerequisites: t.prerequisites || [],
        documentIds: t.documentIds || (documentId ? [documentId] : [])
      })),
      dailyTargetHours,
      includeWeekends,
      startDate,
      existingMasteryLevels: masteryLevels
    }

    const generatedPlan = generateStudyPlan(planInput)

    console.log(
      `[StudyPlans/Generate] Plan generated: ${generatedPlan.sessions.length} sessions, ${generatedPlan.totalStudyHours}h total`
    )

    // Transform to match expected format
    const plan = {
      id: generatedPlan.id,
      title: generatedPlan.examName,
      examDate: generatedPlan.examDate,
      examTitle: generatedPlan.examName,
      totalEstimatedHours: generatedPlan.totalStudyHours,
      sessionsTotal: generatedPlan.sessions.length,
      startDate: generatedPlan.startDate,
      totalDays: generatedPlan.totalDays,
      sessions: generatedPlan.sessions.map(session => ({
        id: session.id,
        scheduledDate: session.date,
        dayOfWeek: session.dayOfWeek,
        mode: session.sessionType,
        sessionType: session.sessionType,
        estimatedMinutes: session.totalMinutes,
        isBufferDay: session.isBufferDay,
        topics: session.topics.map(t => ({
          name: t.name,
          minutes: t.minutes,
          activityType: t.activityType,
          documentId: t.documentId
        }))
      })),
      topicSchedule: generatedPlan.topicSchedule,
      recommendations: generatedPlan.recommendations,
      documents: documentId ? [{ documentId, documentName: 'Syllabus' }] : []
    }

    // Save to database if requested
    if (save) {
      const { data: savedPlan, error: saveError } = await supabase
        .from('study_plans')
        .insert({
          user_id: profile.id,
          title: plan.title,
          description: `Study plan for ${plan.examTitle}`,
          exam_date: plan.examDate,
          exam_title: plan.examTitle,
          documents: documentId ? [documentId] : [],
          status: 'active',
          total_estimated_hours: plan.totalEstimatedHours,
          hours_completed: 0,
          daily_target_hours: dailyTargetHours,
          start_date: plan.startDate,
          sessions_total: plan.sessionsTotal,
          sessions_completed: 0,
          plan_data: {
            sessions: plan.sessions,
            topicSchedule: plan.topicSchedule,
            recommendations: plan.recommendations,
            generatedAt: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (saveError) {
        console.error('[StudyPlans/Generate] Error saving plan:', saveError)
        // Return the plan anyway, just not saved
        return NextResponse.json({
          plan,
          saved: false,
          error: 'Failed to save plan to database'
        })
      }

      console.log(`[StudyPlans/Generate] Plan saved: ${savedPlan.id}`)

      // Create study sessions for each planned session
      const sessionRecords = plan.sessions.map(session => ({
        study_plan_id: savedPlan.id,
        user_id: profile.id,
        scheduled_date: session.scheduledDate,
        session_type: session.sessionType,
        estimated_minutes: session.estimatedMinutes,
        topics: session.topics,
        status: 'scheduled',
        is_buffer_day: session.isBufferDay
      }))

      const { error: sessionsError } = await supabase
        .from('study_plan_sessions')
        .insert(sessionRecords)

      if (sessionsError) {
        console.error('[StudyPlans/Generate] Error saving sessions:', sessionsError)
      }

      return NextResponse.json({
        plan: {
          ...plan,
          id: savedPlan.id
        },
        saved: true
      })
    }

    // Return preview only
    return NextResponse.json({
      plan,
      saved: false,
      preview: true
    })
  } catch (error) {
    console.error('[StudyPlans/Generate] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate study plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
