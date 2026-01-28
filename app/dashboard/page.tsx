"use client"

import { Suspense, useState, useEffect, useRef, Component, ReactNode } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"

// Error Boundary for dynamic imports - prevents stuck loading states
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class DynamicComponentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.componentName || 'Component'} failed to load:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="h-full flex items-center justify-center bg-white dark:bg-black rounded-2xl border border-gray-300 dark:border-gray-700">
          <div className="text-center p-6 max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {this.props.componentName || 'Component'} failed to load
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              There was an error loading this feature. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import LearningStyleAssessment from "@/components/LearningStyleAssessment"
import DashboardHome from "@/components/DashboardHome"
import PodcastView from "@/components/PodcastView"
import QuickSummaryView from "@/components/QuickSummaryView"
import MindMapView from "@/components/MindMapView"
import StudyGuideView from "@/components/StudyGuideView"
import ClassesView from "@/components/ClassesView"
import QuizPromptModal from "@/components/QuizPromptModal"
import InlineDocumentPicker from "@/components/InlineDocumentPicker"
import ContentSelectionModal from "@/components/ContentSelectionModal"
import { Flashcard } from "@/lib/types"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import { useDocumentStore } from "@/lib/store/useStore"
import { useTimeBasedTheme } from "@/lib/hooks/useTimeBasedTheme"
import type { LearningStyle, PreferredMode, Document } from "@/lib/supabase/types"
import { useToast } from '@/components/ToastContainer'
import { initStorageMonitor } from "@/lib/storage-monitor"
import { analytics } from "@/lib/analytics"

// Dynamic imports to prevent SSR hydration issues
const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-white dark:bg-black rounded-2xl border border-gray-300 dark:border-gray-700">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Chat Interface...</p>
      </div>
    </div>
  )
})

const WritingView = dynamic(() => import("@/components/WritingView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Writing Assistant...</p>
      </div>
    </div>
  )
})

const VideoView = dynamic(() => import("@/components/VideoView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Video Learning...</p>
      </div>
    </div>
  )
})

const ExamView = dynamic(() => import("@/components/ExamView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Exam Simulator...</p>
      </div>
    </div>
  )
})

const StudyPlanWizard = dynamic(() => import("@/components/StudyPlanWizard"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Study Plan Wizard...</p>
      </div>
    </div>
  )
})

const UnifiedStudyPlanner = dynamic(() => import("@/components/UnifiedStudyPlanner"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Pathway...</p>
      </div>
    </div>
  )
})

// StudyBuddyInterface is now merged into ChatInterface - removed separate import

