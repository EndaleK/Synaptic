import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Milestone {
  day: number
  topic: string
  activities?: string[]
  estimatedMinutes?: number
}

interface StudyGuideContent {
  studySchedule?: {
    timeline?: string
    milestones?: Milestone[]
  }
}

/**
 * POST /api/study-guide/sync-schedule
 * Syncs study guide milestones to the study planner calendar as sessions
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studyGuideId, studyPlanId, startDate } = body

    if (!studyGuideId || !studyPlanId) {
      return NextResponse.json(
        { error: 'studyGuideId and studyPlanId are required' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get the study guide
    const { data: studyGuide, error: guideError } = await supabaseAdmin
      .from('study_guides')
      .select('id, content, document_id, user_id, schedule_synced')
      .eq('id', studyGuideId)
      .eq('user_id', profile.id)
      .single()

    if (guideError || !studyGuide) {
      return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })
    }

    if (studyGuide.schedule_synced) {
      return NextResponse.json(
        { error: 'Study guide already synced', synced: true },
        { status: 400 }
      )
    }

    // Verify study plan exists and belongs to user
    const { data: studyPlan, error: planError } = await supabaseAdmin
      .from('study_plans')
      .select('id, title')
      .eq('id', studyPlanId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !studyPlan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    // Parse milestones from study guide content
    const content = studyGuide.content as StudyGuideContent
    const milestones = content?.studySchedule?.milestones || []

    if (milestones.length === 0) {
      return NextResponse.json(
        { error: 'No milestones found in study guide' },
        { status: 400 }
      )
    }

    // Calculate session dates
    const baseDate = startDate ? new Date(startDate) : new Date()
    const sessionsToCreate = milestones.map((milestone) => {
      const sessionDate = new Date(baseDate)
      sessionDate.setDate(baseDate.getDate() + milestone.day - 1)

      return {
        study_plan_id: studyPlanId,
        user_id: profile.id,
        document_id: studyGuide.document_id,
        study_guide_id: studyGuideId,
        scheduled_date: sessionDate.toISOString().split('T')[0],
        topic: milestone.topic,
        session_type: 'study',
        estimated_minutes: milestone.estimatedMinutes || 45,
        status: 'scheduled',
        mode: 'flashcards', // Default mode
        topics: milestone.activities?.map(a => ({ name: a, minutes: 10, activityType: 'study' })) || []
      }
    })

    // Insert sessions
    const { data: createdSessions, error: insertError } = await supabaseAdmin
      .from('study_plan_sessions')
      .insert(sessionsToCreate)
      .select('id')

    if (insertError) {
      console.error('Error creating sessions:', insertError)
      return NextResponse.json(
        { error: 'Failed to create sessions' },
        { status: 500 }
      )
    }

    // Mark study guide as synced
    const { error: updateError } = await supabaseAdmin
      .from('study_guides')
      .update({
        schedule_synced: true,
        synced_plan_id: studyPlanId,
        synced_at: new Date().toISOString()
      })
      .eq('id', studyGuideId)

    if (updateError) {
      console.error('Error updating study guide sync status:', updateError)
      // Don't fail the request, sessions were created
    }

    return NextResponse.json({
      success: true,
      sessionsCreated: createdSessions?.length || 0,
      studyGuideId,
      studyPlanId
    })
  } catch (error) {
    console.error('Error syncing study guide to schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
