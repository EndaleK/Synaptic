"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import LearningStyleAssessment from "@/components/LearningStyleAssessment"
import DashboardHome from "@/components/DashboardHome"
import PodcastView from "@/components/PodcastView"
import QuickSummaryView from "@/components/QuickSummaryView"
import MindMapView from "@/components/MindMapView"
import QuizPromptModal from "@/components/QuizPromptModal"
import InlineDocumentPicker from "@/components/InlineDocumentPicker"
import ContentSelectionModal from "@/components/ContentSelectionModal"
import Breadcrumb from "@/components/Breadcrumb"
import { Flashcard } from "@/lib/types"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import { useDocumentStore } from "@/lib/store/useStore"
import type { LearningStyle, PreferredMode, Document } from "@/lib/supabase/types"

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

function DashboardContent() {
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

  // Modal state for inline document picker flow
  const [selectedDocForModal, setSelectedDocForModal] = useState<Document | null>(null)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [contentModalType, setContentModalType] = useState<'flashcards' | 'podcast' | 'mindmap'>('flashcards')

  // Track which modes have active content loaded (to distinguish from stale store data)
  const [activeModeDocuments, setActiveModeDocuments] = useState<{
    chat: boolean
    podcast: boolean
    mindmap: boolean
  }>({
    chat: false,
    podcast: false,
    mindmap: false
  })

  // Load content from URL params after generation
  useEffect(() => {
    const mode = searchParams.get('mode')
    const documentId = searchParams.get('documentId')

    if (!mode || !documentId) return

    // Set active mode flags when returning from generation
    if (mode === 'podcast') {
      console.log('📥 Podcast mode loaded from URL params')
      setActiveModeDocuments(prev => ({ ...prev, podcast: true }))
      setActiveMode('podcast')

      // Load document metadata if not already loaded
      if (!currentDocument || currentDocument.id !== documentId) {
        fetch(`/api/documents/${documentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.document) {
              setCurrentDocument({
                id: data.document.id,
                name: data.document.file_name,
                content: data.document.extracted_text || '',
                fileType: data.document.file_type,
                storagePath: data.document.storage_path
              })
            }
          })
          .catch(error => console.error('Error loading document:', error))
      }
    } else if (mode === 'mindmap') {
      console.log('📥 Mind map mode loaded from URL params')
      setActiveModeDocuments(prev => ({ ...prev, mindmap: true }))
      setActiveMode('mindmap')

      // Load document metadata if not already loaded
      if (!currentDocument || currentDocument.id !== documentId) {
        fetch(`/api/documents/${documentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.document) {
              setCurrentDocument({
                id: data.document.id,
                name: data.document.file_name,
                content: data.document.extracted_text || '',
                fileType: data.document.file_type,
                storagePath: data.document.storage_path
              })
            }
          })
          .catch(error => console.error('Error loading document:', error))
      }
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
        mindmap: false
      })
    }
  }, [currentDocument])

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
      alert('Failed to save assessment results. Please try again.')
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
      alert("No document content available to regenerate flashcards")
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
      alert(error instanceof Error ? error.message : "Failed to regenerate flashcards")
    } finally {
      setIsRegenerating(false)
    }
  }

  // Handle document selection from inline picker
  const handleDocumentSelect = (document: Document, mode: string) => {
    console.log(`📄 Document selected: ${document.file_name} for mode: ${mode}`)

    // Check if document is still processing
    if (document.processing_status !== 'completed') {
      alert('This document is still processing. Please wait a moment.')
      return
    }

    // For Chat mode: Set document and activate chat immediately
    if (mode === 'chat') {
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path
      })
      setActiveModeDocuments(prev => ({ ...prev, chat: true }))
      setActiveMode('chat')
      return
    }

    // For Flashcards/Podcast/Mind Map: Set document and open ContentSelectionModal
    setCurrentDocument({
      id: document.id,
      name: document.file_name,
      content: document.extracted_text || '',
      fileType: document.file_type,
      storagePath: document.storage_path
    })
    setSelectedDocForModal(document)
    setContentModalType(mode as 'flashcards' | 'podcast' | 'mindmap')
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
      podcast: 'bg-[var(--bg-tint-podcast)]',
      'quick-summary': 'bg-[var(--bg-tint-podcast)]', // Same as podcast (audio)
      mindmap: 'bg-[var(--bg-tint-mindmap)]',
      writer: 'bg-[var(--bg-tint-writer)]',
      video: 'bg-[var(--bg-tint-video)]',
      exam: 'bg-[var(--bg-tint-quiz)]',
      home: 'bg-transparent' // No tint on home page
    }
    return tints[activeMode] || 'bg-transparent'
  }

  // Render different content based on active mode
  const renderModeContent = () => {
    switch (activeMode) {
      case "home":
        return (
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
        )

      case "chat":
        // Only show ChatInterface if document was explicitly selected through picker
        if (!activeModeDocuments.chat) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'chat')}
              mode="chat"
            />
          )
        }
        return (
          <div className="h-full">
            <ChatInterface />
          </div>
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
          <div className="h-full overflow-y-auto container-padding">
            <PodcastView
              documentId={currentDocument.id}
              documentName={currentDocument.name}
            />
          </div>
        )

      case "quick-summary":
        // Quick Summary doesn't require pre-selection - handles docs, URLs, and YouTube in-component
        return (
          <div className="h-full">
            <QuickSummaryView
              documentId={currentDocument?.id}
              documentName={currentDocument?.name}
            />
          </div>
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
          <div className="h-full overflow-y-auto container-padding">
            <MindMapView
              documentId={currentDocument.id}
              documentName={currentDocument.name}
            />
          </div>
        )

      case "writer":
        return (
          <div className="h-full">
            <WritingView documentId={currentDocument?.id} />
          </div>
        )

      case "video":
        return (
          <div className="h-full">
            <VideoView />
          </div>
        )

      case "exam":
        return (
          <div className="h-full">
            <ExamView />
          </div>
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
        )
    }
  }

  return (
    <>
      <div className={`h-screen overflow-hidden flex flex-col transition-colors duration-500 ${getBackgroundTint()}`}>
        <div className="flex-shrink-0 container-padding-x pt-4">
          <Breadcrumb />
        </div>
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