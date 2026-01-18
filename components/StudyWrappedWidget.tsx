"use client"

import { useState, useEffect } from "react"
import { Share2, Flame, BookOpen, Trophy, Sparkles } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import StudyWrapped, { useStudyStats } from "./StudyWrapped"

interface StudyWrappedWidgetProps {
  className?: string
}

export default function StudyWrappedWidget({ className = "" }: StudyWrappedWidgetProps) {
  const { user } = useUser()
  const { stats, loading, error } = useStudyStats()
  const [showWrapped, setShowWrapped] = useState(false)

  // Don't render if no stats or error
  if (loading) {
    return (
      <div className={`p-5 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/50 animate-pulse ${className}`}>
        <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-1/2 mb-3" />
        <div className="h-8 bg-purple-200 dark:bg-purple-800 rounded w-3/4 mb-2" />
        <div className="h-10 bg-purple-200 dark:bg-purple-800 rounded w-full" />
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  const userName = user?.username || user?.firstName || 'Student'

  return (
    <>
      <div className={`p-5 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/50 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Share Your Progress
          </h3>
        </div>

        {/* Quick Stats Preview */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.streak}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.flashcardsReviewed > 999 ? `${(stats.flashcardsReviewed / 1000).toFixed(1)}k` : stats.flashcardsReviewed}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.achievementsUnlocked}</span>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={() => setShowWrapped(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg"
        >
          <Share2 className="w-4 h-4" />
          Create Shareable Card
        </button>
      </div>

      {/* Study Wrapped Modal */}
      <StudyWrapped
        stats={stats}
        period="month"
        userName={userName}
        isOpen={showWrapped}
        onClose={() => setShowWrapped(false)}
      />
    </>
  )
}
