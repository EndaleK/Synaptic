'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  Users,
  Calendar,
  ArrowLeft,
  Flame,
  Target,
  Zap,
  Award,
  ChevronDown,
  Loader2
} from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl?: string
  score: number
  streak: number
  level: number
  isCurrentUser: boolean
  change?: 'up' | 'down' | 'same'
}

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'all-time'
type Category = 'overall' | 'flashcards' | 'study-time' | 'streaks'

export default function LeaderboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly')
  const [category, setCategory] = useState<Category>('overall')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [timeFrame, category])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leaderboard?timeframe=${timeFrame}&category=${category}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setUserRank(data.userRank || null)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>
    }
  }

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 border-yellow-200 dark:border-yellow-500/30'
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-500/10 dark:to-slate-500/10 border-gray-200 dark:border-gray-500/30'
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-200 dark:border-amber-500/30'
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
    }
  }

  const timeFrameOptions = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'all-time', label: 'All Time' }
  ]

  const categoryOptions = [
    { value: 'overall', label: 'Overall', icon: Trophy },
    { value: 'flashcards', label: 'Flashcards', icon: Zap },
    { value: 'study-time', label: 'Study Time', icon: Target },
    { value: 'streaks', label: 'Streaks', icon: Flame }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Leaderboard</h1>
              <p className="text-white/80 mt-1">Compete with fellow learners</p>
            </div>
          </div>

          {/* User's rank card */}
          {userRank && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                    #{userRank.rank}
                  </div>
                  <div>
                    <p className="font-semibold">Your Ranking</p>
                    <p className="text-sm text-white/80">{userRank.score.toLocaleString()} points</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userRank.streak}</p>
                    <p className="text-xs text-white/80">Day Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">Lv.{userRank.level}</p>
                    <p className="text-xs text-white/80">Level</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Time Frame */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {timeFrameOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeFrame(option.value as TimeFrame)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  timeFrame === option.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:ml-auto">
            {categoryOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value as Category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  category === option.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No rankings yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start studying to appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${getRankBackground(entry.rank)} ${
                  entry.isCurrentUser ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-gray-950' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      entry.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${
                      entry.isCurrentUser ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {entry.displayName}
                      {entry.isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {entry.streak} day streak
                      </span>
                      <span>Level {entry.level}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                </div>

                {/* Change indicator */}
                {entry.change && entry.change !== 'same' && (
                  <div className={`flex-shrink-0 ${
                    entry.change === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${entry.change === 'down' ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
