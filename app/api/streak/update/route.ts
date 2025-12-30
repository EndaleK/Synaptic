import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Update user login streak
 * Called on dashboard load to track consecutive daily logins
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, last_login_date, current_streak, longest_streak')
      .eq('clerk_user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user profile for streak:', fetchError)
      // If specific columns don't exist, try without them
      if (fetchError.code === '42703' || fetchError.message?.includes('column')) {
        console.log('Streak columns may not exist, returning default values')
        return NextResponse.json({
          currentStreak: 0,
          longestStreak: 0,
          error: 'Streak columns not configured'
        })
      }
      return NextResponse.json({ error: 'User profile not found', details: fetchError.message }, { status: 404 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get today's date (UTC)
    const today = new Date().toISOString().split('T')[0]
    const lastLogin = profile.last_login_date

    let newStreak = profile.current_streak || 0
    let longestStreak = profile.longest_streak || 0

    // Calculate streak
    if (!lastLogin) {
      // First login ever
      newStreak = 1
    } else if (lastLogin === today) {
      // Already logged in today, no change
      return NextResponse.json({
        currentStreak: newStreak,
        longestStreak: longestStreak,
        alreadyUpdatedToday: true
      })
    } else {
      // Calculate days difference
      const lastDate = new Date(lastLogin)
      const todayDate = new Date(today)
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak = (profile.current_streak || 0) + 1
      } else {
        // Streak broken - reset to 1
        newStreak = 1
      }
    }

    // Update longest streak if current exceeds it
    if (newStreak > longestStreak) {
      longestStreak = newStreak
    }

    // Update database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        last_login_date: today,
        current_streak: newStreak,
        longest_streak: longestStreak,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating streak:', updateError)
      return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 })
    }

    return NextResponse.json({
      currentStreak: newStreak,
      longestStreak: longestStreak,
      alreadyUpdatedToday: false
    })

  } catch (error) {
    console.error('Streak update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
