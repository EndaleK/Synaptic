import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { withMonitoring, trackApiMetric, addApiContext } from '@/lib/monitoring/api-monitor'
import { trackSupabaseQuery } from '@/lib/monitoring/supabase-monitor'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-statistics
 * Fetches comprehensive study statistics including streaks, session data, and flashcard reviews
 */
async function handleGetStudyStatistics(req: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Authenticate user
    const authResult = await auth()
    userId = authResult.userId
    if (!userId) {
      logger.warn('Unauthenticated study statistics request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'month' // week, month, year
    const timezoneOffset = parseInt(searchParams.get('timezoneOffset') || '0') // Timezone offset in minutes (e.g., -300 for EST)

    // Track request parameters
    trackApiMetric(`stats.range.${range}`, 1, 'none')

    // Add context for monitoring
    addApiContext('statistics_request', {
      range,
      timezone_offset: timezoneOffset
    })

    const supabase = await createClient()

    // Get user profile ID with error handling
    const { data: profile, error: profileError } = await trackSupabaseQuery(
      'SELECT',
      'user_profiles',
      () => supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId!)
        .single()
    )

    if (profileError) {
      logger.error('Failed to fetch user profile', profileError, { userId })
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userProfileId = profile.id

    // Get user preferences for goals with error handling
    const { data: preferences, error: preferencesError } = await trackSupabaseQuery(
      'SELECT',
      'user_study_preferences',
      () => supabase
        .from('user_study_preferences')
        .select('daily_study_goal_minutes, daily_flashcard_review_goal')
        .eq('user_id', userProfileId)
        .single()
    )

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      // Log error but continue with defaults - preferences are optional
      logger.warn('Failed to fetch user preferences, using defaults', preferencesError, { userId })
    }

    const dailyGoalMinutes = preferences?.daily_study_goal_minutes || 120

    /**
     * TIMEZONE HANDLING DOCUMENTATION
     *
     * Current implementation uses server local time for all date calculations.
     *
     * KNOWN LIMITATIONS:
     * - "Today" is determined by server timezone, not user's timezone
     * - Users in different timezones may see incorrect "today" date boundaries
     * - Streaks are calculated based on server time, which may be confusing for users
     *
     * RECOMMENDED IMPROVEMENTS (Future):
     * - Accept user timezone as query parameter (e.g., ?timezone=America/New_York)
     * - Use user timezone from profile settings stored in database
     * - Calculate all date boundaries in user's local timezone
     * - Store dates in ISO format with timezone info for accurate cross-timezone queries
     *
     * WORKAROUND (Current):
     * - All calculations are consistent within server timezone
     * - For most users on the same continent as server, difference is minimal
     * - Date stored in database (start_time, last_reviewed_at) should be in UTC
     */

    // Calculate date ranges (with timezone support)
    const now = new Date()
    // Apply timezone offset to get user's local "now"
    const userNow = new Date(now.getTime() + timezoneOffset * 60000)
    const todayStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()))
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    const monthStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), 1))

    // Determine heatmap range (inclusive of today, so we need days + 1)
    let heatmapDays = 30
    if (range === 'week') heatmapDays = 7
    if (range === 'year') heatmapDays = 365

    const heatmapStart = new Date(todayStart)
    heatmapStart.setUTCDate(heatmapStart.getUTCDate() - heatmapDays + 1) // +1 to include today

    // Fetch all completed study sessions
    const { data: sessions, error: sessionsError} = await trackSupabaseQuery(
      'SELECT',
      'study_sessions',
      () => supabase
        .from('study_sessions')
        .select('start_time, duration_minutes, completed, session_type')
        .eq('user_id', userProfileId)
        .eq('completed', true)
        .order('start_time', { ascending: true })
    )

    if (sessionsError) {
      logger.error('Failed to fetch study sessions', sessionsError, { userId })
      // If it's just an empty result, continue with empty array
      if (sessionsError.code !== 'PGRST116' && !sessionsError.message.includes('no rows')) {
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
      }
    }

    // Track number of sessions retrieved
    trackApiMetric('stats.sessions_retrieved', sessions?.length || 0, 'none')

    // Calculate streak (with timezone support)
    const sessionDates = new Set<string>()
    sessions?.forEach(session => {
      // Convert session start_time to user's timezone
      const sessionTime = new Date(session.start_time)
      const userSessionTime = new Date(sessionTime.getTime() + timezoneOffset * 60000)
      const dateStr = userSessionTime.toISOString().split('T')[0] // YYYY-MM-DD format
      sessionDates.add(dateStr)
    })

    // Sort dates chronologically (most recent first)
    const sortedDates = Array.from(sessionDates).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })

    let currentStreak = 0

    // Check if user studied today or yesterday to start streak count (using user's timezone)
    const todayStr = userNow.toISOString().split('T')[0]
    const yesterday = new Date(userNow)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
      // Calculate consecutive days backwards from today
      let checkDate = new Date(userNow)
      if (sortedDates[0] === yesterdayStr) {
        checkDate.setUTCDate(checkDate.getUTCDate() - 1)
      }

      // Count consecutive days
      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDateStr = checkDate.toISOString().split('T')[0]

        if (sessionDates.has(expectedDateStr)) {
          currentStreak++
          checkDate.setUTCDate(checkDate.getUTCDate() - 1)
        } else {
          break
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    sortedDates.reverse().forEach(dateStr => {
      const date = new Date(dateStr)
      if (lastDate) {
        const dayDiff = Math.floor((date.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
        if (dayDiff === 1) {
          tempStreak++
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }
      lastDate = date
    })
    longestStreak = Math.max(longestStreak, tempStreak)

    // Calculate session statistics
    const todaySessions = sessions?.filter(s =>
      new Date(s.start_time) >= todayStart
    ) || []

    const weekSessions = sessions?.filter(s =>
      new Date(s.start_time) >= weekStart
    ) || []

    const monthSessions = sessions?.filter(s =>
      new Date(s.start_time) >= monthStart
    ) || []

    const totalSessions = sessions?.length || 0
    const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
    const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const monthMinutes = monthSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const averageSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

    // Fetch flashcard statistics with error handling
    const { data: flashcards, error: flashcardsError } = await trackSupabaseQuery(
      'SELECT',
      'flashcards',
      () => supabase
        .from('flashcards')
        .select('times_reviewed, times_correct')
        .eq('user_id', userProfileId)
    )

    if (flashcardsError) {
      logger.error('Failed to fetch flashcard statistics', flashcardsError, { userId })
      // Continue with empty data rather than failing entirely
    }

    // Track flashcard metrics
    trackApiMetric('stats.flashcards_count', flashcards?.length || 0, 'none')

    const totalFlashcardsReviewed = flashcards?.reduce((sum, f) => sum + (f.times_reviewed || 0), 0) || 0
    const totalCorrect = flashcards?.reduce((sum, f) => sum + (f.times_correct || 0), 0) || 0
    const averageAccuracy = totalFlashcardsReviewed > 0
      ? Math.round((totalCorrect / totalFlashcardsReviewed) * 100)
      : 0

    // Track computed statistics
    trackApiMetric('stats.total_reviews', totalFlashcardsReviewed, 'none')
    trackApiMetric('stats.average_accuracy', averageAccuracy, 'none')

    // Flashcards reviewed today and this week (using count aggregation for performance)
    // Try review_queue first, fallback to flashcards table if review_queue doesn't exist
    let { count: flashcardsReviewedToday, error: reviewsTodayError } = await supabase
      .from('review_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfileId)
      .gte('last_reviewed_at', todayStart.toISOString())

    // If review_queue doesn't exist (table not found), use flashcards table instead
    if (reviewsTodayError && reviewsTodayError.code === '42P01') {
      logger.warn('review_queue table not found, using flashcards table for review stats', { userId })
      const result = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfileId)
        .gte('last_reviewed_at', todayStart.toISOString())
      flashcardsReviewedToday = result.count
      reviewsTodayError = result.error
    }

    if (reviewsTodayError && reviewsTodayError.code !== '42P01') {
      logger.error('Failed to fetch today\'s flashcard reviews', reviewsTodayError, { userId })
    }

    let { count: flashcardsReviewedWeek, error: reviewsWeekError } = await supabase
      .from('review_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfileId)
      .gte('last_reviewed_at', weekStart.toISOString())

    // If review_queue doesn't exist (table not found), use flashcards table instead
    if (reviewsWeekError && reviewsWeekError.code === '42P01') {
      const result = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfileId)
        .gte('last_reviewed_at', weekStart.toISOString())
      flashcardsReviewedWeek = result.count
      reviewsWeekError = result.error
    }

    if (reviewsWeekError && reviewsWeekError.code !== '42P01') {
      logger.error('Failed to fetch week\'s flashcard reviews', reviewsWeekError, { userId })
    }

    // Generate heatmap data (with timezone support)
    const heatmapData = []
    const sessionsByDate = new Map<string, { count: number; minutes: number }>()

    sessions?.forEach(session => {
      // Convert session time to user's timezone
      const sessionTime = new Date(session.start_time)
      const userSessionTime = new Date(sessionTime.getTime() + timezoneOffset * 60000)
      const date = userSessionTime.toISOString().split('T')[0]
      if (!sessionsByDate.has(date)) {
        sessionsByDate.set(date, { count: 0, minutes: 0 })
      }
      const data = sessionsByDate.get(date)!
      data.count++
      data.minutes += session.duration_minutes || 0
    })

    for (let i = 0; i < heatmapDays; i++) {
      const date = new Date(heatmapStart)
      date.setUTCDate(date.getUTCDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const data = sessionsByDate.get(dateStr) || { count: 0, minutes: 0 }

      heatmapData.push({
        date: dateStr,
        count: data.count,
        minutes: data.minutes
      })
    }

    // Calculate goal progress
    const dailyGoalProgress = dailyGoalMinutes > 0
      ? Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100)
      : 0

    const weeklyGoalMinutes = dailyGoalMinutes * 7
    const weeklyGoalProgress = weeklyGoalMinutes > 0
      ? Math.min(Math.round((weekMinutes / weeklyGoalMinutes) * 100), 100)
      : 0

    /**
     * LEARNING MODE BREAKDOWN DOCUMENTATION
     *
     * KNOWN LIMITATIONS:
     * - Time estimates are based on fixed averages per action type, not actual usage time
     * - Estimates may be inaccurate for users with different study patterns
     * - Does not account for time spent reviewing vs creating content
     * - No tracking of actual time spent in each mode
     *
     * CURRENT ESTIMATION MODEL:
     * - Flashcard generation: 5 minutes per action
     * - Chat interaction: 3 minutes per action
     * - Mind map generation: 8 minutes per action
     * - Podcast generation: 10 minutes per action
     *
     * RECOMMENDED IMPROVEMENTS (Future):
     * - Implement client-side time tracking for actual usage duration
     * - Store session start/end times per learning mode
     * - Use exponential moving average to personalize estimates per user
     * - Combine with study_sessions table for more accurate tracking
     */

    // Calculate mode breakdown from actual study sessions (IMPROVED: uses real data instead of estimates)
    const modeBreakdown: Record<string, number> = {
      flashcards: 0,
      chat: 0,
      mindmap: 0,
      podcast: 0,
      video: 0,
      writing: 0,
      exam: 0,
      other: 0
    }

    // Group sessions by type and sum duration
    if (sessions && sessions.length > 0) {
      sessions.forEach(session => {
        const minutes = session.duration_minutes || 0
        const type = session.session_type

        // Map session types to mode breakdown categories
        if (type === 'review') {
          modeBreakdown.flashcards += minutes
        } else if (type === 'chat') {
          modeBreakdown.chat += minutes
        } else if (type === 'mindmap') {
          modeBreakdown.mindmap += minutes
        } else if (type === 'podcast') {
          modeBreakdown.podcast += minutes
        } else if (type === 'video') {
          modeBreakdown.video += minutes
        } else if (type === 'writing') {
          modeBreakdown.writing += minutes
        } else if (type === 'exam') {
          modeBreakdown.exam += minutes
        } else {
          // pomodoro, custom, or other types
          modeBreakdown.other += minutes
        }
      })
    }

    // Remove zero-value entries for cleaner output
    Object.keys(modeBreakdown).forEach(key => {
      if (modeBreakdown[key] === 0) {
        delete modeBreakdown[key]
      }
    })

    const stats = {
      // Streak Data
      currentStreak,
      longestStreak,
      lastStudyDate: sortedDates[0] || null,

      // Session Data
      totalSessions,
      totalMinutes,
      averageSessionMinutes,
      todayMinutes,
      weekMinutes,
      monthMinutes,

      // Flashcard Data
      totalFlashcardsReviewed,
      flashcardsReviewedToday,
      flashcardsReviewedWeek,
      averageAccuracy,
      totalCardsCreated: flashcards?.length || 0,

      // Goals
      dailyGoalMinutes,
      dailyGoalProgress,
      weeklyGoalMinutes,
      weeklyGoalProgress,

      // Heatmap Data
      heatmapData,

      // Learning Mode Breakdown
      modeBreakdown: (modeBreakdown.flashcards + modeBreakdown.chat + modeBreakdown.mindmap + modeBreakdown.podcast) > 0
        ? modeBreakdown
        : undefined
    }

    const duration = Date.now() - startTime

    // Track overall statistics calculation time
    trackApiMetric('stats.calculation_time', duration, 'millisecond')
    trackApiMetric('stats.current_streak', currentStreak, 'none')

    logger.api('GET', '/api/study-statistics', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Study statistics error', error, { userId: userId || 'unknown' })
    logger.api('GET', '/api/study-statistics', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to fetch study statistics" },
      { status: 500 }
    )
  }
}

export const GET = withMonitoring(handleGetStudyStatistics, '/api/study-statistics')
