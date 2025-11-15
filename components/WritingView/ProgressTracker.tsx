"use client"

import { useState } from "react"
import { Target, Flame, Trophy, Calendar, TrendingUp, Edit3, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WritingGoals } from "@/lib/supabase/types"

interface ProgressTrackerProps {
  currentWordCount: number
  writingGoals: WritingGoals
  currentStreak: number
  milestones: Array<{
    type: string
    achieved_at: string
    metadata: Record<string, any>
  }>
  onGoalsUpdate?: (goals: WritingGoals) => void
  className?: string
  compact?: boolean
}

/**
 * ProgressTracker - Displays writing progress, goals, streaks, and achievements
 *
 * Based on gamification and motivation research in education:
 * - Clear goals improve persistence and engagement
 * - Visual progress tracking enhances motivation
 * - Streak tracking encourages daily writing habits
 * - Milestone celebrations reinforce positive behaviors
 */
export default function ProgressTracker({
  currentWordCount,
  writingGoals,
  currentStreak,
  milestones,
  onGoalsUpdate,
  className,
  compact = false
}: ProgressTrackerProps) {

  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [editedGoals, setEditedGoals] = useState<WritingGoals>(writingGoals)

  // Calculate progress towards goal
  const goalProgress = writingGoals.target_word_count
    ? Math.min((currentWordCount / writingGoals.target_word_count) * 100, 100)
    : 0

  // Get today's word count from recent session data
  const todayWordCount = currentWordCount // Simplified - in real implementation, calculate from sessions

  const dailyProgress = writingGoals.daily_word_count_goal
    ? Math.min((todayWordCount / writingGoals.daily_word_count_goal) * 100, 100)
    : 0

  // Get streak status
  const getStreakStatus = () => {
    if (currentStreak === 0) return { label: 'No streak yet', color: 'text-gray-500 dark:text-gray-400' }
    if (currentStreak === 1) return { label: '1 day', color: 'text-blue-600 dark:text-blue-400' }
    if (currentStreak < 7) return { label: `${currentStreak} days`, color: 'text-green-600 dark:text-green-400' }
    if (currentStreak < 30) return { label: `${currentStreak} days 🔥`, color: 'text-orange-600 dark:text-orange-400' }
    return { label: `${currentStreak} days 🔥🔥`, color: 'text-red-600 dark:text-red-400' }
  }

  const streakStatus = getStreakStatus()

  // Recent milestones (last 3)
  const recentMilestones = milestones.slice(0, 3)

  const handleSaveGoals = () => {
    if (onGoalsUpdate) {
      onGoalsUpdate(editedGoals)
    }
    setShowGoalEditor(false)
  }

  // Compact version for sidebar/panel
  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Word Count Goal */}
        {writingGoals.target_word_count && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Goal Progress
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {currentWordCount} / {writingGoals.target_word_count} words
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Daily Streak */}
        <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Streak</span>
          </div>
          <span className={cn("text-sm font-bold", streakStatus.color)}>
            {streakStatus.label}
          </span>
        </div>

        {/* Recent Milestone */}
        {recentMilestones.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
              {recentMilestones[0].metadata.achievement || 'New achievement!'}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Full version for main view
  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Your Progress
        </h3>
        {onGoalsUpdate && (
          <button
            onClick={() => setShowGoalEditor(!showGoalEditor)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            {showGoalEditor ? 'Cancel' : 'Set Goals'}
          </button>
        )}
      </div>

      {/* Goal Editor */}
      {showGoalEditor && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Set Writing Goals</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Word Count Goal
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={editedGoals.target_word_count || ''}
                onChange={(e) => setEditedGoals({ ...editedGoals, target_word_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 2000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily Word Count Goal
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={editedGoals.daily_word_count_goal || ''}
                onChange={(e) => setEditedGoals({ ...editedGoals, daily_word_count_goal: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={editedGoals.target_date || ''}
                onChange={(e) => setEditedGoals({ ...editedGoals, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleSaveGoals}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Goals
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Total Progress Card */}
        {writingGoals.target_word_count && (
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Goal</span>
            </div>
            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{currentWordCount}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">/ {writingGoals.target_word_count} words</span>
              </div>
            </div>
            <div className="w-full bg-white dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${goalProgress}%` }}
              >
                {goalProgress >= 15 && (
                  <span className="text-xs font-bold text-white">{Math.round(goalProgress)}%</span>
                )}
              </div>
            </div>
            {goalProgress >= 100 && (
              <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Goal Achieved! 🎉
              </div>
            )}
          </div>
        )}

        {/* Daily Progress Card */}
        {writingGoals.daily_word_count_goal && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Today's Goal</span>
            </div>
            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{todayWordCount}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">/ {writingGoals.daily_word_count_goal} words</span>
              </div>
            </div>
            <div className="w-full bg-white dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${dailyProgress}%` }}
              >
                {dailyProgress >= 15 && (
                  <span className="text-xs font-bold text-white">{Math.round(dailyProgress)}%</span>
                )}
              </div>
            </div>
            {dailyProgress >= 100 && (
              <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Daily goal met! ✨
              </div>
            )}
          </div>
        )}
      </div>

      {/* Writing Streak */}
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Writing Streak</div>
              <div className={cn("text-2xl font-bold", streakStatus.color)}>
                {streakStatus.label}
              </div>
            </div>
          </div>
          {currentStreak > 0 && (
            <div className="text-right">
              <div className="text-xs text-gray-600 dark:text-gray-400">Keep it up!</div>
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Write today to continue</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Milestones */}
      {recentMilestones.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            Recent Achievements
          </h4>
          <div className="space-y-2">
            {recentMilestones.map((milestone, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {milestone.metadata.achievement || 'Achievement Unlocked!'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(milestone.achieved_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement Message */}
      {currentWordCount > 0 && goalProgress < 100 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 {goalProgress >= 75 ? "Almost there! You're doing great!" :
              goalProgress >= 50 ? "Great progress! Keep up the good work!" :
                goalProgress >= 25 ? "You're making steady progress. Keep writing!" :
                  "Every word counts. You've got this!"}
          </p>
        </div>
      )}
    </div>
  )
}
