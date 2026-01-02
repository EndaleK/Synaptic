/**
 * API Route: /api/achievements
 *
 * GET: Get all achievements with user's progress and unlocked status
 * POST: Check and unlock achievements based on user activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { checkAchievements, getUserAchievements, type AchievementCategory } from '@/lib/achievements'

export const runtime = 'nodejs'

/**
 * GET /api/achievements
 * Get all achievements with user's progress
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get all achievements with user's progress
    const result = await getUserAchievements(profile.id)

    return NextResponse.json({
      unlocked: result.unlocked,
      inProgress: result.inProgress,
      locked: result.locked,
      totalPoints: result.totalPoints,
      unlockedCount: result.unlocked.length,
      totalCount: result.unlocked.length + result.inProgress.length + result.locked.length
    })
  } catch (error) {
    console.error('[Achievements] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/achievements
 * Check and unlock achievements based on activity
 *
 * Body: {
 *   category: 'streak' | 'flashcards' | 'exams' | 'documents' | 'podcasts' | 'social' | 'special',
 *   stats: {
 *     count?: number,
 *     streak?: number,
 *     score?: number,
 *     specialCondition?: string
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { category, stats } = body

    if (!category || !stats) {
      return NextResponse.json(
        { error: 'category and stats are required' },
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
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check and unlock achievements
    const newlyUnlocked = await checkAchievements(
      profile.id,
      category as AchievementCategory,
      stats
    )

    return NextResponse.json({
      newlyUnlocked,
      count: newlyUnlocked.length,
      message: newlyUnlocked.length > 0
        ? `Unlocked ${newlyUnlocked.length} new achievement(s)!`
        : 'No new achievements unlocked'
    })
  } catch (error) {
    console.error('[Achievements] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    )
  }
}
