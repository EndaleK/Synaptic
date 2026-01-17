"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { FileText, Clock } from "lucide-react"
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
} from "@/components/illustrations"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"
import WelcomeModal from "@/components/WelcomeModal"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
  onOpenAssessment?: () => void
}

// All study modes in a single array for 2x4 grid display
const studyModes = [
  { id: "flashcards", icon: FlashcardIcon, title: "Flashcards", description: "Spaced repetition review" },
  { id: "chat", icon: ChatIcon, title: "Chat", description: "Q&A about your docs" },
  { id: "podcast", icon: PodcastIcon, title: "Podcast", description: "Full audio lesson (10-20 min)" },
  { id: "quick-summary", icon: SummaryIcon, title: "Quick Summary", description: "5-min audio highlights" },
  { id: "exam", icon: ExamIcon, title: "Mock Exam", description: "Test your knowledge" },
  { id: "mindmap", icon: MindMapIcon, title: "Mind Map", description: "Visualize concepts" },
  { id: "writer", icon: WriterIcon, title: "Writer", description: "Generate practice content" },
  { id: "video", icon: VideoIcon, title: "Video", description: "Learn from YouTube" },
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
  const [recentDocuments, setRecentDocuments] = useState<Array<{ id: string; name: string; flashcardCount?: number; lastStudied?: string }>>([])
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [isClient, setIsClient] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check if should show welcome modal for first-time users
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal')
    if (!hasSeenWelcome && isClient) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowWelcomeModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isClient])

  const handleWelcomeClose = async () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcomeModal', 'true')
    // Persist to database (optional, for cross-device sync)
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ has_seen_welcome_modal: true })
      })
    } catch (error) {
      // Silent fail - localStorage is the primary source
      console.error('Error persisting welcome modal state:', error)
    }
  }

  const handleWelcomeUpload = () => {
    handleWelcomeClose()
    onModeSelect('flashcards') // Go to flashcards mode which has the upload UI
  }

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

  // Fetch flashcards due and recent documents
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

        // Fetch recent documents (3 most recent)
        const docsResponse = await fetch('/api/documents?limit=3', {
          credentials: 'include'
        })
        if (docsResponse.ok) {
          const data = await docsResponse.json()
          if (data.documents && data.documents.length > 0) {
            setRecentDocuments(data.documents.map((doc: any) => ({
              id: doc.id,
              name: doc.file_name,
              flashcardCount: doc.flashcard_count || 0,
              lastStudied: doc.updated_at
            })))
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

  const handleModeClick = (mode: typeof primaryModes[0]) => {
    if (mode.id === 'writer') {
      router.push('/dashboard/writer')
    } else if (mode.id === 'pathway') {
      router.push('/dashboard/study-plans')
    } else if (mode.id === 'study-buddy') {
      // Open the floating Study Buddy panel
      setStudyBuddyViewMode('floating')
    } else {
      onModeSelect(mode.id)
    }
  }

  // Format time ago for recent documents
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleContinueDocument = async (docId?: string) => {
    const documentId = docId || recentDocuments[0]?.id
    if (!documentId) return
    try {
      const response = await fetch(`/api/documents/${documentId}`)
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
      {/* Welcome Modal for first-time users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeClose}
        userName={user?.firstName || user?.username}
        onUploadClick={handleWelcomeUpload}
      />

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

        {/* Main Content Grid - Two columns on large screens (70/30 split) */}
        <div className="grid lg:grid-cols-10 gap-8">
          {/* Left Column - Main content (7/10 width = 70%) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Recommended for you */}
            <section className="p-5 rounded-2xl bg-white/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white mb-4">
                <span>💡</span> Recommended for you
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {recentDocuments[0] && (
                  <RecommendedCard
                    icon={PodcastIcon}
                    title="Listen to Podcast"
                    description={`Turn "${recentDocuments[0].name.length > 25 ? recentDocuments[0].name.slice(0, 25) + '...' : recentDocuments[0].name}" into audio.`}
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
                    description={`${flashcardsDue} cards due${currentStreak > 0 ? ` • ${currentStreak}-day streak` : ''}`}
                    actionLabel="Review Now"
                    gradient="pink"
                    onClick={() => onModeSelect('flashcards')}
                  />
                ) : (
                  <RecommendedCard
                    icon={UploadIcon}
                    title="Upload a Document"
                    description="Upload study materials to generate flashcards, podcasts, and more."
                    actionLabel="Get Started"
                    gradient="pink"
                    onClick={() => router.push('/dashboard/documents')}
                  />
                )}
              </div>
            </section>

            {/* Choose your study mode - All 8 tools in 2 rows of 4 */}
            <section className="p-5 rounded-2xl bg-white/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>🎯</span> Study Tools
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            {/* Recently Studied */}
            <section className="p-5 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 shadow-md">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>📚</span> Recently Studied
              </h2>

              {recentDocuments.length > 0 ? (
                <div className="space-y-3 mb-4">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleContinueDocument(doc.id)}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {doc.name.replace(/\.[^/.]+$/, '')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {doc.flashcardCount ? `${doc.flashcardCount} cards` : 'No cards yet'}
                            {doc.lastStudied && (
                              <>
                                <span>•</span>
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(doc.lastStudied)}
                              </>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                      </div>
                    ))}
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
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B3FF2] hover:bg-[#6B2FE2] text-white rounded-xl font-semibold text-sm transition-all"
                    >
                      <span>📋</span> Review {flashcardsDue} cards
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/dashboard/documents')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    All Documents
                  </button>
                </div>
            </section>
          </div>

          {/* Right Column - Sidebar (3/10 width = 30%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Weekly Heat Map with Streak - aligned with Recommended cards */}
            <WeeklyCalendar activeDays={activeDays} streak={currentStreak} className="lg:mt-10" />

            {/* Exam Readiness */}
            <ExamReadinessWidget compact onViewDetails={() => onModeSelect('exam')} />

            {/* Monthly Usage - Hidden on mobile */}
            <div className="hidden sm:block">
              <UsageWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
