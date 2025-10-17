// API Route: /api/user/learning-profile
// Handles learning style assessment results

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserProfile,
  saveLearningProfile,
  updateUserProfile
} from '@/lib/supabase/user-profile'
import type { LearningStyle } from '@/lib/supabase/types'

/**
 * POST /api/user/learning-profile
 * Save learning style assessment results
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to get user_id
    const { profile, error: profileError } = await getUserProfile(userId)

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please create profile first.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      quiz_responses,
      visual_score,
      auditory_score,
      kinesthetic_score,
      reading_writing_score,
      dominant_style,
      learning_preferences
    } = body

    // Validate required fields
    if (
      !quiz_responses ||
      typeof visual_score !== 'number' ||
      typeof auditory_score !== 'number' ||
      typeof kinesthetic_score !== 'number' ||
      typeof reading_writing_score !== 'number' ||
      !dominant_style
    ) {
      return NextResponse.json(
        { error: 'Missing required assessment data' },
        { status: 400 }
      )
    }

    // Save learning profile
    const { learningProfile, error } = await saveLearningProfile({
      user_id: profile.id,
      quiz_responses,
      visual_score,
      auditory_score,
      kinesthetic_score,
      reading_writing_score,
      dominant_style: dominant_style as LearningStyle,
      learning_preferences
    })

    if (error) {
      return NextResponse.json(
        { error: `Failed to save learning profile: ${error}` },
        { status: 500 }
      )
    }

    // Update user profile with learning style
    await updateUserProfile(userId, {
      learning_style: dominant_style as LearningStyle
    })

    return NextResponse.json({
      learningProfile,
      message: 'Learning profile saved successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/user/learning-profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
