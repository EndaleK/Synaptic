'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Users,
  Trophy,
  Clock,
  Plus,
  ArrowLeft,
  Flame,
  BookOpen,
  Brain,
  Calendar,
  Lock,
  Crown,
  Medal,
  Loader2,
  ChevronRight,
  Share2,
  Copy,
  Check,
  X
} from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description: string
  challengeType: 'flashcards_reviewed' | 'study_time' | 'streak_days' | 'exams_completed'
  targetValue: number
  currentValue: number
  startDate: string
  endDate: string
  visibility: 'public' | 'private'
  inviteCode?: string
  creatorId: string
  creatorName: string
  participantCount: number
  isCreator: boolean
  isParticipant: boolean
  status: 'active' | 'completed' | 'upcoming'
  leaderboard?: Array<{
    userId: string
    displayName: string
    progress: number
    rank: number
  }>
}

export default function ChallengesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'discover'>('active')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joiningCode, setJoiningCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchChallenges()
  }, [activeTab])

  const fetchChallenges = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/challenges?filter=${activeTab}`)
      if (response.ok) {
        const data = await response.json()
        setChallenges(data.challenges || [])
      }
    } catch (error) {
      console.error('Error fetching challenges:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByCode = async () => {
    if (!joiningCode.trim()) return

    setJoinError('')
    try {
      const response = await fetch(`/api/challenges/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joiningCode.trim().toUpperCase() })
      })

      if (response.ok) {
        setJoiningCode('')
        fetchChallenges()
      } else {
        const data = await response.json()
        setJoinError(data.error || 'Invalid invite code')
      }
    } catch (error) {
      setJoinError('Failed to join challenge')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getChallengeIcon = (type: Challenge['challengeType']) => {
    switch (type) {
      case 'flashcards_reviewed':
        return <BookOpen className="w-5 h-5" />
      case 'study_time':
        return <Clock className="w-5 h-5" />
      case 'streak_days':
        return <Flame className="w-5 h-5" />
      case 'exams_completed':
        return <Brain className="w-5 h-5" />
      default:
        return <Target className="w-5 h-5" />
    }
  }

  const getChallengeTypeLabel = (type: Challenge['challengeType']) => {
    switch (type) {
      case 'flashcards_reviewed':
        return 'Flashcards'
      case 'study_time':
        return 'Study Time'
      case 'streak_days':
        return 'Streak Days'
      case 'exams_completed':
        return 'Exams'
      default:
        return 'Challenge'
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Study Challenges</h1>
                <p className="text-white/80 mt-1">Compete and achieve together</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Challenge
            </button>
          </div>

          {/* Join by code */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-sm font-medium mb-2">Join a Private Challenge</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joiningCode}
                onChange={(e) => setJoiningCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                maxLength={8}
              />
              <button
                onClick={handleJoinByCode}
                className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                Join
              </button>
            </div>
            {joinError && <p className="text-red-200 text-sm mt-2">{joinError}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'active', label: 'Active', count: challenges.filter(c => c.status === 'active').length },
            { value: 'completed', label: 'Completed' },
            { value: 'discover', label: 'Discover' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Challenges List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {activeTab === 'active' ? 'No active challenges' : activeTab === 'completed' ? 'No completed challenges' : 'No challenges to discover'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeTab === 'active' ? 'Create or join a challenge to get started!' : 'Check back later for more challenges'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Challenge
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map(challenge => (
              <div
                key={challenge.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        challenge.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                          : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {getChallengeIcon(challenge.challengeType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {challenge.title}
                          </h3>
                          {challenge.isCreator && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full">
                              Creator
                            </span>
                          )}
                          {challenge.visibility === 'private' && (
                            <Lock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getChallengeTypeLabel(challenge.challengeType)} • {challenge.participantCount} participants
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {challenge.inviteCode && (
                        <button
                          onClick={() => handleCopyCode(challenge.inviteCode!)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          {copiedCode === challenge.inviteCode ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              {challenge.inviteCode}
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/dashboard/challenges/${challenge.id}`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Your Progress
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {challenge.currentValue} / {challenge.targetValue}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (challenge.currentValue / challenge.targetValue) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Time remaining & leaderboard preview */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getDaysRemaining(challenge.endDate)} days left
                      </span>
                    </div>

                    {/* Top 3 preview */}
                    {challenge.leaderboard && challenge.leaderboard.length > 0 && (
                      <div className="flex items-center gap-1">
                        {challenge.leaderboard.slice(0, 3).map((entry, i) => (
                          <div
                            key={entry.userId}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0
                                ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : i === 1
                                  ? 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}
                            title={`#${entry.rank} ${entry.displayName}`}
                          >
                            {entry.displayName.charAt(0)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal would go here - simplified for now */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Challenge</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create a new study challenge from the dashboard widget for now.
            </p>
            <button
              onClick={() => {
                setShowCreateModal(false)
                router.push('/dashboard')
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
