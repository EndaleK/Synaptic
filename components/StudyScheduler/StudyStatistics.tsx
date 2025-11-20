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
  AlertCircle,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

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

  // Learning Mode Breakdown
  modeBreakdown?: {
    flashcards: number
    chat: number
    mindmap: number
    podcast: number
    video: number
    writing: number
    exam: number
    other: number
  }
}

// Mode configuration for consistent display across charts and lists
const MODE_CONFIG = {
  flashcards: { name: 'Flashcards', icon: '🃏', color: '#7B3FF2', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  chat: { name: 'Chat', icon: '💬', color: '#E91E8C', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  mindmap: { name: 'Mind Maps', icon: '🗺️', color: '#FF6B35', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  podcast: { name: 'Podcasts', icon: '🎙️', color: '#2D3E9F', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  video: { name: 'Video', icon: '📹', color: '#10B981', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  writing: { name: 'Writing', icon: '✍️', color: '#F59E0B', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  exam: { name: 'Exam', icon: '📝', color: '#8B5CF6', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  other: { name: 'Other', icon: '⏰', color: '#6B7280', bgColor: 'bg-gray-100 dark:bg-gray-900/30' }
} as const

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
      // Get user's timezone offset (in minutes, negative for timezones ahead of UTC)
      const timezoneOffset = new Date().getTimezoneOffset()
      const response = await fetch(`/api/study-statistics?range=${timeRange}&timezoneOffset=${-timezoneOffset}`)
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

  // Generate dynamic mode data from actual statistics
  const getModeData = () => {
    if (!stats?.modeBreakdown) return []

    return Object.entries(stats.modeBreakdown)
      .filter(([_, value]) => value > 0) // Only show modes with data
      .map(([key, value]) => ({
        key,
        name: MODE_CONFIG[key as keyof typeof MODE_CONFIG].name,
        icon: MODE_CONFIG[key as keyof typeof MODE_CONFIG].icon,
        color: MODE_CONFIG[key as keyof typeof MODE_CONFIG].color,
        bgColor: MODE_CONFIG[key as keyof typeof MODE_CONFIG].bgColor,
        value
      }))
      .sort((a, b) => b.value - a.value) // Sort by time spent (descending)
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

    // GitHub-style contribution grid: rows = days of week, columns = weeks
    const monthLabels: { weekIndex: number; month: string; span: number }[] = []

    // Organize data into a grid: [week][dayOfWeek]
    const grid: Array<Array<typeof stats.heatmapData[0] | null>> = []

    // Get the first day to determine alignment
    const firstDate = new Date(stats.heatmapData[0].date)
    const firstDayOfWeek = firstDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Start week on Sunday (GitHub style)
    const adjustedFirstDay = firstDayOfWeek

    let currentWeek: Array<typeof stats.heatmapData[0] | null> = new Array(7).fill(null)
    let currentDayInWeek = adjustedFirstDay
    let currentMonth = ''
    let monthStartWeek = 0

    stats.heatmapData.forEach((day, index) => {
      const date = new Date(day.date)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })

      // Track month changes for labels
      if (monthName !== currentMonth) {
        if (currentMonth && monthLabels.length > 0) {
          // Update the span of the previous month
          monthLabels[monthLabels.length - 1].span = grid.length - monthStartWeek
        }
        // Only add month label if there are at least 2 weeks to show it
        if (index === 0 || stats.heatmapData.length - index >= 14) {
          monthLabels.push({ weekIndex: grid.length, month: monthName, span: 1 })
          monthStartWeek = grid.length
        }
        currentMonth = monthName
      }

      currentWeek[currentDayInWeek] = day
      currentDayInWeek++

      // Start new week on Saturday (when currentDayInWeek reaches 7)
      if (currentDayInWeek === 7) {
        grid.push([...currentWeek])
        currentWeek = new Array(7).fill(null)
        currentDayInWeek = 0
      }
    })

    // Push remaining days
    if (currentWeek.some(d => d !== null)) {
      grid.push(currentWeek)
    }

    // Update last month span
    if (monthLabels.length > 0) {
      monthLabels[monthLabels.length - 1].span = grid.length - monthStartWeek
    }

    return (
      <div className="w-full">
        <div className="flex flex-col gap-1">
          {/* Month labels - GitHub style */}
          <div className="flex gap-[2px] pl-[28px] mb-1">
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                className="text-[11px] text-gray-600 dark:text-gray-400"
                style={{
                  width: `${label.span * 12}px`, // 10px square + 2px gap
                  textAlign: 'left'
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Grid with day labels - GitHub style */}
          <div className="flex gap-[2px]">
            {/* Day of week labels - only Mon, Wed, Fri visible */}
            <div className="flex flex-col gap-[2px] justify-start pr-[3px]">
              {[
                { label: 'Mon', visible: true },
                { label: 'Tue', visible: false },
                { label: 'Wed', visible: true },
                { label: 'Thu', visible: false },
                { label: 'Fri', visible: true },
                { label: 'Sat', visible: false },
                { label: 'Sun', visible: false }
              ].map((day, idx) => (
                <div
                  key={idx}
                  className="h-[10px] text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-end"
                  style={{ width: '23px', opacity: day.visible ? 1 : 0 }}
                >
                  {day.label}
                </div>
              ))}
            </div>

            {/* Contribution grid */}
            <div className="flex gap-[2px]">
              {grid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={dayIndex}
                          className="w-[10px] h-[10px] rounded-[1px] bg-gray-100 dark:bg-gray-800"
                          style={{
                            outline: '1px solid rgba(27, 31, 35, 0.06)',
                            outlineOffset: '-1px'
                          }}
                        />
                      )
                    }

                    const date = new Date(day.date)
                    const today = new Date()
                    const isToday = date.toDateString() === today.toDateString()

                    return (
                      <div
                        key={dayIndex}
                        className={`
                          w-[10px] h-[10px] rounded-[1px] transition-all cursor-pointer
                          ${getStreakColor(day.minutes)}
                          ${isToday ? 'ring-1 ring-blue-500 dark:ring-blue-400' : ''}
                          hover:ring-1 hover:ring-gray-800 dark:hover:ring-gray-200
                        `}
                        style={{
                          outline: day.minutes === 0 ? '1px solid rgba(27, 31, 35, 0.06)' : 'none',
                          outlineOffset: '-1px'
                        }}
                        title={`${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${day.minutes} min`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend - GitHub style */}
          <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="mr-1">Less</span>
            <div className="w-[10px] h-[10px] rounded-[1px] bg-gray-100 dark:bg-gray-800" style={{ outline: '1px solid rgba(27, 31, 35, 0.06)', outlineOffset: '-1px' }} />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-green-200 dark:bg-green-900" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-green-400 dark:bg-green-700" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-green-600 dark:bg-green-500" />
            <div className="w-[10px] h-[10px] rounded-[1px] bg-green-700 dark:bg-green-400" />
            <span className="ml-1">More</span>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-20 bg-gray-200 dark:bg-gray-600 rounded-md animate-pulse" />
            ))}
          </div>
        </div>

        {/* Streak Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mode Breakdown Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Skeleton */}
            <div className="flex items-center justify-center h-[250px]">
              <div className="w-48 h-48 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            {/* Mode List Skeleton */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-900/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Heatmap Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
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
                Synaptic Study Insights
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

      {/* Study Time Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Study Time Trend
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your daily study minutes over the last {timeRange === 'week' ? '7 days' : timeRange === 'month' ? '30 days' : '365 days'}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.heatmapData}>
            <defs>
              <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              }}
              formatter={(value: number) => [`${value} min`, 'Study Time']}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="rgb(var(--accent-primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMinutes)"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Trend Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(stats.heatmapData.reduce((sum, d) => sum + d.minutes, 0) / stats.heatmapData.length)} min
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Peak Day</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {Math.max(...stats.heatmapData.map(d => d.minutes))} min
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Days</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.heatmapData.filter(d => d.minutes > 0).length}
            </div>
          </div>
        </div>
      </div>

      {/* Learning Mode Breakdown */}
      {stats.modeBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Learning Mode Breakdown
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                How you spend your study time across different modes
              </p>
            </div>
          </div>

          {getModeData().length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start Your Learning Journey
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                Use any learning mode to begin tracking your study progress. Your statistics will appear here as you study.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:shadow-xl transition-all shadow-lg"
              >
                Explore Learning Modes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getModeData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {getModeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => `${value} min`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Mode Statistics */}
              <div className="space-y-4">
                {getModeData().map((mode) => {
                  const total = getModeData().reduce((sum, m) => sum + m.value, 0)
                  const percentage = total > 0 ? Math.round((mode.value / total) * 100) : 0

                  return (
                    <div key={mode.key} className={`${mode.bgColor} rounded-xl p-4 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{mode.icon}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{mode.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{mode.value} min</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{percentage}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: mode.color
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
