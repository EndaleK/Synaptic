// API Route: /api/user/stats
// Returns aggregated study statistics for the user (for Study Wrapped feature)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, current_streak, flashcards_reviewed, total_study_time')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get flashcards reviewed count
    const { count: flashcardsCount } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .not('last_reviewed', 'is', null)

    // Get exams completed count
    const { count: examsCount } = await supabase
      .from('exam_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    // Get achievements unlocked count
    const { count: achievementsCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    // Get podcasts listened count
    const { count: podcastsCount } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'completed')

    // Get most studied subject (from documents)
    const { data: topSubjectData } = await supabase
      .from('documents')
      .select('subject')
      .eq('user_id', profile.id)
      .not('subject', 'is', null)
      .limit(100)

    // Count subject occurrences
    const subjectCounts: Record<string, number> = {}
    topSubjectData?.forEach(doc => {
      if (doc.subject) {
        subjectCounts[doc.subject] = (subjectCounts[doc.subject] || 0) + 1
      }
    })
    const topSubject = Object.entries(subjectCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0]

    // Calculate study hours (from total_study_time in minutes)
    const hoursStudied = Math.round((profile.total_study_time || 0) / 60)

    // Calculate percentile (simplified - based on streak)
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    const { count: usersWithLowerStreak } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .lt('current_streak', profile.current_streak || 0)

    const percentile = totalUsers && totalUsers > 0
      ? Math.round((usersWithLowerStreak || 0) / totalUsers * 100)
      : undefined

    const stats = {
      streak: profile.current_streak || 0,
      flashcardsReviewed: flashcardsCount || profile.flashcards_reviewed || 0,
      hoursStudied: hoursStudied || 0,
      examsCompleted: examsCount || 0,
      achievementsUnlocked: achievementsCount || 0,
      podcastsListened: podcastsCount || 0,
      topSubject: topSubject || undefined,
      percentile: percentile
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('GET /api/user/stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
