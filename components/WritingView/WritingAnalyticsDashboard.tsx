"use client"

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  Calendar,
  Zap,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface WritingAnalyticsProps {
  userId: string
  className?: string
}

interface AnalyticsData {
  totalWords: number
  totalEssays: number
  averageWordCount: number
  totalWritingTime: number
  streakDays: number
  thisWeekWords: number
  lastWeekWords: number
  aiUsageAverage: number
  completionRate: number
  recentActivity: Array<{
    date: string
    words: number
  }>
}

/**
 * Calculate consecutive days with writing activity
 */
function calculateStreakDays(
  essays: Array<{ created_at?: string; updated_at?: string }>,
  sessions: Array<{ started_at?: string }> | null
): number {
  // Collect all activity dates
  const activityDates = new Set<string>()

  essays.forEach(e => {
    if (e.created_at) activityDates.add(e.created_at.split('T')[0])
    if (e.updated_at) activityDates.add(e.updated_at.split('T')[0])
  })

  sessions?.forEach(s => {
    if (s.started_at) activityDates.add(s.started_at.split('T')[0])
  })

  if (activityDates.size === 0) return 0

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(activityDates).sort().reverse()

  // Check if there's activity today or yesterday (streak is still active)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0 // Streak is broken
  }

  // Count consecutive days
  let streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i - 1])
    const prevDate = new Date(sortedDates[i])
    const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / 86400000)

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export default function WritingAnalyticsDashboard({ userId, className }: WritingAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week')

  useEffect(() => {
    loadAnalytics()
  }, [userId, timeRange])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Get user's essays and writing sessions in parallel
      const [essaysResult, sessionsResult] = await Promise.all([
        supabase.from('essays').select('*').eq('user_id', userId),
        supabase.from('writing_sessions').select('duration_seconds, started_at').eq('user_id', userId)
      ])

      const essays = essaysResult.data
      const sessions = sessionsResult.data

      if (!essays) {
        setAnalytics(null)
        return
      }

      // Calculate analytics
      const totalWords = essays.reduce((sum, e) => sum + (e.word_count || 0), 0)
      const totalEssays = essays.length
      const averageWordCount = totalEssays > 0 ? Math.round(totalWords / totalEssays) : 0

      // AI usage average
      const aiUsageAverage = totalEssays > 0
        ? Math.round(essays.reduce((sum, e) => sum + (e.ai_contribution_percentage || 0), 0) / totalEssays)
        : 0

      // Completion rate (essays in publishing stage)
      const completedEssays = essays.filter(e => e.writing_stage === 'publishing').length
      const completionRate = totalEssays > 0 ? Math.round((completedEssays / totalEssays) * 100) : 0

      // Recent activity (last 7 days)
      const now = new Date()
      const recentActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]

        const wordsOnDate = essays
          .filter(e => e.created_at?.startsWith(dateStr))
          .reduce((sum, e) => sum + (e.word_count || 0), 0)

        return {
          date: dateStr,
          words: wordsOnDate
        }
      })

      // This week vs last week
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(thisWeekStart.getDate() - 7)

      const lastWeekStart = new Date(now)
      lastWeekStart.setDate(lastWeekStart.getDate() - 14)

      const thisWeekWords = essays
        .filter(e => new Date(e.created_at!) >= thisWeekStart)
        .reduce((sum, e) => sum + (e.word_count || 0), 0)

      const lastWeekWords = essays
        .filter(e => {
          const created = new Date(e.created_at!)
          return created >= lastWeekStart && created < thisWeekStart
        })
        .reduce((sum, e) => sum + (e.word_count || 0), 0)

      // Calculate total writing time from sessions (in minutes)
      const totalWritingTime = sessions
        ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60)
        : 0

      // Calculate streak days (consecutive days with essay activity)
      const streakDays = calculateStreakDays(essays, sessions)

      setAnalytics({
        totalWords,
        totalEssays,
        averageWordCount,
        totalWritingTime,
        streakDays,
        thisWeekWords,
        lastWeekWords,
        aiUsageAverage,
        completionRate,
        recentActivity
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className={cn("text-center p-8", className)}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          Start writing to see your analytics!
        </p>
      </div>
    )
  }

  const growthPercentage = analytics.lastWeekWords > 0
    ? Math.round(((analytics.thisWeekWords - analytics.lastWeekWords) / analytics.lastWeekWords) * 100)
    : analytics.thisWeekWords > 0 ? 100 : 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Writing Analytics
        </h3>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Words */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 opacity-80" />
            {growthPercentage !== 0 && (
              <span className={cn(
                "text-xs font-semibold px-2 py-1 rounded-full",
                growthPercentage > 0 ? "bg-green-500/30" : "bg-red-500/30"
              )}>
                {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
              </span>
            )}
          </div>
          <div className="text-2xl font-bold mb-1">{analytics.thisWeekWords.toLocaleString()}</div>
          <div className="text-sm opacity-80">Words This Week</div>
        </div>

        {/* Total Essays */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold mb-1">{analytics.totalEssays}</div>
          <div className="text-sm opacity-80">Total Essays</div>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold mb-1 flex items-center gap-1">
            {analytics.streakDays} 🔥
          </div>
          <div className="text-sm opacity-80">Day Streak</div>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold mb-1">{analytics.completionRate}%</div>
          <div className="text-sm opacity-80">Completion Rate</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Daily Writing Activity
        </h4>
        <div className="flex items-end justify-between gap-2 h-32">
          {analytics.recentActivity.map((day, index) => {
            const maxWords = Math.max(...analytics.recentActivity.map(d => d.words))
            const height = maxWords > 0 ? (day.words / maxWords) * 100 : 0

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden relative group">
                  <div
                    className="bg-gradient-to-t from-blue-600 to-blue-400 w-full transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-300"
                    style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {day.words} words
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Word Count */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.averageWordCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Word Count
              </div>
            </div>
          </div>
        </div>

        {/* AI Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              analytics.aiUsageAverage < 25
                ? "bg-green-100 dark:bg-green-900/30"
                : analytics.aiUsageAverage < 50
                ? "bg-amber-100 dark:bg-amber-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              <Zap className={cn(
                "w-5 h-5",
                analytics.aiUsageAverage < 25
                  ? "text-green-600 dark:text-green-400"
                  : analytics.aiUsageAverage < 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              )} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.aiUsageAverage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg. AI Usage
              </div>
            </div>
          </div>
        </div>

        {/* Total Words */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.totalWords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Words
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Insights & Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {growthPercentage > 20 && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Great progress! You've written {growthPercentage}% more this week compared to last week.</span>
            </li>
          )}
          {analytics.aiUsageAverage < 25 && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Excellent! Your AI usage is low ({analytics.aiUsageAverage}%), showing strong independent writing skills.</span>
            </li>
          )}
          {analytics.aiUsageAverage > 50 && (
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">!</span>
              <span>Consider reducing AI usage ({analytics.aiUsageAverage}%). Try writing more independently to strengthen your skills.</span>
            </li>
          )}
          {analytics.completionRate < 50 && analytics.totalEssays > 2 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">→</span>
              <span>Focus on completing essays. You have a {analytics.completionRate}% completion rate. Finishing essays builds confidence!</span>
            </li>
          )}
          {analytics.streakDays >= 7 && (
            <li className="flex items-start gap-2">
              <span className="text-orange-600 dark:text-orange-400">🔥</span>
              <span>Amazing {analytics.streakDays}-day streak! Consistent writing builds mastery.</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
