"use client"

import { useState, useEffect } from 'react'
import {
  Target,
  Users,
  Trophy,
  Clock,
  BookOpen,
  Flame,
  GraduationCap,
  Zap,
  ChevronRight,
  Plus,
  Crown,
  Medal,
  Award,
  Calendar
} from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description?: string
  challenge_type: 'flashcards' | 'streak' | 'study_time' | 'exams' | 'custom'
  goal_value: number
  goal_unit: string
  start_date: string
  end_date: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  visibility: 'private' | 'friends' | 'public'
  is_creator: boolean
  is_participating: boolean
  user_progress: number
  user_completed: boolean
  participant_count: number
  progress_percentage: number
  creator?: {
    display_name: string
    avatar_url?: string
  }
}

interface StudyChallengeWidgetProps {
  onViewAll?: () => void
  onCreateChallenge?: () => void
  compact?: boolean
}

export default function StudyChallengeWidget({
  onViewAll,
  onCreateChallenge,
  compact = false
}: StudyChallengeWidgetProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch('/api/challenges?filter=active&limit=3', {
          credentials: 'include'
        })

        if (!response.ok) {
          // Don't throw - just treat as empty (table may not exist yet)
          setChallenges([])
          return
        }

        const data = await response.json()
        setChallenges(data.challenges || [])
      } catch (err) {
        // Silently fail - challenges feature may not be set up yet
        console.debug('Challenges not available:', err)
        setChallenges([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchChallenges()
  }, [])

  // Get icon for challenge type
  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'flashcards':
        return BookOpen
      case 'streak':
        return Flame
      case 'study_time':
        return Clock
      case 'exams':
        return GraduationCap
      default:
        return Target
    }
  }

  // Get color for challenge type
  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'flashcards':
        return 'from-indigo-500 to-violet-500'
      case 'streak':
        return 'from-orange-500 to-red-500'
      case 'study_time':
        return 'from-cyan-500 to-blue-500'
      case 'exams':
        return 'from-amber-500 to-orange-500'
      default:
        return 'from-violet-500 to-purple-500'
    }
  }

  // Get days remaining
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return 'Ended'
    if (diff === 1) return '1 day left'
    return `${diff} days left`
  }

  // Get rank badge for position
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-3.5 h-3.5 text-amber-500" />
    if (rank === 2) return <Medal className="w-3.5 h-3.5 text-gray-400" />
    if (rank === 3) return <Award className="w-3.5 h-3.5 text-orange-600" />
    return <span className="text-xs font-bold text-gray-500">#{rank}</span>
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Active Challenges</h3>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full" />
                </div>
              </div>
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
          <Target className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Active Challenges</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {error}
        </p>
      </div>
    )
  }

  if (challenges.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Study Challenges</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-500/20 dark:to-pink-500/20 flex items-center justify-center">
            <Target className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            No active challenges
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Create or join a challenge to compete with friends
          </p>
          {onCreateChallenge && (
            <button
              onClick={onCreateChallenge}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30"
            >
              <Plus className="w-4 h-4" />
              Create Challenge
            </button>
          )}
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Active Challenges</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{challenges.length} in progress</p>
            </div>
          </div>
          {onCreateChallenge && (
            <button
              onClick={onCreateChallenge}
              className="p-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Challenge List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {challenges.map((challenge) => {
          const Icon = getChallengeIcon(challenge.challenge_type)
          const colorClass = getChallengeColor(challenge.challenge_type)

          return (
            <div
              key={challenge.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                {/* Challenge Icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Challenge Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {challenge.title}
                    </h4>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <Calendar className="w-3 h-3" />
                      {getDaysRemaining(challenge.end_date)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {challenge.user_progress} / {challenge.goal_value} {challenge.goal_unit}
                      </span>
                      <span className={`font-medium ${challenge.user_completed ? 'text-green-500' : 'text-violet-600 dark:text-violet-400'}`}>
                        {Math.round(challenge.progress_percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          challenge.user_completed
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                            : `bg-gradient-to-r ${colorClass}`
                        }`}
                        style={{ width: `${challenge.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {challenge.participant_count} participant{challenge.participant_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {challenge.user_completed && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                        <Trophy className="w-3.5 h-3.5" />
                        Completed!
                      </span>
                    )}
                    {challenge.is_creator && !challenge.user_completed && (
                      <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                        Your challenge
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View All Button */}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full p-3 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700"
        >
          View All Challenges
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Challenge Creation Modal Component
export function CreateChallengeModal({
  isOpen,
  onClose,
  onCreated
}: {
  isOpen: boolean
  onClose: () => void
  onCreated?: (challenge: Challenge) => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: 'flashcards' as Challenge['challenge_type'],
    goal_value: 100,
    goal_unit: 'cards',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    visibility: 'private' as Challenge['visibility']
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const challengeTypes = [
    { value: 'flashcards', label: 'Flashcards', icon: BookOpen, unit: 'cards', defaultGoal: 100 },
    { value: 'streak', label: 'Streak', icon: Flame, unit: 'days', defaultGoal: 7 },
    { value: 'study_time', label: 'Study Time', icon: Clock, unit: 'minutes', defaultGoal: 300 },
    { value: 'exams', label: 'Exams', icon: GraduationCap, unit: 'exams', defaultGoal: 5 },
  ]

  const handleTypeChange = (type: Challenge['challenge_type']) => {
    const typeConfig = challengeTypes.find(t => t.value === type)
    setFormData(prev => ({
      ...prev,
      challenge_type: type,
      goal_unit: typeConfig?.unit || 'points',
      goal_value: typeConfig?.defaultGoal || 100
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create challenge')
      }

      const data = await response.json()
      onCreated?.(data.challenge)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Challenge</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Challenge yourself and friends to study more
            </p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Challenge Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., 7-Day Flashcard Sprint"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Challenge Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Challenge Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {challengeTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = formData.challenge_type === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value as Challenge['challenge_type'])}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-violet-500' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {type.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Goal
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.goal_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_value: parseInt(e.target.value) || 0 }))}
                  min="1"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[60px]">
                  {formData.goal_unit}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Visibility
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as Challenge['visibility'] }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="private">Private (invite only)</option>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
