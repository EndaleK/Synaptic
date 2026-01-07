'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Calendar,
  Clock,
  BookOpen,
  Target,
  ChevronRight,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Trash2,
  MoreVertical,
  FileText,
  Brain,
  TrendingUp,
  ArrowLeft,
  MessageSquare,
  Mic,
  Network,
  GraduationCap,
  Sparkles,
  FileQuestion,
  Trophy,
  RefreshCw,
  BookMarked,
} from 'lucide-react'

// Dynamically import StudySessionView to prevent SSR issues
const StudySessionView = dynamic(() => import('@/components/StudySessionView'), {
  ssr: false,
})

// Dynamically import StudyGuideTab for the Study Guide view
const StudyGuideTab = dynamic(() => import('@/components/StudyGuideTab'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
    </div>
  ),
})

interface StudyPlanDocument {
  documentId: string
  documentName: string
  estimatedHours: number
  priority: number
  // Today's session info for this document (if any)
  todaySession?: {
    sessionId: string
    topic: string
    topicPages?: { startPage?: number; endPage?: number }
  }
  // Next scheduled session (if no session today)
  nextSession?: {
    sessionId: string
    topic: string
    scheduledDate: string
    topicPages?: { startPage?: number; endPage?: number }
  }
}

interface StudyPlan {
  id: string
  title: string
  description?: string
  examDate: string
  examTitle?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'abandoned'
  totalEstimatedHours: number
  hoursCompleted: number
  dailyTargetHours: number
  startDate: string
  learningStyle: string
  weakTopics: string[]
  sessionsCompleted: number
  sessionsTotal: number
  documents: StudyPlanDocument[]
  createdAt: string
  updatedAt: string
}

interface TodaySession {
  id: string
  studyPlanId: string
  scheduledDate: string
  sessionType: string
  estimatedMinutes: number
  topics: Array<{ name: string; minutes: number; activityType: string }>
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'missed'
  planTitle?: string
  mode?: 'flashcards' | 'podcast' | 'mindmap' | 'exam' | 'chat' | 'reading' | 'review'
  documentId?: string
  documentName?: string
  topic?: string
  // Enhanced session fields
  hasDailyQuiz?: boolean
  hasWeeklyExam?: boolean
  weekNumber?: number
  topicPages?: { startPage?: number; endPage?: number }
}

// Learning mode configurations
const STUDY_MODES = {
  flashcards: { icon: BookOpen, label: 'Flashcards', color: 'from-indigo-500 to-violet-500', description: 'Review with spaced repetition' },
  chat: { icon: MessageSquare, label: 'Chat', color: 'from-blue-500 to-cyan-500', description: 'Ask questions about the material' },
  mindmap: { icon: Network, label: 'Mind Map', color: 'from-emerald-500 to-teal-500', description: 'Visualize concepts and connections' },
  podcast: { icon: Mic, label: 'Podcast', color: 'from-violet-500 to-purple-500', description: 'Listen and learn on the go' },
  exam: { icon: GraduationCap, label: 'Mock Exam', color: 'from-amber-500 to-orange-500', description: 'Test your knowledge' },
  reading: { icon: FileText, label: 'Reading', color: 'from-slate-500 to-gray-500', description: 'Deep dive into the material' },
  review: { icon: Brain, label: 'Review', color: 'from-pink-500 to-rose-500', description: 'Quick topic review' },
}

