"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { BookOpen, MessageSquare, Mic, Network, Clock, PenTool, Youtube, GraduationCap, FileText, Flame, Zap, BookMarked, Upload, Sparkles, ChevronDown, ArrowRight, Users, Target, Plus } from "lucide-react"
import { useUIStore, useUserStore, useDocumentStore } from "@/lib/store/useStore"
import { notificationManager } from "@/lib/notifications"
import { analytics } from "@/lib/analytics"
import UsageWarningNotification from "@/components/UsageWarningNotification"
import UsageWidget from "@/components/UsageWidget"
import NotificationBanner from "@/components/NotificationBanner"
import MilestoneCelebrationModal, { useMilestoneCelebration } from "@/components/MilestoneCelebrationModal"
import SmartRecommendations from "@/components/SmartRecommendations"
import ExamReadinessWidget from "@/components/ExamReadinessWidget"
import WeakTopicsPanel from "@/components/WeakTopicsPanel"
import StudyPlanWizard from "@/components/StudyPlanWizard"
import { CreateChallengeModal } from "@/components/StudyChallengeWidget"
import { AchievementUnlockToast } from "@/components/AchievementBadge"
import type { AchievementDefinition } from "@/lib/achievements"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
  onOpenAssessment?: () => void
}

// Primary learning modes (4 most-used)
const primaryModes = [
  { id: "flashcards", name: "Flashcards", icon: BookOpen, description: "Review cards due today", color: "from-indigo-500 to-indigo-600", bgColor: "bg-indigo-500/10", textColor: "text-indigo-600 dark:text-indigo-400" },
  { id: "exam", name: "Mock Exam", icon: GraduationCap, description: "Test yourself", color: "from-amber-500 to-amber-600", bgColor: "bg-amber-500/10", textColor: "text-amber-600 dark:text-amber-400" },
  { id: "chat", name: "Chat", icon: MessageSquare, description: "Ask your notes anything", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  { id: "course-setup", name: "Course Setup", icon: Plus, description: "Add a new course", href: "/dashboard/course-setup", color: "from-violet-500 to-purple-600", bgColor: "bg-violet-500/10", textColor: "text-violet-600 dark:text-violet-400" },
]

// Secondary modes (hidden under "More tools")
const secondaryModes = [
  { id: "documents", name: "Documents", icon: FileText, description: "Manage your files", href: "/dashboard/documents", color: "from-slate-500 to-slate-600", bgColor: "bg-slate-500/10", textColor: "text-slate-600 dark:text-slate-400" },
  { id: "knowledge-gaps", name: "Knowledge Gaps", icon: Target, description: "Find weak areas", href: "/dashboard/knowledge-gaps", color: "from-rose-500 to-rose-600", bgColor: "bg-rose-500/10", textColor: "text-rose-600 dark:text-rose-400" },
  { id: "mindmap", name: "Mind Map", icon: Network, description: "Visualize concepts", color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-500/10", textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "podcast", name: "Podcast", icon: Mic, description: "Listen & learn", color: "from-violet-500 to-violet-600", bgColor: "bg-violet-500/10", textColor: "text-violet-600 dark:text-violet-400" },
  { id: "writer", name: "Writer", icon: PenTool, description: "Write essays", href: "/dashboard/writer", color: "from-rose-500 to-rose-600", bgColor: "bg-rose-500/10", textColor: "text-rose-600 dark:text-rose-400" },
  { id: "video", name: "Video", icon: Youtube, description: "YouTube learning", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  { id: "quick-summary", name: "Summary", icon: Clock, description: "Quick 5min overview", color: "from-cyan-500 to-cyan-600", bgColor: "bg-cyan-500/10", textColor: "text-cyan-600 dark:text-cyan-400" },
  { id: "classes", name: "Classes", icon: Users, description: "Group study", color: "from-teal-500 to-teal-600", bgColor: "bg-teal-500/10", textColor: "text-teal-600 dark:text-teal-400" },
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
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)
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

  const handleModeClick = (mode: typeof primaryModes[0]) => {
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
        router.push('/dashboard/course-setup')
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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <div className="min-h-full bg-[#fafbfc] dark:bg-[#0a0a0f] font-body relative overflow-hidden">
      {/* Enhanced atmospheric background with grid pattern */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient - warm and inviting */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 via-white to-pink-50/30 dark:from-violet-950/15 dark:via-[#0a0a0f] dark:to-pink-950/10" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 bg-grid-pattern opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(123, 63, 242, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(123, 63, 242, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Primary orb - Purple (top right) */}
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-400/8 via-purple-300/4 to-transparent dark:from-violet-600/6 dark:via-purple-500/3 blur-3xl" />

        {/* Secondary orb - Pink (bottom left) */}
        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-pink-400/6 via-rose-300/3 to-transparent dark:from-pink-600/4 dark:via-rose-500/2 blur-3xl" />

        {/* Tertiary orb - Orange accent (center right) */}
        <div className="absolute top-[50%] right-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-bl from-orange-400/5 via-amber-300/2 to-transparent dark:from-orange-600/3 dark:via-amber-500/1 blur-3xl" />
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Alerts */}
        <div className="space-y-2 mb-8">
          <UsageWarningNotification />
          <NotificationBanner />
        </div>

        {/* Hero Section - Orchestrated reveal */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Greeting */}
            <div className="space-y-3 animate-hero-reveal">
              <p className="text-sm font-semibold tracking-[0.15em] text-violet-600 dark:text-violet-400 uppercase font-body">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-[1.1]">
                <span className="text-gray-900 dark:text-white">{getGreeting()}, </span>
                <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent animate-gradient-border bg-[length:200%_200%]">
                  {isClient && isUserLoaded ? (user?.firstName || user?.username || 'there') : 'there'}
                </span>
              </h1>
              <p className="text-base text-gray-500 dark:text-gray-400 font-body font-light max-w-md">
                What would you like to study today?
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {actionState.type === 'loading' ? (
                  <div className="h-10 w-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ) : actionState.type === 'flashcards_due' ? (
                  <button
                    onClick={() => {
                      setActiveMode('flashcards')
                      onModeSelect('flashcards')
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
                  >
                    <BookOpen className="w-4 h-4" />
                    Review {actionState.count} cards
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : actionState.type === 'continue_document' ? (
                  <button
                    onClick={() => {
                      setCurrentDocument({ id: actionState.documentId, file_name: actionState.documentName } as any)
                      setActiveMode('chat')
                      onModeSelect('chat')
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Continue: {actionState.documentName.length > 20 ? actionState.documentName.slice(0, 20) + '...' : actionState.documentName}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/dashboard/course-setup')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    Set Up Your First Course
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Browse Documents
                </button>
              </div>
            </div>

            {/* Stats Card - Glass morphism with card elevation */}
            <div className="animate-hero-reveal stagger-2 flex items-center gap-6 p-5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 card-level-2 card-glow">
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
        <section className="mb-12 animate-hero-reveal stagger-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Smart Recommendations - AI-powered "What to study next" */}
            <SmartRecommendations maxItems={3} showStats={true} />

            {/* Weekly Progress - Enhanced card with elevation */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 card-level-1 card-glow">
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
        <section className="mb-12 animate-hero-reveal stagger-4">
          {/* Create Study Plan Card - Simplified with card elevation */}
          <div className="mb-5">
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 card-level-1 card-glow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                    <BookMarked className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-gray-900 dark:text-white">
                      Study Plans
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create and manage your exam preparation schedules
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/dashboard/study-plans')}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                  >
                    View All
                  </button>
                  <button
                    onClick={() => setShowStudyPlanWizard(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    New Plan
                  </button>
                </div>
              </div>
            </div>
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
                  // Navigate to the study plans page
                  router.push('/dashboard/study-plans')
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Actions - Primary Study Modes */}
        <section className="mb-12 animate-hero-reveal stagger-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                Quick actions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Jump into your study session</p>
            </div>
            <button
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                {showMoreTools ? 'Show less' : 'More tools'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-violet-500 transition-transform duration-300 ${showMoreTools ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Primary Modes - 4 horizontal cards with enhanced styling */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {primaryModes.map((mode, index) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode)}
                  className="group relative p-5 rounded-2xl bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl border border-gray-100 dark:border-white/10 hover:border-transparent transition-all duration-500 text-left overflow-hidden hover:scale-[1.02] card-level-1"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Animated gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl`} />

                  {/* Subtle grid pattern background */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl ${mode.bgColor} flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                      <Icon className={`w-6 h-6 ${mode.textColor} group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <h3 className="text-base font-display font-bold text-gray-900 dark:text-white group-hover:text-white transition-colors duration-300">{mode.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/80 transition-colors duration-300 mt-1 font-medium">{mode.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Secondary Modes - Expandable with enhanced styling */}
          {showMoreTools && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">More study tools</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {secondaryModes.map((mode, index) => {
                  const Icon = mode.icon
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeClick(mode)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] border border-gray-100 dark:border-white/10 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-300 card-glow"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-9 h-9 rounded-lg ${mode.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                        <Icon className={`w-4 h-4 ${mode.textColor}`} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{mode.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{mode.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Recent Activity & Usage Widget - Side by Side */}
        <section className="mb-12 animate-hero-reveal stagger-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Recent Activity with card elevation */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 card-level-1 card-glow">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-display font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                </div>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1.5 group px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                >
                  View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {recentActivity.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(showAllRecent ? recentActivity : recentActivity.slice(0, 4)).map((activity, index) => {
                    const Icon = getActivityIcon(activity.type)
                    return (
                      <div
                        key={activity.id}
                        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50/50 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-violet-200 dark:hover:border-violet-500/20"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-500/20 dark:to-pink-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{activity.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/10 dark:to-purple-500/10 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-violet-400 dark:text-violet-500" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No activity yet</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                    Set up your first course to start learning with AI-powered flashcards and study plans!
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/course-setup')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
                  >
                    <Plus className="w-4 h-4" />
                    Set Up Your First Course
                  </button>
                </div>
              )}

              {recentActivity.length > 4 && (
                <button
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  className="w-full text-center text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-2 mt-3 flex items-center justify-center gap-1.5 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {showAllRecent ? 'Show Less' : `Show ${recentActivity.length - 4} More`}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllRecent ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Usage Widget - Track limits & upgrade to Pro */}
            <UsageWidget />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2025 Synaptic. ካንአ All rights reserved.
          </p>
        </footer>

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
