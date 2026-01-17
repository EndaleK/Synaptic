"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { FileText, Users, School, Building2, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@/lib/supabase/types"
import { useUIStore, useDocumentStore } from "@/lib/store/useStore"
import { RecommendedCard } from "@/components/RecommendedCard"
import { StudyModeCard } from "@/components/StudyModeCard"
import { WeeklyCalendar } from "@/components/WeeklyCalendar"
import ExamReadinessWidget from "@/components/ExamReadinessWidget"
import UsageWidget from "@/components/UsageWidget"
import {
  FlashcardIcon,
  PodcastIcon,
  MindMapIcon,
  SummaryIcon,
  WriterIcon,
  VideoIcon,
  ExamIcon,
  UploadIcon,
  ChatIcon,
  PlannerIcon,
  StudyBuddyIcon,
} from "@/components/illustrations"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
  onOpenAssessment?: () => void
}

// Role dashboard configuration
const roleDashboards: Record<string, { title: string; subtitle: string; href: string; icon: typeof Users; gradient: string }> = {
  parent: {
    title: 'Parent Dashboard',
    subtitle: 'Manage your children\'s learning',
    href: '/dashboard/parent',
    icon: Users,
    gradient: 'from-blue-500/10 to-cyan-500/10'
  },
  educator: {
    title: 'Teacher Dashboard',
    subtitle: 'Manage your classes & students',
    href: '/dashboard/teacher',
    icon: School,
    gradient: 'from-green-500/10 to-emerald-500/10'
  },
  institution: {
    title: 'Admin Dashboard',
    subtitle: 'Manage your organization',
    href: '/dashboard/admin',
    icon: Building2,
    gradient: 'from-orange-500/10 to-amber-500/10'
  },
}