function DashboardContent() {
  const toast = useToast()
  const router = useRouter()
  const { user } = useUser()
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationCount, setRegenerationCount] = useState(0)
  const [showAssessment, setShowAssessment] = useState(false)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const hasCheckedProfile = useRef(false)
  const { activeMode, setActiveMode } = useUIStore()
  const {
    hasCompletedAssessment,
    setHasCompletedAssessment,
    setLearningStyle,
    setAssessmentScores,
    setUserProfile
  } = useUserStore()
  const { currentDocument, setCurrentDocument } = useDocumentStore()
  const searchParams = useSearchParams()

  // Time-based theme warmth (0-20%)
  const warmthLevel = useTimeBasedTheme()

  // Initialize storage monitoring on mount (checks quota, auto-cleans stale data)
  useEffect(() => {
    initStorageMonitor()
  }, [])

  // Track page view on mount
  useEffect(() => {
    analytics.pageView('/dashboard')
  }, [])

  // Modal state for inline document picker flow
  const [selectedDocForModal, setSelectedDocForModal] = useState<Document | null>(null)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [contentModalType, setContentModalType] = useState<'flashcards'>('flashcards')

  // Track which modes have active content loaded (to distinguish from stale store data)
  const [activeModeDocuments, setActiveModeDocuments] = useState<{
    chat: boolean
    podcast: boolean
    mindmap: boolean
    studyguide: boolean
  }>({
    chat: false,
    podcast: false,
    mindmap: false,
    studyguide: false
  })

  // Load content from URL params after generation
  useEffect(() => {
    const mode = searchParams.get('mode')
    const documentId = searchParams.get('documentId')
    const sessionId = searchParams.get('sessionId')

    // Handle modes that don't require a document
    if (mode && !documentId && !sessionId) {
      // Chat mode can work without a document (Study Buddy mode)
      if (mode === 'chat') {
        setActiveModeDocuments(prev => ({ ...prev, chat: true }))
        setActiveMode('chat')
        return
      }
      // Study plan and pathway modes don't require a document
      if (mode === 'study-plan' || mode === 'pathway') {
        setActiveMode(mode as DashboardMode)
        return
      }
      // Other modes require a document, so return early
      return
    }

    // Handle flashcards with sessionId (from Library - clicking "Study" on a session)
    if (mode === 'flashcards' && sessionId && !documentId) {
      if (!isLoading) {
        console.log('📥 Loading flashcards for session:', sessionId)
        setIsLoading(true)

        fetch(`/api/flashcards?sessionId=${sessionId}`)
          .then(res => res.json())
          .then(data => {
            if (data.flashcards && data.flashcards.length > 0) {
              console.log(`✅ Loaded ${data.flashcards.length} flashcards from session`)
              setFlashcards(data.flashcards)
              setActiveMode('flashcards')
            } else {
              console.log('ℹ️ No flashcards found for this session')
              setActiveMode('flashcards')
            }
          })
          .catch(error => {
            console.error('Error loading flashcards:', error)
            setActiveMode('flashcards')
          })
          .finally(() => {
            setIsLoading(false)
          })
      }
      return
    }

    if (!mode || !documentId) return

    // Helper function to load document metadata
    const loadDocumentIfNeeded = async () => {
      if (!currentDocument || currentDocument.id !== documentId) {
        try {
          const res = await fetch(`/api/documents/${documentId}`)
          const data = await res.json()
          if (data.document) {
            setCurrentDocument({
              id: data.document.id,
              name: data.document.file_name,
              content: data.document.extracted_text || '',
              fileType: data.document.file_type,
              storagePath: data.document.storage_path,
              fileSize: data.document.file_size,
            })
          }
        } catch (error) {
          console.error('Error loading document:', error)
        }
      }
    }

    // Set active mode flags when returning from generation or session navigation
    if (mode === 'chat') {
      console.log('📥 Chat mode loaded from URL params with document')
      // Load document for session-focused chat
      loadDocumentIfNeeded()
      setActiveModeDocuments(prev => ({ ...prev, chat: true }))
      setActiveMode('chat')
    } else if (mode === 'podcast') {
      console.log('📥 Podcast mode loaded from URL params')
      setActiveModeDocuments(prev => ({ ...prev, podcast: true }))
      setActiveMode('podcast')
      loadDocumentIfNeeded()
    } else if (mode === 'mindmap') {
      console.log('📥 Mind map mode loaded from URL params')
      setActiveModeDocuments(prev => ({ ...prev, mindmap: true }))
      setActiveMode('mindmap')
      loadDocumentIfNeeded()
    } else if (mode === 'studyguide') {
      console.log('📥 Study Guide mode loaded from URL params')
      setActiveModeDocuments(prev => ({ ...prev, studyguide: true }))
      setActiveMode('studyguide')
      loadDocumentIfNeeded()
    } else if (mode === 'flashcards') {
      // Only load if we don't already have flashcards or if it's a different document
      const shouldLoad = flashcards.length === 0 ||
        (currentDocument && currentDocument.id !== documentId)

      if (shouldLoad && !isLoading) {
        console.log('📥 Loading flashcards for document:', documentId)
        setIsLoading(true)

        fetch(`/api/flashcards?documentId=${documentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.flashcards && data.flashcards.length > 0) {
              console.log(`✅ Loaded ${data.flashcards.length} flashcards`)
              setFlashcards(data.flashcards)
              setActiveMode('flashcards')
            } else {
              console.log('ℹ️ No flashcards found for this document')
              // Still set active mode to show the inline picker
              setActiveMode('flashcards')
            }
          })
          .catch(error => {
            console.error('Error loading flashcards:', error)
            // Set active mode anyway to show the inline picker
            setActiveMode('flashcards')
          })
          .finally(() => {
            setIsLoading(false)
          })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]) // Only re-run when URL params change, not when flashcards change

  // Check if user needs to take assessment
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || hasCheckedProfile.current || hasCompletedAssessment) {
        setIsCheckingProfile(false)
        return
      }

      hasCheckedProfile.current = true

      // Check if user has dismissed the quiz prompt
      const quizDismissed = localStorage.getItem('quiz-prompt-dismissed')

      try {
        // Check if user profile exists
        const response = await fetch('/api/user/profile')

        if (!response.ok) {
          setIsCheckingProfile(false)
          return
        }

        const data = await response.json()

        if (data.profile) {
          // Profile exists - update store
          setUserProfile(data.profile)

          // Check if user has learning style set (assessment completed)
          if (data.profile.learning_style) {
            setLearningStyle(data.profile.learning_style as LearningStyle)
            setHasCompletedAssessment(true)
          } else if (!quizDismissed) {
            // No learning style and hasn't dismissed - show modal
            setShowQuizPrompt(true)
          }
        } else {
          // No profile - create one
          const createResponse = await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })

          if (createResponse.ok) {
            const createData = await createResponse.json()
            setUserProfile(createData.profile)
            if (!quizDismissed) {
              setShowQuizPrompt(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking user profile:', error)
      } finally {
        setIsCheckingProfile(false)
      }
    }

    checkUserProfile()
  }, [user, hasCompletedAssessment, setUserProfile, setLearningStyle, setHasCompletedAssessment])

  // Reset active mode documents when currentDocument becomes null (e.g., via Home/Clear Chat buttons)
  useEffect(() => {
    if (!currentDocument) {
      setActiveModeDocuments({
        chat: false,
        podcast: false,
        mindmap: false,
        studyguide: false
      })
    }
  }, [currentDocument])

  // Handle "Switch Document" button click - reset to document picker for current mode
  const handleSwitchDocument = () => {
    // Reset the current mode's document state to show the picker
    if (activeMode === 'flashcards') {
      setFlashcards([])
      setRegenerationCount(0)
    } else if (activeMode === 'chat') {
      setActiveModeDocuments(prev => ({ ...prev, chat: false }))
    } else if (activeMode === 'podcast') {
      setActiveModeDocuments(prev => ({ ...prev, podcast: false }))
    } else if (activeMode === 'mindmap') {
      setActiveModeDocuments(prev => ({ ...prev, mindmap: false }))
    } else if (activeMode === 'studyguide') {
      setActiveModeDocuments(prev => ({ ...prev, studyguide: false }))
    }
  }

  // Handle assessment completion
  const handleAssessmentComplete = async (result: {
    dominant_style: LearningStyle
    scores: {
      visual: number
      auditory: number
      kinesthetic: number
      reading_writing: number
    }
    recommended_mode: PreferredMode
    teaching_style_preference?: string
    socratic_percentage?: number
    teaching_style_scores?: {
      socratic: number
      direct: number
    }
  }) => {
    try {
      // Save to database
      const response = await fetch('/api/user/learning-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_responses: {}, // Could store actual answers if needed
          visual_score: result.scores.visual,
          auditory_score: result.scores.auditory,
          kinesthetic_score: result.scores.kinesthetic,
          reading_writing_score: result.scores.reading_writing,
          dominant_style: result.dominant_style,
          teaching_style_preference: result.teaching_style_preference,
          socratic_percentage: result.socratic_percentage,
          teaching_style_scores: result.teaching_style_scores,
          learning_preferences: {
            recommended_mode: result.recommended_mode
          }
        })
      })

      if (response.ok) {
        // Update local store
        setLearningStyle(result.dominant_style)
        setAssessmentScores(result.scores)
        setHasCompletedAssessment(true)
        setShowAssessment(false)
      }
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast.error('Failed to save assessment results. Please try again.')
    }
  }

  const handleCloseAssessment = () => {
    setShowAssessment(false)
    // Mark as completed so it doesn't show again this session
    setHasCompletedAssessment(true)
  }

  const handleTakeQuiz = () => {
    setShowQuizPrompt(false)
    setShowAssessment(true)
  }

  const handleDismissQuiz = () => {
    setShowQuizPrompt(false)
    localStorage.setItem('quiz-prompt-dismissed', 'true')
  }

  const handleRegenerate = async () => {
    if (!currentDocument?.content) {
      toast.warning("No document content available to regenerate flashcards")
      return
    }

    setIsRegenerating(true)
    const newVariation = regenerationCount + 1
    setRegenerationCount(newVariation)

    try {
      const formData = new FormData()
      formData.append("text", currentDocument.content)
      formData.append("mode", "text")
      formData.append("variation", newVariation.toString())

      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate flashcards")
      }

      const data = await response.json()
      setFlashcards(data.flashcards)
    } catch (error) {
      console.error("Error regenerating flashcards:", error)
      toast.error(error instanceof Error ? error.message : "Failed to regenerate flashcards")
    } finally {
      setIsRegenerating(false)
    }
  }

  // Handle document selection from inline picker
  const handleDocumentSelect = (document: Document, mode: string) => {
    console.log(`📄 Document selected: ${document.file_name} for mode: ${mode}`)

    // Check if document is still processing
    if (document.processing_status !== 'completed') {
      toast.warning('This document is still processing. Please wait a moment.')
      return
    }

    // For Chat and Study Guide modes: Set document and activate immediately
    if (mode === 'chat') {
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path,
        fileSize: document.file_size,
      })
      setActiveModeDocuments(prev => ({ ...prev, chat: true }))
      setActiveMode('chat')
      return
    }

    if (mode === 'studyguide') {
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path,
        fileSize: document.file_size,
      })
      setActiveModeDocuments(prev => ({ ...prev, studyguide: true }))
      setActiveMode('studyguide')
      return
    }

    // For Podcast: Go directly to podcast view (has its own format selection)
    if (mode === 'podcast') {
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path,
        fileSize: document.file_size,
      })
      setActiveModeDocuments(prev => ({ ...prev, podcast: true }))
      setActiveMode('podcast')
      return
    }

    // For Mind Map: Go directly to mindmap view (has its own type selection)
    if (mode === 'mindmap') {
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path,
        fileSize: document.file_size,
      })
      setActiveModeDocuments(prev => ({ ...prev, mindmap: true }))
      setActiveMode('mindmap')
      return
    }

    // For Flashcards: Set document and open ContentSelectionModal
    setCurrentDocument({
      id: document.id,
      name: document.file_name,
      content: document.extracted_text || '',
      fileType: document.file_type,
      storagePath: document.storage_path,
      fileSize: document.file_size,
    })
    setSelectedDocForModal(document)
    setContentModalType('flashcards')
    setContentModalOpen(true)
  }

  const handleCloseContentModal = () => {
    setContentModalOpen(false)
    setSelectedDocForModal(null)
  }

  // Get background tint class based on active mode
  const getBackgroundTint = () => {
    const tints: Record<string, string> = {
      flashcards: 'bg-[var(--bg-tint-flashcards)]',
      chat: 'bg-[var(--bg-tint-chat)]',
      studyBuddy: 'bg-[var(--bg-tint-chat)]', // Same as chat (conversational)
      podcast: 'bg-[var(--bg-tint-podcast)]',
      'quick-summary': 'bg-[var(--bg-tint-podcast)]', // Same as podcast (audio)
      mindmap: 'bg-[var(--bg-tint-mindmap)]',
      writer: 'bg-[var(--bg-tint-writer)]',
      video: 'bg-[var(--bg-tint-video)]',
      exam: 'bg-[var(--bg-tint-quiz)]',
      'study-plan': 'bg-[var(--bg-tint-quiz)]', // Same as exam (planning)
      pathway: 'bg-[var(--bg-tint-quiz)]', // Same as exam (planning/scheduling)
      home: 'bg-transparent' // No tint on home page
    }
    return tints[activeMode] || 'bg-transparent'
  }

  // Render different content based on active mode
  const renderModeContent = () => {
    switch (activeMode) {
      case "home":
        return (
          <div className="h-full overflow-y-auto scroll-smooth dashboard-scrollbar">
            <DashboardHome
              onModeSelect={(mode) => {
                // Redirect to dedicated Writer page
                if (mode === 'writer') {
                  router.push('/dashboard/writer')
                } else {
                  setActiveMode(mode as any)
                }
              }}
              onOpenAssessment={() => setShowAssessment(true)}
            />
          </div>
        )

      case "chat":
        // Chat now works with or without a document (unified with Study Buddy)
        return (
          <DynamicComponentErrorBoundary componentName="Chat">
            <div className="h-full">
              <ChatInterface />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "podcast":
        // Only show PodcastView if document was explicitly selected and content generated
        if (!activeModeDocuments.podcast) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'podcast')}
              mode="podcast"
            />
          )
        }
        return (
          <DynamicComponentErrorBoundary componentName="Podcast">
            <div className="h-full overflow-y-auto container-padding">
              <PodcastView
                documentId={currentDocument.id}
                documentName={currentDocument.name}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "quick-summary":
        // Quick Summary doesn't require pre-selection - handles docs, URLs, and YouTube in-component
        return (
          <DynamicComponentErrorBoundary componentName="Quick Summary">
            <div className="h-full">
              <QuickSummaryView
                documentId={currentDocument?.id}
                documentName={currentDocument?.name}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "mindmap":
        // Only show MindMapView if document was explicitly selected and content generated
        if (!activeModeDocuments.mindmap) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'mindmap')}
              mode="mindmap"
            />
          )
        }
        return (
          <DynamicComponentErrorBoundary componentName="Mind Map">
            <div className="h-full overflow-y-auto container-padding">
              <MindMapView
                documentId={currentDocument.id}
                documentName={currentDocument.name}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "studyguide":
        // Only show StudyGuideView if document was explicitly selected
        if (!activeModeDocuments.studyguide) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'studyguide')}
              mode="studyguide"
            />
          )
        }
        return (
          <DynamicComponentErrorBoundary componentName="Study Guide">
            <div className="h-full overflow-y-auto container-padding">
              <StudyGuideView
                documentId={currentDocument.id}
                documentName={currentDocument.name}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "writer":
        return (
          <DynamicComponentErrorBoundary componentName="Writing Assistant">
            <div className="h-full">
              <WritingView documentId={currentDocument?.id} />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "video":
        return (
          <DynamicComponentErrorBoundary componentName="Video Learning">
            <div className="h-full">
              <VideoView />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "exam":
        return (
          <DynamicComponentErrorBoundary componentName="Exam Simulator">
            <div className="h-full">
              <ExamView />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "classes":
        return (
          <DynamicComponentErrorBoundary componentName="Classes">
            <div className="h-full overflow-y-auto">
              <ClassesView />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "study-plan":
        return (
          <DynamicComponentErrorBoundary componentName="Study Plan">
            <div className="h-full overflow-y-auto">
              <StudyPlanWizard
                onClose={() => setActiveMode('home')}
                onComplete={(planId) => {
                  router.push('/dashboard/study-plans')
                }}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )

      case "pathway":
        return (
          <DynamicComponentErrorBoundary componentName="Pathway">
            <div className="h-full">
              <UnifiedStudyPlanner
                onNavigateToMode={(mode, documentId, sessionTopic, topicPages) => {
                  // Set document if provided
                  if (documentId) {
                    fetch(`/api/documents/${documentId}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.document) {
                          setCurrentDocument({
                            id: data.document.id,
                            name: data.document.file_name,
                            content: data.document.extracted_text || '',
                            fileType: data.document.file_type,
                            storagePath: data.document.storage_path,
                            fileSize: data.document.file_size,
                          })
                        }
                      })
                  }
                  // Navigate to the mode
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
          </DynamicComponentErrorBoundary>
        )

      case "flashcards":
      default:
        // Always show InlineDocumentPicker when no flashcards loaded
        // This handles both: no document selected AND stale document with no flashcards
        if (flashcards.length === 0) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'flashcards')}
              mode="flashcards"
            />
          )
        }

        // Show flashcards if we have them
        return (
          <DynamicComponentErrorBoundary componentName="Flashcards">
            <div className="h-full overflow-y-auto container-padding">
              <FlashcardDisplay
                flashcards={flashcards}
                onReset={() => {
                  setFlashcards([])
                  setRegenerationCount(0)
                }}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
              />
            </div>
          </DynamicComponentErrorBoundary>
        )
    }
  }

  return (
    <>
      <div
        className={`h-[calc(100vh-56px)] overflow-hidden flex flex-col transition-colors duration-500 ${getBackgroundTint()}`}
        style={{
          filter: `sepia(${warmthLevel}%) saturate(${100 - warmthLevel * 0.5}%)`,
          transition: 'filter 2s ease-in-out'
        }}
      >
        <div className="flex-1 overflow-hidden">
          {renderModeContent()}
        </div>
      </div>

      {/* Content Selection Modal for Flashcards/Podcast/Mind Map */}
      {contentModalOpen && selectedDocForModal && (
        <ContentSelectionModal
          isOpen={contentModalOpen}
          onClose={handleCloseContentModal}
          document={selectedDocForModal}
          generationType={contentModalType}
        />
      )}

      {/* Learning Style Assessment Modal */}
      <LearningStyleAssessment
        isOpen={showAssessment && !isCheckingProfile}
        onClose={handleCloseAssessment}
        onComplete={handleAssessmentComplete}
        allowSkip={true}
      />

      {/* Quiz Prompt Modal */}
      {showQuizPrompt && (
        <QuizPromptModal
          onTakeQuiz={handleTakeQuiz}
          onDismiss={handleDismissQuiz}
        />
      )}

    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}