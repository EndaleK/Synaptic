"use client"

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Flame,
  Target,
  Award,
  Calendar,
  BarChart3,
  Brain,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/notifications'
import { usePomodoroStore } from '@/lib/store/usePomodoroStore'
import { useStudyGoalsStore } from '@/lib/store/useStudyGoalsStore'
import GoalsSettingsModal from './GoalsSettingsModal'

interface StudyProgress {
  currentStreak: number
  longestStreak: number
  totalSessions: number
  totalMinutes: number
  flashcardsReviewedWeek: number
  averageAccuracy: number
  todayMinutes: number
  weekMinutes: number
  dailyGoalMinutes: number
  dailyGoalProgress: number
  pomodoroSessionsToday?: number
  pomodoroSessionsWeek?: number
}

export default function StudyProgressWidget() {
  const router = useRouter()
  const [stats, setStats] = useState<StudyProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const notifications = useNotifications()
  const [lastNotifiedStreak, setLastNotifiedStreak] = useState<number | null>(null)
  const [lastNotifiedGoal, setLastNotifiedGoal] = useState<string | null>(null)
  const { sessionsCompleted, totalStudyTimeToday } = usePomodoroStore()
  const {
    dailyGoals,
    dailyProgress,
    weeklyStats,
    checkAndResetDaily,
    getGoalCompletion,
    setGoalsModalOpen
  } = useStudyGoalsStore()

  useEffect(() => {
    fetchProgress()
    checkAndResetDaily() // Initialize and check daily reset
  }, [checkAndResetDaily])

  // Check for milestone notifications
  useEffect(() => {
    if (!stats) return

    // Streak milestones: 3, 7, 14, 30, 60, 90, 180, 365
    const streakMilestones = [3, 7, 14, 30, 60, 90, 180, 365]
    if (
      streakMilestones.includes(stats.currentStreak) &&
      stats.currentStreak !== lastNotifiedStreak
    ) {
      notifications.showStreakReminder(stats.currentStreak)
      setLastNotifiedStreak(stats.currentStreak)
    }

    // Daily goal completion
    if (
      stats.dailyGoalProgress >= stats.dailyGoalMinutes &&
      lastNotifiedGoal !== `daily-${new Date().toDateString()}`
    ) {
      notifications.showSessionComplete(stats.todayMinutes)
      setLastNotifiedGoal(`daily-${new Date().toDateString()}`)
    }
  }, [stats, lastNotifiedStreak, lastNotifiedGoal, notifications])

  const fetchProgress = async () => {
    try {
      // Get user's timezone offset (in minutes, negative for timezones ahead of UTC)
      const timezoneOffset = new Date().getTimezoneOffset()
      const response = await fetch(`/api/study-statistics?range=week&timezoneOffset=${-timezoneOffset}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch study progress:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const progressPercentage = Math.min(stats.dailyGoalProgress, 100)
  const goalCompletion = getGoalCompletion()

  return (
    <>
      <GoalsSettingsModal />
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Study Progress</h2>
            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
              This Week
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGoalsModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Customize daily goals"
            >
              <Settings className="w-4 h-4" />
              Goals
            </button>
            <button
              onClick={() => router.push('/dashboard/study/statistics')}
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Study Session Streak */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Study Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Best: {stats.longestStreak} days
            </p>
          )}
        </div>

        {/* Total Study Time */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Study Time</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(stats.weekMinutes / 60)}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">hours</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            This week
          </p>
        </div>

        {/* Flashcards Reviewed */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Cards</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.flashcardsReviewedWeek}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">reviewed</span>
          </div>
          {stats.flashcardsReviewedWeek > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {Math.round(stats.averageAccuracy)}% accuracy
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              No reviews yet
            </p>
          )}
        </div>

        {/* Sessions */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Sessions</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">total</span>
          </div>
          {stats.totalSessions > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Avg {Math.round(stats.totalMinutes / stats.totalSessions)} min/session
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Start studying to track
            </p>
          )}
        </div>

        {/* Pomodoro Sessions */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🍅</span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Pomodoros</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{sessionsCompleted}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">today</span>
          </div>
          {totalStudyTimeToday > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {Math.round(totalStudyTimeToday / 60)} min focused
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Start a focus session
            </p>
          )}
        </div>
      </div>

      {/* Today's Goals Progress */}
      <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Today's Goals</h3>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {Object.values(goalCompletion).filter(v => v >= 100).length} / 4 completed
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Study Time Goal */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Study Time</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {dailyProgress.studyMinutes}/{dailyGoals.studyMinutes}m
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(100, goalCompletion.studyMinutes)}%` }}
              />
            </div>
          </div>

          {/* Flashcards Goal */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Flashcards</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {dailyProgress.flashcardsReviewed}/{dailyGoals.flashcardsReviewed}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${Math.min(100, goalCompletion.flashcardsReviewed)}%` }}
              />
            </div>
          </div>

          {/* Documents Goal */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Documents</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {dailyProgress.documentsRead.size}/{dailyGoals.documentsRead}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(100, goalCompletion.documentsRead)}%` }}
              />
            </div>
          </div>

          {/* Pomodoro Goal */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Pomodoros</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {dailyProgress.pomodoroSessions}/{dailyGoals.pomodoroSessions}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.min(100, goalCompletion.pomodoroSessions)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's Goal</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {stats.todayMinutes}/{stats.dailyGoalMinutes} min
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
          {progressPercentage >= 100 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {progressPercentage >= 100
            ? "🎉 Goal completed! Keep up the great work!"
            : `${Math.round(progressPercentage)}% of your daily goal`
          }
        </p>
      </div>

      {/* Achievement Hint */}
      {stats.currentStreak >= 7 && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Amazing!</span> You've maintained a {stats.currentStreak}-day streak!
          </p>
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        </div>
      )}
      </div>
    </>
  )
}
