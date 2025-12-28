"use client"

import { Flame, Target, Check } from "lucide-react"

interface StreakHeroProps {
  currentStreak: number
  isLoading?: boolean
  todayGoalProgress?: number // 0-100
  todayGoalTarget?: number
  todayGoalCurrent?: number
}

export default function StreakHero({
  currentStreak,
  isLoading = false,
  todayGoalProgress = 0,
  todayGoalTarget = 10,
  todayGoalCurrent = 0
}: StreakHeroProps) {
  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today"
    if (streak === 1) return "Great start"
    if (streak < 7) return "Building momentum"
    if (streak < 14) return "One week strong"
    if (streak < 30) return "Keep it going"
    if (streak < 60) return "Impressive dedication"
    return "Outstanding"
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
        <div className="animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl" />
            <div className="space-y-2">
              <div className="h-7 w-16 bg-gray-100 dark:bg-slate-700 rounded" />
              <div className="h-4 w-28 bg-gray-100 dark:bg-slate-700 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-center justify-between">
        {/* Streak Display */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            currentStreak > 0
              ? 'bg-orange-500 text-white'
              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
          }`}>
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                {currentStreak}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                day streak
              </span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {getStreakMessage(currentStreak)}
            </p>
          </div>
        </div>

        {/* Today's Goal */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Today
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {todayGoalCurrent} of {todayGoalTarget}
            </p>
          </div>
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-neutral-200 dark:text-neutral-800"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke={todayGoalProgress >= 100 ? "#10b981" : "#3b82f6"}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(todayGoalProgress, 100) / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {todayGoalProgress >= 100 ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {todayGoalCurrent}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
