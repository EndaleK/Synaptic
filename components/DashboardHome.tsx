"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { BookOpen, MessageSquare, Mic, Network, Clock, PenTool, Youtube, GraduationCap, FileText, Flame, Zap, ChevronRight, BookMarked, Upload, TrendingUp, Eye, Headphones, Hand, BookText, Sparkles, ChevronDown, ChevronUp, ArrowRight } from "lucide-react"
import { useUIStore, useUserStore, useDocumentStore } from "@/lib/store/useStore"
import UsageWarningNotification from "@/components/UsageWarningNotification"
import NotificationBanner from "@/components/NotificationBanner"
import { notificationManager } from "@/lib/notifications"
import { analytics } from "@/lib/analytics"
import MilestoneCelebrationModal, { useMilestoneCelebration } from "@/components/MilestoneCelebrationModal"
import SmartRecommendations from "@/components/SmartRecommendations"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
  onOpenAssessment?: () => void
}

// Learning modes with mode-specific colors
const learningModes = [
  { id: "documents", name: "Documents", icon: FileText, description: "Manage files", href: "/dashboard/documents", color: "from-slate-500 to-slate-600", bgColor: "bg-slate-500/10", textColor: "text-slate-600 dark:text-slate-400" },
  { id: "chat", name: "Chat", icon: MessageSquare, description: "Ask & learn", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  { id: "flashcards", name: "Flashcards", icon: BookOpen, description: "Review cards", color: "from-indigo-500 to-indigo-600", bgColor: "bg-indigo-500/10", textColor: "text-indigo-600 dark:text-indigo-400" },
  { id: "podcast", name: "Podcast", icon: Mic, description: "Listen & learn", color: "from-violet-500 to-violet-600", bgColor: "bg-violet-500/10", textColor: "text-violet-600 dark:text-violet-400" },
  { id: "mindmap", name: "Mind Map", icon: Network, description: "Visualize", color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-500/10", textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "exam", name: "Mock Exam", icon: GraduationCap, description: "Test yourself", color: "from-amber-500 to-amber-600", bgColor: "bg-amber-500/10", textColor: "text-amber-600 dark:text-amber-400" },
  { id: "writer", name: "Writer", icon: PenTool, description: "Write essays", color: "from-rose-500 to-rose-600", bgColor: "bg-rose-500/10", textColor: "text-rose-600 dark:text-rose-400" },
  { id: "video", name: "Video", icon: Youtube, description: "YouTube", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  { id: "quick-summary", name: "Summary", icon: Clock, description: "Quick 5min", color: "from-cyan-500 to-cyan-600", bgColor: "bg-cyan-500/10", textColor: "text-cyan-600 dark:text-cyan-400" },
]

// Types for primary action state
type ActionState =
  | { type: 'loading' }
  | { type: 'flashcards_due'; count: number }
  | { type: 'continue_document'; documentName: string; documentId: string }
  | { type: 'upload_first' }

export default function DashboardHome({ onModeSelect }: DashboardHomeProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const { setActiveMode } = useUIStore()
  const { setCurrentDocument } = useDocumentStore()
  const [currentStreak, setCurrentStreak] = useState<number>(0)
  const [isLoadingStreak, setIsLoadingStreak] = useState(true)
  const [todayGoalCurrent, setTodayGoalCurrent] = useState(0)
  const [weeklyStats, setWeeklyStats] = useState({ cardsReviewed: 0, minutesStudied: 0, daysActive: 0 })
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; type: string; name: string; timestamp: string; duration?: string; source?: string }>>([])
  const [actionState, setActionState] = useState<ActionState>({ type: 'loading' })
  const { userProfile, learningProfile } = useUserStore()
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [showAllUsage, setShowAllUsage] = useState(false)
  const [monthlyUsage, setMonthlyUsage] = useState({
    documents: { used: 0, limit: 10 },
    flashcards: { used: 0, limit: 100 },
    podcasts: { used: 0, limit: 5 },
    mindmaps: { used: 0, limit: 10 },
    exams: { used: 0, limit: 5 },
    videos: { used: 0, limit: 10 }
  })
  const [learningStyleExpanded, setLearningStyleExpanded] = useState(true)

  // Prevent hydration mismatch
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check for milestone celebration
  const { showCelebration, closeCelebration } = useMilestoneCelebration(currentStreak)

  // Update and fetch streak on mount
  useEffect(() => {
    const updateStreak = async () => {
      try {
        const updateResponse = await fetch('/api/streak/update', {
          method: 'POST',
          credentials: 'include'
        })

        if (updateResponse.ok) {
          const data = await updateResponse.json()
          setCurrentStreak(data.currentStreak || 0)
        }
      } catch (error) {
        console.error('Error updating streak:', error)
      } finally {
        setIsLoadingStreak(false)
      }
    }

    updateStreak()
  }, [])

  // Fetch today's goal progress and primary action state
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch flashcard review queue
        const reviewResponse = await fetch('/api/flashcards/review-queue', {
          credentials: 'include'
        })

        if (reviewResponse.ok) {
          const data = await reviewResponse.json()
          const reviewed = data.stats?.reviewedToday || 0
          const dueCount = data.stats?.totalDue || 0
          setTodayGoalCurrent(reviewed)

          if (dueCount > 0) {
            setActionState({ type: 'flashcards_due', count: dueCount })
            return
          }
        }

        // Check for recent documents
        const docsResponse = await fetch('/api/documents?limit=1', {
          credentials: 'include'
        })

        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          if (docsData.documents && docsData.documents.length > 0) {
            setActionState({
              type: 'continue_document',
              documentName: docsData.documents[0].file_name,
              documentId: docsData.documents[0].id
            })
            return
          }
        }

        setActionState({ type: 'upload_first' })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setActionState({ type: 'upload_first' })
      }
    }

    fetchData()
  }, [])

  // Fetch weekly stats
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const response = await fetch('/api/study-statistics', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setWeeklyStats({
            cardsReviewed: data.weeklyCards || 0,
            minutesStudied: data.weeklyMinutes || 0,
            daysActive: data.daysActive || 0
          })
        }
      } catch (error) {
        console.error('Error fetching weekly stats:', error)
      }
    }

    fetchWeeklyStats()
  }, [])

  // Fetch recent activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const response = await fetch('/api/recent-content?limit=5', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setRecentActivity(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error)
      }
    }

    fetchRecentActivity()
  }, [])

  // Fetch monthly usage
  useEffect(() => {
    const fetchMonthlyUsage = async () => {
      try {
        const response = await fetch('/api/usage', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.limits) {
            setMonthlyUsage({
              documents: { used: data.limits.documents?.used || 0, limit: data.limits.documents?.limit || 10 },
              flashcards: { used: data.limits.flashcards?.used || 0, limit: data.limits.flashcards?.limit || 100 },
              podcasts: { used: data.limits.podcasts?.used || 0, limit: data.limits.podcasts?.limit || 5 },
              mindmaps: { used: data.limits.mindmaps?.used || 0, limit: data.limits.mindmaps?.limit || 10 },
              exams: { used: data.limits.exams?.used || 0, limit: data.limits.exams?.limit || 5 },
              videos: { used: data.limits.videos?.used || 0, limit: data.limits.videos?.limit || 10 }
            })
          }
        }
      } catch (error) {
        console.error('Error fetching monthly usage:', error)
      }
    }

    fetchMonthlyUsage()
  }, [userProfile?.subscription_tier])

  // Trigger browser notifications (once per session)
  useEffect(() => {
    const NOTIFICATION_SESSION_KEY = 'dashboard-notification-shown'

    if (sessionStorage.getItem(NOTIFICATION_SESSION_KEY)) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        if (!notificationManager.isEnabled()) return

        const response = await fetch('/api/flashcards/review-queue', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          const dueCount = data.stats?.totalDue || 0

          if (dueCount > 0) {
            await notificationManager.showDueFlashcards(dueCount)
            analytics.notificationClicked('due_flashcards')
          } else if (currentStreak > 0) {
            await notificationManager.showStreakReminder(currentStreak)
            analytics.notificationClicked('streak_reminder')
          }
        }

        sessionStorage.setItem(NOTIFICATION_SESSION_KEY, 'true')
      } catch (error) {
        console.error('[DashboardHome] Error checking notifications:', error)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [currentStreak])

  const handleModeClick = (mode: typeof learningModes[0]) => {
    if (mode.href) {
      router.push(mode.href)
    } else {
      onModeSelect(mode.id)
    }
  }

  const handlePrimaryAction = async () => {
    switch (actionState.type) {
      case 'flashcards_due':
        setActiveMode('flashcards')
        break
      case 'continue_document':
        try {
          const response = await fetch(`/api/documents/${actionState.documentId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.document) {
              setCurrentDocument({
                id: data.document.id,
                name: data.document.file_name,
                content: data.document.extracted_text || '',
                fileType: data.document.file_type,
                storagePath: data.document.storage_path,
                fileSize: data.document.file_size,
              })
              setActiveMode('chat')
            }
          }
        } catch (error) {
          console.error('Error loading document:', error)
        }
        break
      case 'upload_first':
        setActiveMode('flashcards')
        break
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'yesterday'
    return `${diffDays}d ago`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'flashcard': return BookOpen
      case 'podcast': return Mic
      case 'mindmap': return Network
      case 'quick-summary': return Clock
      default: return FileText
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-gradient-to-r from-violet-500 to-pink-500'
  }

  const usageItems = [
    { key: 'documents', label: 'Documents', icon: FileText, ...monthlyUsage.documents },
    { key: 'flashcards', label: 'Flashcards', icon: Zap, ...monthlyUsage.flashcards },
    { key: 'podcasts', label: 'Podcasts', icon: Mic, ...monthlyUsage.podcasts },
    { key: 'mindmaps', label: 'Mind Maps', icon: Network, ...monthlyUsage.mindmaps },
    { key: 'exams', label: 'Mock Exams', icon: GraduationCap, ...monthlyUsage.exams },
    { key: 'videos', label: 'Videos', icon: Youtube, ...monthlyUsage.videos },
  ]

  const visibleUsageItems = showAllUsage ? usageItems : usageItems.slice(0, 3)

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-[#0a0a0f] dark:via-[#0f0f18] dark:to-[#0a0a0f]">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-violet-200/20 via-pink-200/10 to-transparent dark:from-violet-900/10 dark:via-pink-900/5 blur-3xl" />
        <div className="absolute -bottom-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-blue-200/20 via-cyan-200/10 to-transparent dark:from-blue-900/10 dark:via-cyan-900/5 blur-3xl" />
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-4 lg:py-8">

        {/* Alerts */}
        <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <UsageWarningNotification />
          <NotificationBanner />
        </div>

        {/* Hero Section */}
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Greeting */}
            <div className="space-y-0.5">
              <p className="text-xs font-medium tracking-wide text-violet-600 dark:text-violet-400 uppercase">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="text-gray-900 dark:text-white">{getGreeting()}, </span>
                <span className="bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                  {isClient && isUserLoaded ? (user?.firstName || user?.username || 'there') : 'there'}
                </span>
              </h1>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
                Ready to continue your learning journey?
              </p>
            </div>

            {/* Stats Card */}
            <div className="flex items-center gap-5 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-white/10 shadow-xl shadow-gray-200/20 dark:shadow-none">
              {/* Streak */}
              <div className="flex items-center gap-2.5">
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
                  currentStreak > 0
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-white' : 'text-gray-400'}`} />
                  {currentStreak > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[9px] font-bold text-yellow-900 shadow-lg">
                      {currentStreak > 99 ? '99+' : currentStreak}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                    {isLoadingStreak ? '—' : currentStreak}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">day streak</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent" />

              {/* Today's Progress */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                    <circle
                      cx="24" cy="24" r="20" fill="none" stroke="url(#progressGradient)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${Math.min((todayGoalCurrent / 10) * 125.6, 125.6)} 125.6`}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7B3FF2" />
                        <stop offset="100%" stopColor="#E91E8C" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{todayGoalCurrent}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Today</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{10 - todayGoalCurrent} cards left</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Recommendations & Weekly Progress - Side by Side */}
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Smart Recommendations - AI-powered "What to study next" */}
            <SmartRecommendations maxItems={3} showStats={true} />

            {/* Weekly Progress */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">This Week</h3>
                <div className="flex items-center gap-1.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div
                      key={index}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                        index < weeklyStats.daysActive
                          ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{weeklyStats.cardsReviewed}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">cards reviewed</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-500/10 dark:to-pink-500/10">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div>
                      <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{Math.round(weeklyStats.minutesStudied / 60 * 10) / 10}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">hours studied</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{weeklyStats.daysActive}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">days active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Recent Content */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Content</h3>
                </div>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 group"
                >
                  View All <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {(showAllRecent ? recentActivity : recentActivity.slice(0, 3)).map((activity) => {
                    const Icon = getActivityIcon(activity.type)
                    return (
                      <div key={activity.id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-500/20 dark:to-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{activity.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{activity.source || activity.type}</p>
                        </div>
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{formatDate(activity.timestamp)}</p>
                      </div>
                    )
                  })}
                  {recentActivity.length > 3 && (
                    <button
                      onClick={() => setShowAllRecent(!showAllRecent)}
                      className="w-full text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-1.5 flex items-center justify-center gap-1 transition-colors"
                    >
                      {showAllRecent ? 'Show Less' : `Show ${recentActivity.length - 3} More`}
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showAllRecent ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No recent content yet</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Start learning to see your activity here</p>
                </div>
              )}
            </div>

            {/* Monthly Usage */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Monthly Usage</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Resets on the 1st</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {visibleUsageItems.map((item) => {
                  const Icon = item.icon
                  const percentage = Math.min((item.used / item.limit) * 100, 100)
                  const isOverLimit = item.used >= item.limit
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${isOverLimit ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                          {item.used}<span className="text-gray-400 font-normal">/{item.limit}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${getUsageColor(item.used, item.limit)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                {usageItems.length > 3 && (
                  <button
                    onClick={() => setShowAllUsage(!showAllUsage)}
                    className="w-full text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-1.5 flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllUsage ? 'Show Less' : `Show all (${usageItems.length - 3} more)`}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showAllUsage ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {userProfile?.subscription_tier !== 'premium' && (
                <button
                  onClick={() => router.push('/pricing')}
                  className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02]"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Learning Modes Grid */}
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Choose how to learn
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">9 learning modes</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {learningModes.map((mode, index) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode)}
                  className="group relative p-4 sm:p-5 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 hover:border-transparent hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-300 text-left overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Hover gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} />

                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-lg ${mode.bgColor} flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300`}>
                      <Icon className={`w-5 h-5 ${mode.textColor} group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-white transition-colors duration-300">{mode.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 transition-colors duration-300 mt-0.5">{mode.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Learning Style Discovery Card */}
        {!learningProfile && (
          <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="relative overflow-hidden p-5 sm:p-6 rounded-xl bg-violet-600">
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        Discover Your Learning Style
                      </h3>
                      <p className="text-sm text-white/70">
                        Take our 2-minute assessment for personalized experiences
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLearningStyleExpanded(!learningStyleExpanded)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {learningStyleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {learningStyleExpanded && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: Eye, label: "Visual" },
                        { icon: Headphones, label: "Auditory" },
                        { icon: Hand, label: "Kinesthetic" },
                        { icon: BookText, label: "Reading" },
                      ].map((style) => (
                        <div key={style.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
                          <style.icon className="w-4 h-4 text-white" />
                          <span className="text-xs font-medium text-white">{style.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onModeSelect('quiz')}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 text-violet-600 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <Sparkles className="w-4 h-4" />
                      Take Assessment
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Subscription Footer */}
        {userProfile?.subscription_tier !== 'premium' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
            <div className="relative overflow-hidden p-4 sm:p-6 rounded-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white/10 dark:via-white/5 dark:to-white/10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTZoMnptMC0xMHY2aC0ydi02aDJ6bTAtMTB2NmgtMlY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Free Plan</h3>
                    <p className="text-xs text-gray-400">Unlock unlimited access with Premium</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  Upgrade to Premium
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer spacer */}
        <div className="h-16 lg:h-6" />
      </div>

      {/* Milestone Celebration Modal */}
      <MilestoneCelebrationModal
        days={currentStreak}
        isOpen={showCelebration}
        onClose={closeCelebration}
      />
    </div>
  )
}
