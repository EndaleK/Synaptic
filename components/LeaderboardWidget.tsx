"use client"

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Crown, Flame, BookOpen, GraduationCap, ChevronRight, Users, TrendingUp } from 'lucide-react'
import { RANK_COLORS } from '@/lib/design/community-colors'

interface LeaderboardEntry {
  rank: number
  user_id: number
  display_name: string
  avatar_url?: string
  points: number
  flashcards_reviewed: number
  exams_completed: number
  streak_days: number
  achievements_count: number
  is_current_user: boolean
}

interface LeaderboardWidgetProps {
  compact?: boolean
  limit?: number
  onViewAll?: () => void
}

export default function LeaderboardWidget({
  compact = false,
  limit = 5,
  onViewAll
}: LeaderboardWidgetProps) {
  const [type, setType] = useState<'weekly' | 'alltime'>('weekly')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/leaderboard?type=${type}&limit=${limit}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          // Don't throw - just treat as empty (table may not exist yet)
          setLeaderboard([])
          return
        }

        const data = await response.json()
        setLeaderboard(data.leaderboard || [])
        setCurrentUserRank(data.currentUserRank)
      } catch (err) {
        // Silently fail - leaderboard feature may not be set up yet
        console.debug('Leaderboard not available:', err)
        setLeaderboard([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [type, limit])

  // Get rank icon/badge
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${RANK_COLORS.first.gradient} flex items-center justify-center shadow-lg ${RANK_COLORS.first.glow}`}>
            <Crown className="w-4 h-4 text-white" />
          </div>
        )
      case 2:
        return (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${RANK_COLORS.second.gradient} flex items-center justify-center shadow-lg ${RANK_COLORS.second.glow}`}>
            <Medal className="w-4 h-4 text-white" />
          </div>
        )
      case 3:
        return (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${RANK_COLORS.third.gradient} flex items-center justify-center shadow-lg ${RANK_COLORS.third.glow}`}>
            <Award className="w-4 h-4 text-white" />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
            {rank}
          </div>
        )
    }
  }

  // Get initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {error}
        </p>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
        </div>
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Be the first to join the leaderboard!
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Review flashcards and complete exams to earn points
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setType('weekly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                type === 'weekly'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setType('alltime')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                type === 'alltime'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {leaderboard.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-3 ${
              entry.is_current_user
                ? `bg-gradient-to-r ${RANK_COLORS.currentUser.bg}`
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            } transition-colors`}
          >
            {/* Rank badge */}
            {getRankBadge(entry.rank)}

            {/* Avatar */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${entry.is_current_user
                ? `bg-gradient-to-br ${RANK_COLORS.currentUser.gradient} text-white`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }
            `}>
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(entry.display_name)
              )}
            </div>

            {/* Name and stats */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${
                entry.is_current_user
                  ? RANK_COLORS.currentUser.text
                  : 'text-gray-900 dark:text-white'
              }`}>
                {entry.is_current_user ? 'You' : entry.display_name}
              </p>
              {!compact && (
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {entry.flashcards_reviewed}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {entry.exams_completed}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {entry.streak_days}
                  </span>
                </div>
              )}
            </div>

            {/* Points */}
            <div className="text-right">
              <p className={`font-bold ${
                entry.rank === 1
                  ? RANK_COLORS.first.text
                  : entry.is_current_user
                  ? RANK_COLORS.currentUser.text
                  : 'text-gray-900 dark:text-white'
              }`}>
                {entry.points.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
            </div>
          </div>
        ))}
      </div>

      {/* Current user (if not in top list) */}
      {currentUserRank && !leaderboard.some(e => e.is_current_user) && (
        <>
          <div className="px-4 py-2 text-center">
            <span className="text-xs text-gray-400">• • •</span>
          </div>
          <div className={`flex items-center gap-3 p-3 bg-gradient-to-r ${RANK_COLORS.currentUser.bg} border-t ${RANK_COLORS.currentUser.border}`}>
            {getRankBadge(currentUserRank.rank)}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${RANK_COLORS.currentUser.gradient} flex items-center justify-center text-sm font-bold text-white`}>
              You
            </div>
            <div className="flex-1">
              <p className={`font-medium ${RANK_COLORS.currentUser.text}`}>
                Your Rank
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Keep studying to climb higher!
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${RANK_COLORS.currentUser.text}`}>
                {currentUserRank.points.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
            </div>
          </div>
        </>
      )}

      {/* View all button */}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className={`w-full p-3 text-sm font-medium ${RANK_COLORS.currentUser.text} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700`}
        >
          View Full Leaderboard
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
