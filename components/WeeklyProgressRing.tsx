"use client"

import { useState, useEffect } from "react"
import { Clock, BookOpen } from "lucide-react"

interface WeeklyStats {
  cardsReviewed: number
  minutesStudied: number
  daysActive: number
}

export default function WeeklyProgressRing() {
  const [stats, setStats] = useState<WeeklyStats>({
    cardsReviewed: 0,
    minutesStudied: 0,
    daysActive: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/study-statistics?period=week', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setStats({
            cardsReviewed: data.totalCardsReviewed || 0,
            minutesStudied: Math.round((data.totalStudyTime || 0) / 60),
            daysActive: data.daysActive || 0
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const weeklyProgress = Math.min((stats.daysActive / 7) * 100, 100)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-100 dark:bg-slate-700 rounded mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg" />
              <div className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">This Week</h3>

      <div className="flex items-center gap-5">
        {/* Progress Ring */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-neutral-200 dark:text-neutral-800"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="#3b82f6"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - weeklyProgress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">
              {stats.daysActive}
            </span>
            <span className="text-[9px] text-neutral-500 dark:text-neutral-400">
              of 7
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Cards reviewed</span>
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              {stats.cardsReviewed}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Minutes studied</span>
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              {stats.minutesStudied}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
