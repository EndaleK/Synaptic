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
import ExamReadinessWidget from "@/components/ExamReadinessWidget"
import WeakTopicsPanel from "@/components/WeakTopicsPanel"
import StudyPlanWizard from "@/components/StudyPlanWizard"
import LeaderboardWidget from "@/components/LeaderboardWidget"
import StudyChallengeWidget, { CreateChallengeModal } from "@/components/StudyChallengeWidget"
import ReferralWidget from "@/components/ReferralWidget"
import { AchievementUnlockToast } from "@/components/AchievementBadge"
import type { AchievementDefinition } from "@/lib/achievements"

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
  const { userProfile, hasCompletedAssessment } = useUserStore()
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
  const [showStudyPlanWizard, setShowStudyPlanWizard] = useState(false)
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false)
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementDefinition[]>([])

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

  // Apply pending referral code (from signup flow)
  useEffect(() => {
    const applyPendingReferral = async () => {
      const pendingCode = localStorage.getItem('pending_referral_code')
      if (!pendingCode) return

      try {
        const response = await fetch('/api/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ referral_code: pendingCode })
        })

        if (response.ok) {
          console.log('[DashboardHome] Referral code applied successfully')
          // Clear the pending code
          localStorage.removeItem('pending_referral_code')
        } else {
          const data = await response.json()
          // If already referred or invalid, just clear it
          if (data.error?.includes('already') || data.error?.includes('Invalid')) {
            localStorage.removeItem('pending_referral_code')
          }
        }
      } catch (error) {
        console.error('[DashboardHome] Error applying referral code:', error)
      }
    }

    applyPendingReferral()
  }, [])

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
    <div className="min-h-full bg-[#fafbfc] dark:bg-[#0a0a0f] font-body relative overflow-hidden">
      {/* Layered atmospheric background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-white to-pink-50/30 dark:from-violet-950/20 dark:via-[#0a0a0f] dark:to-pink-950/10" />

        {/* Animated floating orbs */}
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-400/20 via-purple-300/10 to-transparent dark:from-violet-600/10 dark:via-purple-500/5 blur-3xl animate-float-orb" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-pink-300/20 via-rose-200/10 to-transparent dark:from-pink-600/10 dark:via-rose-500/5 blur-3xl animate-float-orb" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[50%] left-[50%] w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-200/10 via-cyan-100/5 to-transparent dark:from-blue-700/5 dark:via-cyan-600/3 blur-3xl animate-float-orb" style={{ animationDelay: '-14s' }} />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Alerts */}
        <div className="space-y-2 mb-8">
          <UsageWarningNotification />
          <NotificationBanner />
        </div>

        {/* Hero Section - Orchestrated reveal */}
        <section className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Greeting */}
            <div className="space-y-2 animate-hero-reveal">
              <p className="text-[22px] font-semibold tracking-[0.15em] text-violet-600 dark:text-violet-400 uppercase font-body">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.1]">
                <span className="text-gray-900 dark:text-white">{getGreeting()}, </span>
                <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent animate-gradient-border bg-[length:200%_200%]">
                  {isClient && isUserLoaded ? (user?.firstName || user?.username || 'there') : 'there'}
                </span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-body font-light max-w-md">
                Ready to continue your learning journey?
              </p>
            </div>

            {/* Stats Card - Glass morphism */}
            <div className="animate-hero-reveal stagger-2 flex items-center gap-6 p-5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 shadow-2xl shadow-violet-500/5 dark:shadow-none">
              {/* Streak */}
              <div className="flex items-center gap-3">
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  currentStreak > 0
                    ? 'bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 shadow-xl shadow-orange-500/40'
                    : 'bg-gray-100 dark:bg-gray-800/50'
                }`}>
                  <Flame className={`w-7 h-7 ${currentStreak > 0 ? 'text-white animate-fire-dance' : 'text-gray-400'}`} />
                  {currentStreak > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center text-[10px] font-black text-amber-900 shadow-lg ring-2 ring-white dark:ring-gray-900">
                      {currentStreak > 99 ? '99+' : currentStreak}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-display font-black text-gray-900 dark:text-white tabular-nums">
                    {isLoadingStreak ? '—' : currentStreak}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">day streak</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-300 dark:via-white/20 to-transparent" />

              {/* Today's Progress */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-white/10" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke="url(#progressGradient2)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${Math.min((todayGoalCurrent / 10) * 150.8, 150.8)} 150.8`}
                      className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(123,63,242,0.5)]"
                    />
                    <defs>
                      <linearGradient id="progressGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7B3FF2" />
                        <stop offset="50%" stopColor="#E91E8C" />
                        <stop offset="100%" stopColor="#FF6B35" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-display font-black text-gray-900 dark:text-white">{todayGoalCurrent}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Today</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{Math.max(0, 10 - todayGoalCurrent)} cards left</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Recommendations & Weekly Progress - Side by Side */}
        <section className="mb-10 animate-hero-reveal stagger-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Smart Recommendations - AI-powered "What to study next" */}
            <SmartRecommendations maxItems={3} showStats={true} />

            {/* Weekly Progress - Enhanced card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/20 dark:shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">This Week</h3>
                <div className="flex items-center gap-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                        index < weeklyStats.daysActive
                          ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-violet-500/30 scale-105'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50/50 dark:from-indigo-500/10 dark:to-violet-500/5 border border-indigo-100/50 dark:border-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-black text-gray-900 dark:text-white tabular-nums">{weeklyStats.cardsReviewed}</p>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">cards reviewed</p>
                    </div>
                  </div>
                </div>
                <div className="group p-4 rounded-xl bg-gradient-to-br from-violet-50 to-pink-50/50 dark:from-violet-500/10 dark:to-pink-500/5 border border-violet-100/50 dark:border-violet-500/10 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-black text-gray-900 dark:text-white tabular-nums">{Math.round(weeklyStats.minutesStudied / 60 * 10) / 10}</p>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">hours studied</p>
                    </div>
                  </div>
                </div>
                <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-500/10 dark:to-teal-500/5 border border-emerald-100/50 dark:border-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-black text-gray-900 dark:text-white tabular-nums">{weeklyStats.daysActive}</p>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">days active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Exam Readiness Section - Hero Feature */}
        <section className="mb-10 animate-hero-reveal stagger-4">
          {/* Create Study Plan Card */}
          <div className="mb-4 sm:mb-5">
            <button
              onClick={() => setShowStudyPlanWizard(true)}
              className="w-full group relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 dark:from-violet-500/5 dark:via-purple-500/3 dark:to-pink-500/5 backdrop-blur-xl border border-violet-200/50 dark:border-violet-500/20 hover:border-violet-400/50 dark:hover:border-violet-400/30 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-500 text-left overflow-hidden"
            >
              {/* Background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Create Study Plan
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full">New</span>
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Upload your syllabus and let AI create an optimized study schedule
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-violet-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <ExamReadinessWidget
              onViewDetails={() => onModeSelect('exam')}
            />
            <WeakTopicsPanel
              onGenerateFlashcards={(topic) => {
                onModeSelect('flashcards')
              }}
              onStartQuiz={(topic) => {
                onModeSelect('exam')
              }}
              onReviewFlashcards={(topic) => {
                onModeSelect('flashcards')
              }}
            />
          </div>
        </section>

        {/* Study Plan Wizard Modal */}
        {showStudyPlanWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowStudyPlanWizard(false)}
            />
            {/* Wizard */}
            <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <StudyPlanWizard
                onClose={() => setShowStudyPlanWizard(false)}
                onComplete={(planId) => {
                  setShowStudyPlanWizard(false)
                  // Optionally navigate to the study plan or refresh data
                  console.log('[DashboardHome] Study plan created:', planId)
                }}
              />
            </div>
          </div>
        )}

        {/* Learning Modes Grid - Dramatic redesign */}
        <section className="mb-10 animate-hero-reveal stagger-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                Choose how to learn
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pick your perfect study mode</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">9 modes</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {learningModes.map((mode, index) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode)}
                  className="group relative p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 hover:border-transparent hover:shadow-2xl hover:shadow-violet-500/10 dark:hover:shadow-none transition-all duration-500 text-left overflow-hidden hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Animated gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl`} />

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />

                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl ${mode.bgColor} flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                      <Icon className={`w-6 h-6 ${mode.textColor} group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <h3 className="text-base font-display font-bold text-gray-900 dark:text-white group-hover:text-white transition-colors duration-300">{mode.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/80 transition-colors duration-300 mt-1 font-medium">{mode.description}</p>
                  </div>

                  {/* Corner accent */}
                  <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500`} />
                </button>
              )
            })}
          </div>
        </section>

        {/* Social & Engagement - Leaderboard, Challenges & Referrals */}
        <section className="mb-10 animate-hero-reveal stagger-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                Community
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Compete with friends, take on challenges, and earn rewards</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <LeaderboardWidget
              limit={5}
              onViewAll={() => router.push('/dashboard/leaderboard')}
            />
            <StudyChallengeWidget
              onCreateChallenge={() => setShowCreateChallengeModal(true)}
              onViewAll={() => router.push('/dashboard/challenges')}
            />
            <ReferralWidget
              compact={false}
              onViewAll={() => router.push('/dashboard/referrals')}
            />
          </div>
        </section>

        {/* Stats Grid - Recent Content & Monthly Usage */}
        <section className="mb-10 animate-hero-reveal stagger-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Recent Content - Enhanced */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/20 dark:shadow-none">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-display font-bold text-gray-900 dark:text-white">Recent Content</h3>
                </div>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1.5 group px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                >
                  View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {(showAllRecent ? recentActivity : recentActivity.slice(0, 3)).map((activity, index) => {
                    const Icon = getActivityIcon(activity.type)
                    return (
                      <div
                        key={activity.id}
                        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50/50 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-500/20 dark:to-pink-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{activity.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{activity.source || activity.type}</p>
                        </div>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{formatDate(activity.timestamp)}</p>
                      </div>
                    )
                  })}
                  {recentActivity.length > 3 && (
                    <button
                      onClick={() => setShowAllRecent(!showAllRecent)}
                      className="w-full text-center text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-2 flex items-center justify-center gap-1.5 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      {showAllRecent ? 'Show Less' : `Show ${recentActivity.length - 3} More`}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllRecent ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No recent content yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start learning to see your activity here</p>
                </div>
              )}
            </div>

            {/* Monthly Usage - Enhanced */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/20 dark:shadow-none">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-gradient-border bg-[length:200%_200%]">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-gray-900 dark:text-white">Monthly Usage</h3>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resets on the 1st</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {visibleUsageItems.map((item) => {
                  const Icon = item.icon
                  const percentage = Math.min((item.used / item.limit) * 100, 100)
                  const isOverLimit = item.used >= item.limit
                  return (
                    <div key={item.key} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <span className={`text-sm font-display font-bold tabular-nums ${isOverLimit ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                          {item.used}<span className="text-gray-400 font-normal text-xs">/{item.limit}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${getUsageColor(item.used, item.limit)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                {usageItems.length > 3 && (
                  <button
                    onClick={() => setShowAllUsage(!showAllUsage)}
                    className="w-full text-center text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-2 flex items-center justify-center gap-1.5 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    {showAllUsage ? 'Show Less' : `Show all (${usageItems.length - 3} more)`}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllUsage ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {userProfile?.subscription_tier !== 'premium' && (
                <button
                  onClick={() => router.push('/pricing')}
                  className="w-full mt-5 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] animate-gradient-border bg-[length:200%_200%]"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Learning Style Discovery Card - Enhanced */}
        {!hasCompletedAssessment && (
          <section className="mb-10 animate-hero-reveal stagger-7">
            <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-400 to-orange-400">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              </div>

              {/* Floating accent orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float-orb" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-300/20 rounded-full blur-3xl animate-float-orb" style={{ animationDelay: '-5s' }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-xl">
                      <Sparkles className="w-7 h-7 text-white animate-sparkle" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
                        Discover Your Learning Style
                      </h3>
                      <p className="text-sm text-white/70 font-medium mt-1">
                        Take our 2-minute assessment for personalized experiences
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLearningStyleExpanded(!learningStyleExpanded)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:scale-110"
                  >
                    {learningStyleExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {learningStyleExpanded && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Eye, label: "Visual" },
                        { icon: Headphones, label: "Auditory" },
                        { icon: Hand, label: "Kinesthetic" },
                        { icon: BookText, label: "Reading" },
                      ].map((style, index) => (
                        <div
                          key={style.label}
                          className="flex items-center gap-3 p-3.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <style.icon className="w-5 h-5 text-white" />
                          <span className="text-sm font-semibold text-white">{style.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onModeSelect('quiz')}
                      className="group flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-orange-600 rounded-xl font-bold text-sm shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.03]"
                    >
                      <Sparkles className="w-5 h-5 group-hover:animate-sparkle" />
                      Take Assessment
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Milestone Celebration Modal */}
      <MilestoneCelebrationModal
        days={currentStreak}
        isOpen={showCelebration}
        onClose={closeCelebration}
      />

      {/* Achievement Unlock Toast - Shows newly unlocked achievements */}
      {newlyUnlockedAchievements.length > 0 && (
        <AchievementUnlockToast
          achievement={newlyUnlockedAchievements[0]}
          onClose={() => {
            setNewlyUnlockedAchievements(prev => prev.slice(1))
          }}
        />
      )}

      {/* Create Challenge Modal */}
      <CreateChallengeModal
        isOpen={showCreateChallengeModal}
        onClose={() => setShowCreateChallengeModal(false)}
        onCreated={(challenge) => {
          console.log('[DashboardHome] Challenge created:', challenge)
          // Could show a toast or refresh the challenges list
        }}
      />
    </div>
  )
}
