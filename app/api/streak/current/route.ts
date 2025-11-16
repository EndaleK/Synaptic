import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get user's current streak information
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_login_date')
      .eq('clerk_user_id', userId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if streak is still valid (user logged in yesterday or today)
    const today = new Date().toISOString().split('T')[0]
    const lastLogin = profile.last_login_date

    let currentStreak = profile.current_streak || 0

    if (lastLogin) {
      const lastDate = new Date(lastLogin)
      const todayDate = new Date(today)
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      // If more than 1 day has passed, streak is broken
      if (daysDiff > 1) {
        currentStreak = 0
      }
    }

    return NextResponse.json({
      currentStreak,
      longestStreak: profile.longest_streak || 0,
      lastLoginDate: lastLogin
    })

  } catch (error) {
    console.error('Streak fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