function RoleDashboardCard({ role }: { role: UserRole }) {
  const config = roleDashboards[role]
  if (!config) return null

  const IconComponent = config.icon

  return (
    <Link href={config.href}>
      <div className={`p-5 rounded-2xl bg-gradient-to-br ${config.gradient} border border-gray-200/50 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-all group cursor-pointer`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
            <IconComponent className="w-5 h-5 text-[#7B3FF2]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{config.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center justify-end text-xs text-[#7B3FF2] font-medium group-hover:translate-x-1 transition-transform">
          Go to dashboard <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  )
}

// Study modes with hand-drawn icons
const studyModes = [
  { id: "flashcards", icon: FlashcardIcon, title: "Flashcards", description: "Review with AI-powered cards" },
  { id: "chat", icon: ChatIcon, title: "Chat", description: "Ask questions & learn" },
  { id: "study-buddy", icon: StudyBuddyIcon, title: "Study Buddy", description: "Your AI learning companion" },
  { id: "study-planner", icon: PlannerIcon, title: "Study Planner", description: "Plan & track your study" },
  { id: "podcast", icon: PodcastIcon, title: "Podcast", description: "Listen & learn on the go" },
  { id: "quick-summary", icon: SummaryIcon, title: "Quick Summary", description: "5-minute audio overviews" },
  { id: "mindmap", icon: MindMapIcon, title: "Mind Map", description: "See the big picture" },
  { id: "writer", icon: WriterIcon, title: "Writer", description: "Generate practice content" },
  { id: "video", icon: VideoIcon, title: "Video", description: "Watch to understand" },
  { id: "exam", icon: ExamIcon, title: "Exam", description: "Practice with mock tests" },
]

export default function DashboardHome({ onModeSelect }: DashboardHomeProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const { setActiveMode } = useUIStore()
  const { setCurrentDocument } = useDocumentStore()
  const { setViewMode: setStudyBuddyViewMode } = useStudyBuddyStore()

  const [currentStreak, setCurrentStreak] = useState<number>(0)
  const [isLoadingStreak, setIsLoadingStreak] = useState(true)
  const [flashcardsDue, setFlashcardsDue] = useState(0)
  const [recentDocument, setRecentDocument] = useState<{ id: string; name: string } | null>(null)
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [isClient, setIsClient] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/user/role', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUserRole(data.primary_role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    fetchRole()
  }, [])

  // Fetch streak
  useEffect(() => {
    const updateStreak = async () => {
      try {
        const response = await fetch('/api/streak/update', {
          method: 'POST',
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
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

  // Fetch flashcards due and recent document
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch flashcard review queue
        const reviewResponse = await fetch('/api/flashcards/review-queue', {
          credentials: 'include'
        })
        if (reviewResponse.ok) {
          const data = await reviewResponse.json()
          setFlashcardsDue(data.stats?.totalDue || 0)
        }

        // Fetch recent documents
        const docsResponse = await fetch('/api/documents?limit=1', {
          credentials: 'include'
        })
        if (docsResponse.ok) {
          const data = await docsResponse.json()
          if (data.documents && data.documents.length > 0) {
            setRecentDocument({
              id: data.documents[0].id,
              name: data.documents[0].file_name
            })
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }
    fetchData()
  }, [])

  // Fetch weekly activity
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const response = await fetch('/api/study-statistics', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          // Convert days active to array of day indices (0 = Sunday)
          // For now, simulate based on daysActive count
          const days = data.daysActive || 0
          const today = new Date().getDay()
          const active: number[] = []
          for (let i = 0; i < Math.min(days, 7); i++) {
            active.push((today - i + 7) % 7)
          }
          setActiveDays(active)
        }
      } catch (error) {
        console.error('Error fetching weekly stats:', error)
      }
    }
    fetchWeeklyStats()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).toUpperCase()
  }

  const handleModeClick = (mode: typeof studyModes[0]) => {
    if (mode.id === 'writer') {
      router.push('/dashboard/writer')
    } else if (mode.id === 'study-planner') {
      router.push('/dashboard/study-plans')
    } else if (mode.id === 'study-buddy') {
      // Open the floating Study Buddy panel
      setStudyBuddyViewMode('floating')
    } else {
      onModeSelect(mode.id)
    }
  }

  const handleContinueDocument = async () => {
    if (!recentDocument) return
    try {
      const response = await fetch(`/api/documents/${recentDocument.id}`)
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
          onModeSelect('chat')
        }
      }
    } catch (error) {
      console.error('Error loading document:', error)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-[#EDE5FF] via-[#F3EDFF] to-[#E8E0F0] dark:from-[#1E1230] dark:via-[#16102A] dark:to-[#1A1525] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero Section */}
        <section className="mb-10">
          <p className="text-sm font-semibold tracking-widest text-[#7B3FF2] mb-2">
            {formatDate()}
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-2">
            <span className="text-gray-900 dark:text-white">{getGreeting()}, </span>
            <span className="text-[#7B3FF2]">
              {isClient && isUserLoaded ? (user?.firstName || user?.username || 'there') : 'there'}
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            What would you like to study today?
          </p>
        </section>

        {/* Main Content Grid - Two columns on large screens */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main content (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recommended for you */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>💡</span> Recommended for you right now
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {recentDocument && (
                  <RecommendedCard
                    icon={PodcastIcon}
                    title="Listen to Podcast"
                    description={`Turn "${recentDocument.name.length > 25 ? recentDocument.name.slice(0, 25) + '...' : recentDocument.name}" into an audio lesson. Perfect for your morning commute.`}
                    actionLabel="Start Listening"
                    gradient="purple"
                    onClick={() => {
                      handleContinueDocument()
                      setTimeout(() => onModeSelect('podcast'), 100)
                    }}
                  />
                )}
                {flashcardsDue > 0 ? (
                  <RecommendedCard
                    icon={FlashcardIcon}
                    title="Review Flashcards"
                    description={`You have ${flashcardsDue} cards ready for review. Keep your ${currentStreak > 0 ? `${currentStreak}-day` : ''} streak going!`}
                    actionLabel="Review Now"
                    gradient="pink"
                    onClick={() => onModeSelect('flashcards')}
                  />
                ) : (
                  <RecommendedCard
                    icon={UploadIcon}
                    title="Upload a Document"
                    description="Start your learning journey by uploading study materials. We'll help you turn them into flashcards, podcasts, and more."
                    actionLabel="Get Started"
                    gradient="pink"
                    onClick={() => router.push('/dashboard/documents')}
                  />
                )}
              </div>
            </section>

            {/* Choose your study mode */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>🎯</span> Choose your study mode
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {studyModes.map((mode) => (
                  <StudyModeCard
                    key={mode.id}
                    icon={mode.icon}
                    title={mode.title}
                    description={mode.description}
                    badge={mode.id === 'flashcards' ? flashcardsDue : undefined}
                    onClick={() => handleModeClick(mode)}
                  />
                ))}
              </div>
            </section>

            {/* What to study next */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>✨</span> What to study next
              </h2>

              <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 shadow-md">
                {recentDocument ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Continue with {recentDocument.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {recentDocument.name} • 20m left
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No documents yet. Upload your first study material to get started!
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  {flashcardsDue > 0 && (
                    <button
                      onClick={() => onModeSelect('flashcards')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B3FF2] hover:bg-[#6B2FE2] text-white rounded-xl font-semibold text-sm transition-all"
                    >
                      <span>📋</span> Review {flashcardsDue} cards
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/dashboard/documents')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Browse Documents
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Weekly Heat Map with Streak - aligned with Recommended cards */}
            <WeeklyCalendar activeDays={activeDays} streak={currentStreak} className="lg:mt-10" />

            {/* Role Dashboard Link - only for non-learner roles */}
            {userRole && userRole !== 'learner' && (
              <RoleDashboardCard role={userRole} />
            )}

            {/* Exam Readiness */}
            <ExamReadinessWidget compact onViewDetails={() => onModeSelect('exam')} />

            {/* Monthly Usage */}
            <UsageWidget />

            {/* Study Tips */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#7B3FF2]/5 to-[#E91E8C]/5 border border-[#7B3FF2]/10 dark:border-[#7B3FF2]/20 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Study Tip</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Break your study sessions into 25-minute focused blocks with 5-minute breaks. This technique, called Pomodoro, helps maintain concentration and prevents burnout.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2025 Synaptic. ካንአ All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}
