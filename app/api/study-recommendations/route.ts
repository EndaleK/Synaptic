/**
 * Study Recommendations API
 *
 * GET /api/study-recommendations
 * Returns personalized "what to study next" recommendations
 *
 * Query params:
 * - limit: number (default 5, max 10)
 *
 * Response:
 * {
 *   recommendations: StudyRecommendation[],
 *   stats: { flashcardsDue, sessionsToday, weakTopicsCount, currentStreak }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  getStudyRecommendations,
  type LearningStyle,
} from '@/lib/smart-recommendations'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '5', 10), 1), 10)

    // Get user profile from Supabase
    const supabase = await createClient()
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, learning_style')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error(
        '[StudyRecommendations] Error fetching user profile:',
        profileError
      )
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get learning profile for more detailed learning style info
    let learningStyle: LearningStyle = userProfile.learning_style || 'mixed'

    const { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('dominant_style')
      .eq('user_id', userProfile.id)
      .single()

    if (learningProfile?.dominant_style) {
      learningStyle = learningProfile.dominant_style as LearningStyle
    }

    // Get recommendations
    const result = await getStudyRecommendations(userId, userProfile.id, {
      limit,
      learningStyle,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[StudyRecommendations] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