export default function StudyPlansPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  // Session view state
  const [activeSession, setActiveSession] = useState<TodaySession | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  // Main view tab: schedule (list) or study-guide (daily/weekly breakdown)
  const [mainView, setMainView] = useState<'schedule' | 'study-guide'>('schedule')

  const fetchPlans = useCallback(async () => {
    try {
      const status = activeTab === 'active' ? 'active' : activeTab === 'completed' ? 'completed' : 'all'
      const response = await fetch(`/api/study-plans?status=${status}`)
      if (response.ok) {
        const data = await response.json()
        const fetchedPlans = data.plans || []

        // Enrich each plan's documents with today's session info
        const today = new Date().toISOString().split('T')[0]
        const enrichedPlans = await Promise.all(
          fetchedPlans.map(async (plan: StudyPlan) => {
            if (!plan.documents || plan.documents.length === 0) return plan

            // Fetch sessions for this plan to find today's sessions per document
            try {
              const sessionsResponse = await fetch(
                `/api/study-plan-sessions?planId=${plan.id}&includeUpcoming=true`
              )
              if (!sessionsResponse.ok) return plan

              const sessionsData = await sessionsResponse.json()
              const sessions = sessionsData.sessions || []

              // Map sessions to documents
              const enrichedDocs = plan.documents.map((doc: StudyPlanDocument) => {
                // Find today's session for this document
                const todaySession = sessions.find(
                  (s: TodaySession) =>
                    s.documentId === doc.documentId &&
                    s.scheduledDate === today &&
                    s.status !== 'completed' &&
                    s.status !== 'skipped'
                )

                // Find next scheduled session if no today session
                const nextSession = !todaySession
                  ? sessions.find(
                      (s: TodaySession) =>
                        s.documentId === doc.documentId &&
                        s.scheduledDate > today &&
                        s.status === 'scheduled'
                    )
                  : undefined

                return {
                  ...doc,
                  todaySession: todaySession ? {
                    sessionId: todaySession.id,
                    topic: todaySession.topic || todaySession.topics?.[0]?.name || 'Study Session',
                    topicPages: todaySession.topicPages,
                  } : undefined,
                  nextSession: nextSession ? {
                    sessionId: nextSession.id,
                    topic: nextSession.topic || nextSession.topics?.[0]?.name || 'Study Session',
                    scheduledDate: nextSession.scheduledDate,
                    topicPages: nextSession.topicPages,
                  } : undefined,
                }
              })

              return { ...plan, documents: enrichedDocs }
            } catch (err) {
              console.error('Error fetching sessions for plan:', err)
              return plan
            }
          })
        )

        setPlans(enrichedPlans)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

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

  useEffect(() => {
    fetchPlans()
    fetchTodaySessions()
  }, [fetchPlans, fetchTodaySessions])

  // Reschedule missed sessions
  const handleReschedule = async () => {
    setRescheduling(true)
    try {
      const response = await fetch('/api/study-plan-sessions/reschedule', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.rescheduled > 0) {
          fetchTodaySessions()
          fetchPlans()
        }
      }
    } catch (error) {
      console.error('Error rescheduling sessions:', error)
    } finally {
      setRescheduling(false)
    }
  }

  // Start a study session
  const handleStartSession = (session: TodaySession) => {
    setActiveSession(session)
  }

  // Handle session completion
  const handleSessionComplete = () => {
    setActiveSession(null)
    fetchTodaySessions()
    fetchPlans()
  }

  // Navigate to learning mode from session view
  const handleNavigateToMode = (mode: string, contentId?: string) => {
    if (!activeSession) return

    const params = new URLSearchParams()
    params.set('mode', mode)
    if (activeSession.documentId) params.set('documentId', activeSession.documentId)
    if (activeSession.topic) params.set('sessionTopic', activeSession.topic)
    if (activeSession.topicPages?.startPage) params.set('startPage', activeSession.topicPages.startPage.toString())
    if (activeSession.topicPages?.endPage) params.set('endPage', activeSession.topicPages.endPage.toString())
    if (contentId) params.set('contentId', contentId)
    params.set('sessionId', activeSession.id)

    router.push(`/dashboard?${params.toString()}`)
  }

  const handleStatusChange = async (planId: string, newStatus: 'active' | 'paused' | 'completed') => {
    try {
      const response = await fetch(`/api/study-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        fetchPlans()
      }
    } catch (error) {
      console.error('Error updating plan status:', error)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/study-plans/${planId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setShowDeleteConfirm(null)
        fetchPlans()
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
    }
  }

  const getDaysUntilExam = (examDate: string) => {
    const exam = new Date(examDate)
    const today = new Date()
    const diffTime = exam.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressPercentage = (plan: StudyPlan) => {
    if (plan.sessionsTotal === 0) return 0
    return Math.round((plan.sessionsCompleted / plan.sessionsTotal) * 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'paused':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-3 h-3" />
      case 'paused':
        return <Pause className="w-3 h-3" />
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  Study Plans
                </h1>
                <p className="text-white/60 text-sm mt-1">
                  Manage your exam preparation schedules
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard?mode=study-plan')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/25"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>

          {/* Main View Tabs: Schedule vs Study Guide */}
          <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setMainView('schedule')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                mainView === 'schedule'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setMainView('study-guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                mainView === 'study-guide'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              Study Guide
            </button>
          </div>
        </div>
      </div>

      {/* Study Guide Tab */}
      {mainView === 'study-guide' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StudyGuideTab
            plans={plans}
            onNavigateToMode={(mode, documentId, sessionTopic, topicPages) => {
              const params = new URLSearchParams()
              params.set('mode', mode)
              if (documentId) params.set('documentId', documentId)
              if (sessionTopic) params.set('sessionTopic', sessionTopic)
              if (topicPages?.startPage) params.set('startPage', topicPages.startPage.toString())
              if (topicPages?.endPage) params.set('endPage', topicPages.endPage.toString())
              router.push(`/dashboard?${params.toString()}`)
            }}
          />
        </div>
      )}

      {/* Schedule Tab (original view) */}
      {mainView === 'schedule' && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Today's Sessions */}
        {todaySessions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Today&apos;s Study Sessions
              </h2>
              <button
                onClick={handleReschedule}
                disabled={rescheduling}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${rescheduling ? 'animate-spin' : ''}`} />
                Reschedule Missed
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todaySessions.map((session) => {
                const mode = session.mode || 'flashcards'
                const modeConfig = STUDY_MODES[mode] || STUDY_MODES.flashcards
                const ModeIcon = modeConfig.icon

                return (
                  <div
                    key={session.id}
                    className="p-5 bg-slate-800/50 border border-white/10 rounded-xl hover:border-white/20 transition-all"
                  >
                    {/* Header with mode icon */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${modeConfig.color} flex items-center justify-center shadow-lg`}>
                        <ModeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-white font-semibold truncate">{session.topic || session.planTitle || 'Study Session'}</p>
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            session.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : session.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : session.status === 'missed'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {session.status === 'in_progress' ? 'In Progress' : session.status === 'completed' ? 'Done' : session.status === 'missed' ? 'Missed' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">{modeConfig.label} • {session.estimatedMinutes} min</p>
                        {/* Quiz/Exam badges */}
                        <div className="flex gap-1.5 mt-1.5">
                          {session.hasDailyQuiz && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs">
                              <FileQuestion className="w-3 h-3" />
                              Quiz
                            </span>
                          )}
                          {session.hasWeeklyExam && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded text-xs">
                              <Trophy className="w-3 h-3" />
                              Week {session.weekNumber} Exam
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document info */}
                    {session.documentName && (
                      <div className="mb-4 p-2 bg-white/5 rounded-lg">
                        <p className="text-white/60 text-xs flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {session.documentName}
                          {session.topicPages?.startPage && session.topicPages?.endPage && (
                            <span className="ml-1 text-white/40">
                              (Pages {session.topicPages.startPage}-{session.topicPages.endPage})
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* Primary action - Start Session with integrated view */}
                      <button
                        onClick={() => handleStartSession(session)}
                        disabled={session.status === 'completed'}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${modeConfig.color} text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {session.status === 'completed' ? 'Completed' : 'Start Session'}
                      </button>
                    </div>

                    {/* Quick access to other modes */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-white/40 text-xs mb-2">Quick access:</p>
                      <div className="flex gap-1.5">
                        {(['flashcards', 'chat', 'mindmap', 'exam', 'podcast'] as const)
                          .slice(0, 5)
                          .map((altMode) => {
                            const altConfig = STUDY_MODES[altMode]
                            const AltIcon = altConfig.icon
                            return (
                              <button
                                key={altMode}
                                onClick={() => {
                                  const docParam = session.documentId ? `&documentId=${session.documentId}` : ''
                                  router.push(`/dashboard?mode=${altMode}${docParam}`)
                                }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                                title={altConfig.label}
                              >
                                <AltIcon className="w-4 h-4 text-white/50 group-hover:text-white" />
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['active', 'completed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setLoading(true)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No study plans yet</h3>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Create a study plan to organize your exam preparation with smart scheduling and progress tracking.
            </p>
            <button
              onClick={() => router.push('/dashboard?mode=study-plan')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Your First Plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => {
              const daysUntil = getDaysUntilExam(plan.examDate)
              const progress = getProgressPercentage(plan)
              const isExpanded = selectedPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className="bg-slate-800/50 border border-white/10 rounded-2xl hover:border-white/20 transition-all"
                >
                  {/* Main Row */}
                  <div
                    onClick={() => setSelectedPlan(isExpanded ? null : plan.id)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(plan.status)}`}>
                            {getStatusIcon(plan.status)}
                            {plan.status}
                          </span>
                        </div>
                        {plan.examTitle && plan.examTitle !== plan.title && (
                          <p className="text-white/60 text-sm mb-3">{plan.examTitle}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(plan.examDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className={`flex items-center gap-1.5 ${
                            daysUntil <= 3 ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : ''
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                            {daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? 'Today!' : 'Passed'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {plan.hoursCompleted.toFixed(1)}/{plan.totalEstimatedHours.toFixed(1)}h
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            {plan.documents?.length || 0} documents
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Progress Ring */}
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                              className="text-white/10"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="url(#progress-gradient)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={`${progress * 1.76} 176`}
                            />
                            <defs>
                              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#ec4899" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{progress}%</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-white/10 pt-5">
                      {/* Start Studying Now - Primary CTA */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          Start Studying Now
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {(['flashcards', 'chat', 'mindmap', 'exam', 'podcast'] as const).map((mode) => {
                            const config = STUDY_MODES[mode]
                            const Icon = config.icon
                            const firstDoc = plan.documents?.[0]
                            return (
                              <button
                                key={mode}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const docParam = firstDoc?.documentId ? `&documentId=${firstDoc.documentId}` : ''
                                  router.push(`/dashboard?mode=${mode}${docParam}`)
                                }}
                                className={`flex flex-col items-center gap-2 p-3 bg-gradient-to-br ${config.color} bg-opacity-10 hover:bg-opacity-20 border border-white/10 hover:border-white/20 rounded-xl transition-all group`}
                              >
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white text-xs font-medium">{config.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Documents with Actions */}
                        <div>
                          <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Study Materials
                          </h4>
                          <div className="space-y-2">
                            {plan.documents?.slice(0, 3).map((doc, i) => {
                              // Build session-aware navigation URL
                              const buildModeUrl = (mode: string) => {
                                const params = new URLSearchParams()
                                params.set('mode', mode)
                                params.set('documentId', doc.documentId)

                                if (doc.todaySession) {
                                  params.set('sessionId', doc.todaySession.sessionId)
                                  params.set('sessionTopic', doc.todaySession.topic)
                                  if (doc.todaySession.topicPages?.startPage) {
                                    params.set('startPage', doc.todaySession.topicPages.startPage.toString())
                                  }
                                  if (doc.todaySession.topicPages?.endPage) {
                                    params.set('endPage', doc.todaySession.topicPages.endPage.toString())
                                  }
                                }

                                return `/dashboard?${params.toString()}`
                              }

                              return (
                                <div key={i} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-white text-sm font-medium truncate flex-1">{doc.documentName}</p>
                                    <span className="text-white/40 text-xs flex-shrink-0">{doc.estimatedHours.toFixed(1)}h</span>
                                  </div>

                                  {/* Session info: topic + page range */}
                                  {doc.todaySession ? (
                                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                                      <span className="text-purple-400">📍</span>
                                      <span className="text-white/70 truncate">{doc.todaySession.topic}</span>
                                      {doc.todaySession.topicPages?.startPage && doc.todaySession.topicPages?.endPage && (
                                        <span className="text-white/40 flex-shrink-0">
                                          • Pages {doc.todaySession.topicPages.startPage}-{doc.todaySession.topicPages.endPage}
                                        </span>
                                      )}
                                    </div>
                                  ) : doc.nextSession ? (
                                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                                      <span className="text-amber-400">⏳</span>
                                      <span className="text-white/50 truncate">
                                        Next: {doc.nextSession.topic} on {new Date(doc.nextSession.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                                      <span className="text-white/30">—</span>
                                      <span className="text-white/40">No session scheduled</span>
                                    </div>
                                  )}

                                  <div className="flex gap-1">
                                    {(['flashcards', 'chat', 'mindmap'] as const).map((mode) => {
                                      const config = STUDY_MODES[mode]
                                      const Icon = config.icon
                                      return (
                                        <button
                                          key={mode}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(buildModeUrl(mode))
                                          }}
                                          className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg transition-colors"
                                          title={`${config.label}${doc.todaySession ? ` - ${doc.todaySession.topic}` : ''}`}
                                        >
                                          <Icon className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                            {(plan.documents?.length || 0) > 3 && (
                              <p className="text-white/40 text-xs pl-1">+{plan.documents.length - 3} more documents</p>
                            )}
                          </div>
                        </div>

                        {/* Weak Topics */}
                        {plan.weakTopics && plan.weakTopics.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Focus Areas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {plan.weakTopics.slice(0, 5).map((topic, i) => (
                                <span key={i} className="px-2.5 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-medium border border-amber-500/20">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Focus Areas
                            </h4>
                            <p className="text-white/40 text-sm">Complete some study sessions to identify weak areas</p>
                          </div>
                        )}

                        {/* Stats */}
                        <div>
                          <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Progress
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-white/50">Sessions</span>
                              <span className="text-white font-medium">{plan.sessionsCompleted}/{plan.sessionsTotal || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/50">Daily Target</span>
                              <span className="text-white font-medium">{plan.dailyTargetHours}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/50">Learning Style</span>
                              <span className="text-white font-medium capitalize">{plan.learningStyle}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                        {plan.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(plan.id, 'paused')
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            Pause Plan
                          </button>
                        )}
                        {plan.status === 'paused' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(plan.id, 'active')
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Resume Plan
                          </button>
                        )}
                        {plan.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(plan.id, 'completed')
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Expand this plan to show its schedule
                            setSelectedPlan(plan.id)
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          View Schedule
                        </button>
                        <div className="ml-auto relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(showDeleteConfirm === plan.id ? null : plan.id)
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {showDeleteConfirm === plan.id && (
                            <div className="absolute right-0 top-full mt-2 p-4 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 w-64">
                              <p className="text-white text-sm mb-3">Delete this study plan?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePlan(plan.id)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDeleteConfirm(null)
                                  }}
                                  className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Study Session View Modal */}
      {activeSession && (
        <StudySessionView
          sessionId={activeSession.id}
          planId={activeSession.studyPlanId}
          planTitle={activeSession.planTitle || 'Study Plan'}
          topic={activeSession.topic || activeSession.topics?.[0]?.name || 'Study Session'}
          topicPages={activeSession.topicPages}
          documentId={activeSession.documentId}
          documentName={activeSession.documentName}
          estimatedMinutes={activeSession.estimatedMinutes}
          sessionType={activeSession.sessionType}
          weekNumber={activeSession.weekNumber || 1}
          hasDailyQuiz={activeSession.hasDailyQuiz || false}
          hasWeeklyExam={activeSession.hasWeeklyExam || false}
          onClose={() => setActiveSession(null)}
          onComplete={handleSessionComplete}
          onNavigateToMode={handleNavigateToMode}
        />
      )}
    </div>
  )
}
