"use client"

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Clock,
  Brain,
  Target,
  Award,
  Calendar,
  Zap,
  Loader2,
  Sparkles,
  TrendingDown,
  AlertCircle
} from 'lucide-react'

interface StudyStats {
  // Streak Data
  currentStreak: number
  longestStreak: number
  lastStudyDate: string | null

  // Session Data
  totalSessions: number
  totalMinutes: number
  averageSessionMinutes: number
  todayMinutes: number
  weekMinutes: number
  monthMinutes: number

  // Flashcard Data
  totalFlashcardsReviewed: number
  flashcardsReviewedToday: number
  flashcardsReviewedWeek: number
  averageAccuracy: number
  totalCardsCreated: number

  // Goals
  dailyGoalMinutes: number
  dailyGoalProgress: number
  weeklyGoalMinutes: number
  weeklyGoalProgress: number

  // Heatmap Data
  heatmapData: Array<{
    date: string
    count: number
    minutes: number
  }>
}

export default function StudyStatistics() {
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    fetchStats()
  }, [timeRange])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/study-statistics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch study statistics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStreakColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count < 30) return 'bg-green-200 dark:bg-green-900'
    if (count < 60) return 'bg-green-400 dark:bg-green-700'
    if (count < 90) return 'bg-green-600 dark:bg-green-500'
    return 'bg-green-700 dark:bg-green-400'
  }

  const generateAIInsights = () => {
    if (!stats) return []

    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []

    // Streak insights
    if (stats.currentStreak >= 7) {
      insights.push({
        type: 'success',
        message: `Amazing! You've studied for ${stats.currentStreak} days straight. Consistency is key to long-term learning success.`
      })
    } else if (stats.currentStreak === 0 && stats.longestStreak > 0) {
      insights.push({
        type: 'warning',
        message: `Your streak ended at ${stats.longestStreak} days. Start studying today to build a new one!`
      })
    }

    // Daily goal insights
    const goalProgress = stats.dailyGoalProgress
    if (goalProgress >= 100) {
      insights.push({
        type: 'success',
        message: `You've hit your daily study goal! You're ${Math.round(goalProgress - 100)}% ahead of schedule.`
      })
    } else if (goalProgress >= 50 && goalProgress < 100) {
      insights.push({
        type: 'info',
        message: `You're ${Math.round(goalProgress)}% of the way to your daily goal. ${Math.round(stats.dailyGoalMinutes - stats.todayMinutes)} more minutes to reach it!`
      })
    } else if (goalProgress < 50 && goalProgress > 0) {
      insights.push({
        type: 'warning',
        message: `You've studied ${stats.todayMinutes} minutes today. Try to reach your ${stats.dailyGoalMinutes} minute goal!`
      })
    }

    // Flashcard performance insights
    if (stats.averageAccuracy >= 85) {
      insights.push({
        type: 'success',
        message: `Excellent retention! Your ${stats.averageAccuracy}% accuracy shows strong understanding of the material.`
      })
    } else if (stats.averageAccuracy >= 70 && stats.averageAccuracy < 85) {
      insights.push({
        type: 'info',
        message: `Good progress! Your ${stats.averageAccuracy}% accuracy is solid. Review challenging cards more frequently.`
      })
    } else if (stats.averageAccuracy < 70 && stats.totalFlashcardsReviewed > 10) {
      insights.push({
        type: 'warning',
        message: `Your ${stats.averageAccuracy}% accuracy suggests some concepts need more review. Try spacing out your study sessions.`
      })
    }

    // Study pattern insights
    const avgSessionMinutes = stats.averageSessionMinutes
    if (avgSessionMinutes >= 25 && avgSessionMinutes <= 50) {
      insights.push({
        type: 'success',
        message: `Your ${avgSessionMinutes}-minute study sessions are optimal. This matches the Pomodoro Technique for maximum focus.`
      })
    } else if (avgSessionMinutes > 60) {
      insights.push({
        type: 'info',
        message: `Your study sessions average ${avgSessionMinutes} minutes. Consider breaking them into 25-50 minute focused blocks with breaks.`
      })
    }

    // Weekly consistency
    const daysStudiedThisWeek = Math.min(7, Math.ceil(stats.weekMinutes / (stats.averageSessionMinutes || 1)))
    if (daysStudiedThisWeek >= 5) {
      insights.push({
        type: 'success',
        message: `You've studied ${daysStudiedThisWeek} days this week! Consistent daily study builds lasting knowledge.`
      })
    } else if (daysStudiedThisWeek >= 3 && daysStudiedThisWeek < 5) {
      insights.push({
        type: 'info',
        message: `You've studied ${daysStudiedThisWeek} days this week. Try to aim for at least 5 days to build stronger habits.`
      })
    }

    // Return top 3 most relevant insights
    return insights.slice(0, 3)
  }

  const renderHeatmap = () => {
    if (!stats?.heatmapData) return null

    const weeks: Array<Array<typeof stats.heatmapData[0]>> = []
    let currentWeek: Array<typeof stats.heatmapData[0]> = []

    // Group data by weeks
    stats.heatmapData.forEach((day, index) => {
      currentWeek.push(day)
      if ((index + 1) % 7 === 0) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => {
                const date = new Date(day.date)
                const isToday = new Date().toDateString() === date.toDateString()

                return (
                  <div
                    key={dayIndex}
                    className={`
                      w-3 h-3 rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-accent-primary cursor-pointer
                      ${getStreakColor(day.minutes)}
                      ${isToday ? 'ring-2 ring-accent-primary' : ''}
                    `}
                    title={`${date.toLocaleDateString()}: ${day.minutes} minutes`}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
            <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-400" />
          </div>
          <span>More</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-12 h-12 animate-spin text-accent-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[600px] text-gray-600 dark:text-gray-400">
        Failed to load statistics
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Study Statistics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your progress and maintain your streak
          </p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 rounded-md text-sm font-semibold transition-all capitalize
                ${timeRange === range
                  ? 'bg-white dark:bg-gray-600 text-accent-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Streak */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-2xl p-6 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {stats.currentStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                day streak
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {stats.currentStreak > 0 ? (
              <p>
                Keep it up! Study today to maintain your streak. 🎯
              </p>
            ) : (
              <p>
                Start a new streak by studying today! 💪
              </p>
            )}
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {stats.longestStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                longest streak
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p>
              {stats.longestStreak === stats.currentStreak && stats.currentStreak > 0
                ? "You're at your personal best! 🏆"
                : `Your record is ${stats.longestStreak} days. Can you beat it?`}
            </p>
          </div>
        </div>
      </div>

      {/* AI-Powered Insights */}
      {generateAIInsights().length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 rounded-2xl border-2 border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Study Insights
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Personalized recommendations based on your study patterns
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {generateAIInsights().map((insight, index) => {
              const getInsightStyles = () => {
                switch (insight.type) {
                  case 'success':
                    return {
                      icon: TrendingUp,
                      bg: 'bg-green-100 dark:bg-green-900/30',
                      text: 'text-green-700 dark:text-green-300',
                      border: 'border-green-200 dark:border-green-800'
                    }
                  case 'warning':
                    return {
                      icon: AlertCircle,
                      bg: 'bg-orange-100 dark:bg-orange-900/30',
                      text: 'text-orange-700 dark:text-orange-300',
                      border: 'border-orange-200 dark:border-orange-800'
                    }
                  case 'info':
                    return {
                      icon: Brain,
                      bg: 'bg-blue-100 dark:bg-blue-900/30',
                      text: 'text-blue-700 dark:text-blue-300',
                      border: 'border-blue-200 dark:border-blue-800'
                    }
                }
              }

              const styles = getInsightStyles()
              const Icon = styles.icon

              return (
                <div
                  key={index}
                  className={`${styles.bg} ${styles.border} border-2 rounded-xl p-4 flex items-start gap-3`}
                >
                  <div className="flex-shrink-0">
                    <Icon className={`w-5 h-5 ${styles.text}`} />
                  </div>
                  <p className={`text-sm ${styles.text} leading-relaxed`}>
                    {insight.message}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-accent-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Heatmap
            </h3>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last {timeRange === 'week' ? '7 days' : timeRange === 'month' ? '30 days' : '365 days'}
          </span>
        </div>
        {renderHeatmap()}
      </div>

      {/* Study Time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.todayMinutes} min
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((stats.todayMinutes / stats.dailyGoalMinutes) * 100, 100)}%`
              }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Goal: {stats.dailyGoalMinutes} min
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.weekMinutes} min
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats.totalSessions > 0
              ? `${(stats.weekMinutes / 7).toFixed(0)} min/day average`
              : 'Start studying to see stats'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">This Month</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.monthMinutes} min
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {(stats.monthMinutes / 60).toFixed(1)} hours total
          </div>
        </div>
      </div>

      {/* Flashcard Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-accent-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Flashcard Review Statistics
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.totalFlashcardsReviewed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Reviews
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.flashcardsReviewedToday}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Today
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.flashcardsReviewedWeek}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              This Week
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.averageAccuracy}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Accuracy
            </div>
          </div>
        </div>
      </div>

      {/* Session Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {stats.totalSessions}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Study Sessions
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {Math.round(stats.totalMinutes / 60)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Hours Studied
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {stats.averageSessionMinutes}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg Session (min)
          </div>
        </div>
      </div>
    </div>
  )
}
