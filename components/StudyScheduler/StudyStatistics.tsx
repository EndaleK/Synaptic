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

  // GitHub-style contribution colors
  const getContributionColor = (minutes: number): string => {
    if (minutes === 0) return 'bg-[#ebedf0] dark:bg-[#161b22]'
    if (minutes < 15) return 'bg-[#9be9a8] dark:bg-[#0e4429]'
    if (minutes < 30) return 'bg-[#40c463] dark:bg-[#006d32]'
    if (minutes < 60) return 'bg-[#30a14e] dark:bg-[#26a641]'
    return 'bg-[#216e39] dark:bg-[#39d353]'
  }

  const getContributionLevel = (minutes: number): number => {
    if (minutes === 0) return 0
    if (minutes < 15) return 1
    if (minutes < 30) return 2
    if (minutes < 60) return 3
    return 4
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

  const [hoveredDay, setHoveredDay] = useState<{
    date: string
    minutes: number
    x: number
    y: number
  } | null>(null)

  const renderHeatmap = () => {
    if (!stats?.heatmapData) return null

    // Create a map for quick lookup
    const dataMap = new Map(stats.heatmapData.map(d => [d.date, d]))

    // Calculate total contributions for the displayed period
    const today = new Date()

    // Generate array of last 40 days (each day = one column)
    const days: Array<{ date: Date; minutes: number; dateStr: string }> = []
    for (let i = 39; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const isoStr = date.toISOString().split('T')[0]
      const data = dataMap.get(isoStr)
      days.push({
        date: new Date(date),
        minutes: data?.minutes || 0,
        dateStr: isoStr
      })
    }

    // Count study sessions in the last 40 days
    const totalSessions = days.filter(d => d.minutes > 0).length

    // Track month changes for labels
    const monthLabels: { dayIndex: number; month: string }[] = []
    let lastMonth = -1
    days.forEach((day, idx) => {
      const month = day.date.getMonth()
      if (month !== lastMonth) {
        monthLabels.push({
          dayIndex: idx,
          month: day.date.toLocaleDateString('en-US', { month: 'short' })
        })
        lastMonth = month
      }
    })

    return (
      <div className="w-full">
        {/* Contribution count header */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{totalSessions} study sessions</span>
          {' '}in the last 40 days
        </div>

        <div className="relative overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex mb-2">
              {monthLabels.map((label, idx) => {
                // Calculate width based on days until next month label
                const nextLabelIndex = monthLabels[idx + 1]?.dayIndex || 40
                const span = nextLabelIndex - label.dayIndex

                return (
                  <div
                    key={idx}
                    className="text-xs text-gray-500 dark:text-gray-400"
                    style={{
                      width: `${span * 17}px`, // 14px cell + 3px gap
                      minWidth: span >= 3 ? 'auto' : '0',
                      overflow: 'hidden'
                    }}
                  >
                    {span >= 3 ? label.month : ''}
                  </div>
                )
              })}
            </div>

            {/* Single row of 40 day cells */}
            <div className="flex gap-[3px]">
              {days.map((day, dayIndex) => {
                const isToday = day.date.toDateString() === today.toDateString()
                const dateDisplay = day.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })
                const fullDateStr = day.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })

                return (
                  <div
                    key={dayIndex}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* Day cell */}
                    <div
                      className={`
                        w-[14px] h-[14px] rounded-sm cursor-pointer transition-all
                        ${getContributionColor(day.minutes)}
                        ${isToday ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400' : ''}
                        hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500
                      `}
                      style={{
                        outline: day.minutes === 0 ? '1px solid rgba(27, 31, 35, 0.06)' : 'none',
                        outlineOffset: '-1px'
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setHoveredDay({
                          date: fullDateStr,
                          minutes: day.minutes,
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        })
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Date labels below - show every 7th day */}
            <div className="flex gap-[3px] mt-2">
              {days.map((day, dayIndex) => {
                const showLabel = dayIndex % 7 === 0 || dayIndex === 39
                return (
                  <div
                    key={dayIndex}
                    className="w-[14px] flex-shrink-0 text-center"
                  >
                    {showLabel && (
                      <span className="text-[9px] text-gray-500 dark:text-gray-400">
                        {day.date.getDate()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="mr-2">Less</span>
              <div className="w-[11px] h-[11px] rounded-sm bg-[#ebedf0] dark:bg-[#161b22]" style={{ outline: '1px solid rgba(27, 31, 35, 0.06)', outlineOffset: '-1px' }} />
              <div className="w-[11px] h-[11px] rounded-sm bg-[#9be9a8] dark:bg-[#0e4429]" />
              <div className="w-[11px] h-[11px] rounded-sm bg-[#40c463] dark:bg-[#006d32]" />
              <div className="w-[11px] h-[11px] rounded-sm bg-[#30a14e] dark:bg-[#26a641]" />
              <div className="w-[11px] h-[11px] rounded-sm bg-[#216e39] dark:bg-[#39d353]" />
              <span className="ml-2">More</span>
            </div>
          </div>
        </div>

        {/* GitHub-style tooltip */}
        {hoveredDay && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoveredDay.x,
              top: hoveredDay.y - 10,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap">
              {hoveredDay.minutes > 0 ? (
                <span className="font-semibold">{hoveredDay.minutes} minutes</span>
              ) : (
                <span>No study activity</span>
              )}
              <span className="text-gray-300 dark:text-gray-400"> on {hoveredDay.date}</span>
            </div>
            {/* Tooltip arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid rgb(17 24 39)'
              }}
            />
          </div>
        )}
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
              {stats.heatmapData && stats.heatmapData.length > 0
                ? Math.round(stats.heatmapData.reduce((sum, d) => sum + d.minutes, 0) / stats.heatmapData.length)
                : 0} min
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Peak Day</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.heatmapData && stats.heatmapData.length > 0
                ? Math.max(...stats.heatmapData.map(d => d.minutes))
                : 0} min
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Days</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.heatmapData && stats.heatmapData.length > 0
                ? stats.heatmapData.filter(d => d.minutes > 0).length
                : 0}
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
              {/* Pie Chart with Labels */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getModeData()}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={((props: any) => props.percent >= 0.05 ? `${Math.round(props.percent * 100)}%` : '') as any}
                      labelLine={false}
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
                      formatter={(value: number) => [`${value} min`, 'Time']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={50}
                      iconType="circle"
                      iconSize={10}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-700 dark:text-gray-300 ml-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Mode Statistics - Scrollable & Compact */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {getModeData().map((mode) => {
                  const total = getModeData().reduce((sum, m) => sum + m.value, 0)
                  const percentage = total > 0 ? Math.round((mode.value / total) * 100) : 0

                  return (
                    <div key={mode.key} className={`${mode.bgColor} rounded-lg p-2.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{mode.icon}</span>
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{mode.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{mode.value} min</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">{percentage}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
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

      {/* Activity Heatmap - Last 30 days */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activity Heatmap
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your study activity over the last 40 days
              </p>
            </div>
          </div>
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
