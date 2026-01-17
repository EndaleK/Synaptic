'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Plus,
  ChevronRight,
  Play,
  Sparkles,
  BookOpen,
  MessageSquare,
  Network,
  Mic,
  GraduationCap,
  FileText,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import TodayView from './TodayView'
import ScheduleView from './ScheduleView'
import ProgressPanel from './ProgressPanel'

// Learning mode configurations
export const STUDY_MODES = {
  flashcards: { icon: BookOpen, label: 'Flashcards', color: 'from-indigo-500 to-violet-500', description: 'Review with spaced repetition' },
  chat: { icon: MessageSquare, label: 'Chat', color: 'from-blue-500 to-cyan-500', description: 'Ask questions about the material' },
  mindmap: { icon: Network, label: 'Mind Map', color: 'from-emerald-500 to-teal-500', description: 'Visualize concepts and connections' },
  podcast: { icon: Mic, label: 'Podcast', color: 'from-violet-500 to-purple-500', description: 'Listen and learn on the go' },
  exam: { icon: GraduationCap, label: 'Mock Exam', color: 'from-amber-500 to-orange-500', description: 'Test your knowledge' },
}

export interface StudyPlan {
  id: string
  title: string
  examDate: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'abandoned'
  totalEstimatedHours: number
  hoursCompleted: number
  sessionsCompleted: number
  sessionsTotal: number
}

export interface TodaySession {
  id: string
  studyPlanId: string
  scheduledDate: string
  sessionType: string
  estimatedMinutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'missed'
  planTitle?: string
  mode?: keyof typeof STUDY_MODES
  documentId?: string
  documentName?: string
  topic?: string
  topicPages?: { startPage?: number; endPage?: number }
}

interface StudyStats {
  streak: number
  totalMinutesToday: number
  dailyGoal: number
  weeklyProgress: number[]
  daysActive: number
}

interface UnifiedStudyPlannerProps {
  onNavigateToMode?: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: { startPage?: number; endPage?: number }) => void
}

export default function UnifiedStudyPlanner({ onNavigateToMode }: UnifiedStudyPlannerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'today' | 'schedule' | 'progress'>('today')
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [stats, setStats] = useState<StudyStats>({
    streak: 0,
    totalMinutesToday: 0,
    dailyGoal: 120,
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
    daysActive: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Fetch study plans
  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch('/api/study-plans?status=active')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
        if (data.plans?.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data.plans[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }, [selectedPlanId])

  // Fetch today's sessions
  const fetchTodaySessions = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/study-plan-sessions?date=${today}`)
      if (response.ok) {
        const data = await response.json()
        setTodaySessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching today sessions:', error)
    }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const [streakRes, statsRes] = await Promise.all([
        fetch('/api/streak/update', { method: 'POST' }),
        fetch('/api/study-statistics')
      ])

      if (streakRes.ok) {
        const streakData = await streakRes.json()
        setStats(prev => ({ ...prev, streak: streakData.currentStreak || 0 }))
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(prev => ({
          ...prev,
          totalMinutesToday: statsData.totalMinutesToday || 0,
          daysActive: statsData.daysActive || 0,
          weeklyProgress: statsData.weeklyProgress || prev.weeklyProgress
        }))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchPlans(),
        fetchTodaySessions(),
        fetchStats()
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchPlans, fetchTodaySessions, fetchStats])

  const handleNavigateToMode = (
    mode: string,
    documentId?: string,
    sessionTopic?: string,
    topicPages?: { startPage?: number; endPage?: number }
  ) => {
    if (onNavigateToMode) {
      onNavigateToMode(mode, documentId, sessionTopic, topicPages)
    } else {
      const params = new URLSearchParams()
      params.set('mode', mode)
      if (documentId) params.set('documentId', documentId)
      if (sessionTopic) params.set('sessionTopic', sessionTopic)
      if (topicPages?.startPage) params.set('startPage', topicPages.startPage.toString())
      if (topicPages?.endPage) params.set('endPage', topicPages.endPage.toString())
      router.push(`/dashboard?${params.toString()}`)
    }
  }

  const handleSessionStart = async (session: TodaySession) => {
    // Navigate to the session's mode with document context
    handleNavigateToMode(
      session.mode || 'flashcards',
      session.documentId,
      session.topic,
      session.topicPages
    )
  }

  const handleSessionComplete = async (sessionId: string) => {
    try {
      await fetch(`/api/study-plan-sessions/${sessionId}/complete`, {
        method: 'POST'
      })
      await fetchTodaySessions()
      await fetchStats()
    } catch (error) {
      console.error('Error completing session:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Loading your study plan...</p>
        </div>
      </div>
    )
  }

  // Check if user has any plans
  const hasPlans = plans.length > 0
  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0]
  const completedSessions = todaySessions.filter(s => s.status === 'completed').length
  const pendingSessions = todaySessions.filter(s => s.status === 'scheduled').length
  const progressPercent = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.totalMinutesToday / stats.dailyGoal) * 100))
    : 0

  return (
    <div className="h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Study Planner</h1>
                <p className="text-white/50 text-sm">Plan, track, and master your learning</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-white font-medium">{stats.streak}</span>
                <span className="text-white/40 text-sm">day streak</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">{progressPercent}%</span>
                <span className="text-white/40 text-sm">daily goal</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'today'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Target className="w-4 h-4" />
              Today
              {pendingSessions > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {pendingSessions}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'progress'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Progress
            </button>
          </div>
        </div>

        {/* Empty State - No Plans */}
        {!hasPlans && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No study plans yet</h2>
            <p className="text-white/50 max-w-md mx-auto mb-6">
              Create a study plan to organize your exam preparation with smart scheduling, progress tracking, and AI-generated study content.
            </p>
            <button
              onClick={() => router.push('/dashboard?mode=study-plan')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/25"
            >
              <Plus className="w-5 h-5" />
              Create Your First Plan
            </button>
          </div>
        )}

        {/* Tab Content */}
        {hasPlans && (
          <div className="space-y-6">
            {activeTab === 'today' && (
              <TodayView
                sessions={todaySessions}
                stats={stats}
                activePlan={activePlan}
                onSessionStart={handleSessionStart}
                onSessionComplete={handleSessionComplete}
                onNavigateToMode={handleNavigateToMode}
                onCreatePlan={() => router.push('/dashboard?mode=study-plan')}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleView
                plans={plans}
                selectedPlanId={selectedPlanId}
                onSelectPlan={setSelectedPlanId}
                onNavigateToMode={handleNavigateToMode}
                onRefresh={fetchTodaySessions}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressPanel
                stats={stats}
                plans={plans}
                activePlan={activePlan}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
