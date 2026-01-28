/**
 * Blended Learning Style API
 *
 * GET - Get user's blended learning style scores (quiz + behavioral)
 * POST - Calculate and store blended scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateBehavioralScores,
  calculateBlendedScores,
  checkStyleDivergence,
  type ModeEngagement,
  type QuizScores,
} from '@/lib/behavioral-learning/style-inference'
import type { LearningStyle } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, learning_style')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get learning profile (quiz scores)
    const { data: learningProfile, error: learningError } = await supabase
      .from('learning_profiles')
      .select('visual_score, auditory_score, kinesthetic_score, reading_writing_score, dominant_style, blended_visual, blended_auditory, blended_kinesthetic, blended_reading_writing, blended_dominant_style, blend_ratio')
      .eq('user_id', userProfile.id)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single()

    // Get behavioral scores
    const { data: behaviorScores } = await supabase
      .from('user_behavior_scores')
      .select('*')
      .eq('user_id', userProfile.id)
      .single()

    // If no learning profile exists, return behavioral-only or defaults
    if (!learningProfile) {
      const defaultScores = {
        visual: 50,
        auditory: 50,
        kinesthetic: 50,
        readingWriting: 50,
        dominantStyle: 'mixed' as LearningStyle,
        blendRatio: 0,
      }

      return NextResponse.json({
        quizScores: null,
        behavioralScores: behaviorScores
          ? {
              visual: behaviorScores.behavioral_visual,
              auditory: behaviorScores.behavioral_auditory,
              kinesthetic: behaviorScores.behavioral_kinesthetic,
              readingWriting: behaviorScores.behavioral_reading_writing,
              confidence: parseFloat(behaviorScores.behavioral_confidence) || 0,
              dominantStyle: behaviorScores.behavioral_dominant_style || 'mixed',
              totalSessions: behaviorScores.total_sessions || 0,
            }
          : null,
        blendedScores: defaultScores,
        divergence: null,
        hasQuizData: false,
        hasBehavioralData: !!behaviorScores,
      })
    }

    const quizScores: QuizScores = {
      visual: learningProfile.visual_score,
      auditory: learningProfile.auditory_score,
      kinesthetic: learningProfile.kinesthetic_score,
      readingWriting: learningProfile.reading_writing_score,
    }

    // If we have stored blended scores, use those
    if (learningProfile.blended_visual !== null) {
      return NextResponse.json({
        quizScores,
        behavioralScores: behaviorScores
          ? {
              visual: behaviorScores.behavioral_visual,
              auditory: behaviorScores.behavioral_auditory,
              kinesthetic: behaviorScores.behavioral_kinesthetic,
              readingWriting: behaviorScores.behavioral_reading_writing,
              confidence: parseFloat(behaviorScores.behavioral_confidence) || 0,
              dominantStyle: behaviorScores.behavioral_dominant_style || 'mixed',
              totalSessions: behaviorScores.total_sessions || 0,
            }
          : null,
        blendedScores: {
          visual: learningProfile.blended_visual,
          auditory: learningProfile.blended_auditory,
          kinesthetic: learningProfile.blended_kinesthetic,
          readingWriting: learningProfile.blended_reading_writing,
          dominantStyle: learningProfile.blended_dominant_style || learningProfile.dominant_style,
          blendRatio: parseFloat(learningProfile.blend_ratio) || 0,
        },
        divergence: behaviorScores
          ? checkStyleDivergence(
              learningProfile.dominant_style as LearningStyle,
              {
                visual: behaviorScores.behavioral_visual,
                auditory: behaviorScores.behavioral_auditory,
                kinesthetic: behaviorScores.behavioral_kinesthetic,
                readingWriting: behaviorScores.behavioral_reading_writing,
                confidence: parseFloat(behaviorScores.behavioral_confidence) || 0,
                dominantStyle: behaviorScores.behavioral_dominant_style || 'mixed',
                totalSessions: behaviorScores.total_sessions || 0,
              }
            )
          : null,
        hasQuizData: true,
        hasBehavioralData: !!behaviorScores,
      })
    }

    // Calculate blended scores on the fly if not stored
    if (behaviorScores) {
      const behavioralScoresObj = {
        visual: behaviorScores.behavioral_visual,
        auditory: behaviorScores.behavioral_auditory,
        kinesthetic: behaviorScores.behavioral_kinesthetic,
        readingWriting: behaviorScores.behavioral_reading_writing,
        confidence: parseFloat(behaviorScores.behavioral_confidence) || 0,
        dominantStyle: (behaviorScores.behavioral_dominant_style || 'mixed') as LearningStyle,
        totalSessions: behaviorScores.total_sessions || 0,
      }

      const blendedScores = calculateBlendedScores(quizScores, behavioralScoresObj)
      const divergence = checkStyleDivergence(
        learningProfile.dominant_style as LearningStyle,
        behavioralScoresObj
      )

      return NextResponse.json({
        quizScores,
        behavioralScores: behavioralScoresObj,
        blendedScores,
        divergence,
        hasQuizData: true,
        hasBehavioralData: true,
      })
    }

    // Only quiz data, no behavioral
    return NextResponse.json({
      quizScores,
      behavioralScores: null,
      blendedScores: {
        visual: quizScores.visual,
        auditory: quizScores.auditory,
        kinesthetic: quizScores.kinesthetic,
        readingWriting: quizScores.readingWriting,
        dominantStyle: learningProfile.dominant_style as LearningStyle,
        blendRatio: 0,
      },
      divergence: null,
      hasQuizData: true,
      hasBehavioralData: false,
    })
  } catch (error) {
    console.error('[BlendedAPI] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Calculate and store blended scores
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get learning profile (quiz scores)
    const { data: learningProfile, error: learningError } = await supabase
      .from('learning_profiles')
      .select('id, visual_score, auditory_score, kinesthetic_score, reading_writing_score, dominant_style')
      .eq('user_id', userProfile.id)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single()

    if (learningError || !learningProfile) {
      return NextResponse.json(
        { error: 'No quiz data found. Complete the learning style assessment first.' },
        { status: 400 }
      )
    }

    // Fetch mode selection events and calculate behavioral scores
    const { data: events, error: eventsError } = await supabase
      .from('mode_selection_events')
      .select('mode, duration_seconds, action_completed')
      .eq('user_id', userProfile.id)

    if (eventsError) {
      console.error('[BlendedAPI] Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch behavioral data' }, { status: 500 })
    }

    // Aggregate events
    const modeEngagement: Record<string, ModeEngagement> = {}
    for (const event of events || []) {
      if (!modeEngagement[event.mode]) {
        modeEngagement[event.mode] = { sessions: 0, totalSeconds: 0, completedActions: 0 }
      }
      modeEngagement[event.mode].sessions++
      modeEngagement[event.mode].totalSeconds += event.duration_seconds || 0
      if (event.action_completed) {
        modeEngagement[event.mode].completedActions++
      }
    }

    // Calculate behavioral scores
    const behavioralScores = calculateBehavioralScores(modeEngagement)

    // Update/insert behavioral scores
    await supabase
      .from('user_behavior_scores')
      .upsert(
        {
          user_id: userProfile.id,
          behavioral_visual: behavioralScores.visual,
          behavioral_auditory: behavioralScores.auditory,
          behavioral_kinesthetic: behavioralScores.kinesthetic,
          behavioral_reading_writing: behavioralScores.readingWriting,
          behavioral_confidence: behavioralScores.confidence,
          behavioral_dominant_style: behavioralScores.dominantStyle,
          mode_engagement: modeEngagement,
          total_sessions: behavioralScores.totalSessions,
          last_calculated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    // Calculate blended scores
    const quizScores: QuizScores = {
      visual: learningProfile.visual_score,
      auditory: learningProfile.auditory_score,
      kinesthetic: learningProfile.kinesthetic_score,
      readingWriting: learningProfile.reading_writing_score,
    }

    const blendedScores = calculateBlendedScores(quizScores, behavioralScores)

    // Update learning profile with blended scores
    const { error: updateError } = await supabase
      .from('learning_profiles')
      .update({
        blended_visual: blendedScores.visual,
        blended_auditory: blendedScores.auditory,
        blended_kinesthetic: blendedScores.kinesthetic,
        blended_reading_writing: blendedScores.readingWriting,
        blended_dominant_style: blendedScores.dominantStyle,
        blend_ratio: blendedScores.blendRatio,
      })
      .eq('id', learningProfile.id)

    if (updateError) {
      console.error('[BlendedAPI] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save blended scores' }, { status: 500 })
    }

    // Check for style divergence
    const divergence = checkStyleDivergence(
      learningProfile.dominant_style as LearningStyle,
      behavioralScores
    )

    return NextResponse.json({
      quizScores,
      behavioralScores,
      blendedScores,
      divergence,
      calculated: true,
    })
  } catch (error) {
    console.error('[BlendedAPI] POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
