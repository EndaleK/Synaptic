/**
 * API Route: /api/leaderboard
 *
 * GET: Get leaderboard data (weekly or all-time)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface LeaderboardEntry {
  rank: number
  user_id: number
  display_name: string
  avatar_url?: string
  points: number
  flashcards_reviewed: number
  exams_completed: number
  streak_days: number
  achievements_count: number
  is_current_user: boolean
}

/**
 * GET /api/leaderboard
 * Get leaderboard rankings
 *
 * Query params:
 * - type: 'weekly' | 'alltime' (default: 'weekly')
 * - limit: number (default: 10, max: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'weekly'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const supabase = await createClient()

    // Get current user's profile
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let leaderboardData: LeaderboardEntry[] = []
    let currentUserRank: LeaderboardEntry | null = null

    if (type === 'weekly') {
      // Get current week start (Sunday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Get weekly leaderboard
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('leaderboard_weekly')
        .select(`
          user_id,
          points,
          flashcards_reviewed,
          exams_completed,
          streak_days,
          user_profiles!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('week_start', weekStartStr)
        .order('points', { ascending: false })
        .limit(limit)

      if (weeklyError) {
        console.error('Weekly leaderboard error:', weeklyError)
      }

      // If no weekly data, use all-time as fallback
      if (!weeklyData || weeklyData.length === 0) {
        const { data: alltimeData } = await supabase
          .from('leaderboard_alltime')
          .select(`
            user_id,
            total_points,
            total_flashcards,
            total_exams,
            current_streak,
            achievements_count,
            user_profiles!inner (
              display_name,
              avatar_url
            )
          `)
          .order('total_points', { ascending: false })
          .limit(limit)

        leaderboardData = (alltimeData || []).map((entry: any, index) => ({
          rank: index + 1,
          user_id: entry.user_id,
          display_name: entry.user_profiles?.display_name || 'Anonymous Learner',
          avatar_url: entry.user_profiles?.avatar_url,
          points: entry.total_points || 0,
          flashcards_reviewed: entry.total_flashcards || 0,
          exams_completed: entry.total_exams || 0,
          streak_days: entry.current_streak || 0,
          achievements_count: entry.achievements_count || 0,
          is_current_user: entry.user_id === currentUserProfile.id
        }))
      } else {
        leaderboardData = weeklyData.map((entry: any, index) => ({
          rank: index + 1,
          user_id: entry.user_id,
          display_name: entry.user_profiles?.display_name || 'Anonymous Learner',
          avatar_url: entry.user_profiles?.avatar_url,
          points: entry.points || 0,
          flashcards_reviewed: entry.flashcards_reviewed || 0,
          exams_completed: entry.exams_completed || 0,
          streak_days: entry.streak_days || 0,
          achievements_count: 0,
          is_current_user: entry.user_id === currentUserProfile.id
        }))
      }
    } else {
      // All-time leaderboard
      const { data: alltimeData, error: alltimeError } = await supabase
        .from('leaderboard_alltime')
        .select(`
          user_id,
          total_points,
          total_flashcards,
          total_exams,
          longest_streak,
          current_streak,
          achievements_count,
          user_profiles!inner (
            display_name,
            avatar_url
          )
        `)
        .order('total_points', { ascending: false })
        .limit(limit)

      if (alltimeError) {
        console.error('All-time leaderboard error:', alltimeError)
      }

      leaderboardData = (alltimeData || []).map((entry: any, index) => ({
        rank: index + 1,
        user_id: entry.user_id,
        display_name: entry.user_profiles?.display_name || 'Anonymous Learner',
        avatar_url: entry.user_profiles?.avatar_url,
        points: entry.total_points || 0,
        flashcards_reviewed: entry.total_flashcards || 0,
        exams_completed: entry.total_exams || 0,
        streak_days: entry.longest_streak || 0,
        achievements_count: entry.achievements_count || 0,
        is_current_user: entry.user_id === currentUserProfile.id
      }))
    }

    // Find current user's rank if not in top list
    currentUserRank = leaderboardData.find(e => e.is_current_user) || null

    // If user not in top list, get their rank
    if (!currentUserRank) {
      // Get user's stats to show their position
      const { data: userStats } = await supabase
        .from('leaderboard_alltime')
        .select('total_points, total_flashcards, total_exams, current_streak, achievements_count')
        .eq('user_id', currentUserProfile.id)
        .single()

      if (userStats) {
        // Count how many users have more points
        const { count } = await supabase
          .from('leaderboard_alltime')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', userStats.total_points || 0)

        currentUserRank = {
          rank: (count || 0) + 1,
          user_id: currentUserProfile.id,
          display_name: 'You',
          points: userStats.total_points || 0,
          flashcards_reviewed: userStats.total_flashcards || 0,
          exams_completed: userStats.total_exams || 0,
          streak_days: userStats.current_streak || 0,
          achievements_count: userStats.achievements_count || 0,
          is_current_user: true
        }
      }
    }

    return NextResponse.json({
      type,
      leaderboard: leaderboardData,
      currentUserRank,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Leaderboard] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
