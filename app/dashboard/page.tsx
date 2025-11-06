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
import MindMapView from "@/components/MindMapView"
import QuizPromptModal from "@/components/QuizPromptModal"
import InlineDocumentPicker from "@/components/InlineDocumentPicker"
import ContentSelectionModal from "@/components/ContentSelectionModal"
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

  // Load flashcards from URL params after generation
  useEffect(() => {
    const mode = searchParams.get('mode')
    const documentId = searchParams.get('documentId')

    if (mode === 'flashcards' && documentId && flashcards.length === 0 && !isLoading) {
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
          }
        })
        .catch(error => {
          console.error('Error loading flashcards:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [searchParams, flashcards.length, isLoading, setActiveMode, setFlashcards])

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
      setActiveMode('chat')
      return
    }

    // For Flashcards/Podcast/Mind Map: Open ContentSelectionModal
    setSelectedDocForModal(document)
    setContentModalType(mode as 'flashcards' | 'podcast' | 'mindmap')
    setContentModalOpen(true)
  }

  const handleCloseContentModal = () => {
    setContentModalOpen(false)
    setSelectedDocForModal(null)
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
        if (!currentDocument) {
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
        if (!currentDocument) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'podcast')}
              mode="podcast"
            />
          )
        }
        return (
          <div className="h-full overflow-y-auto p-6">
            <PodcastView
              documentId={currentDocument.id}
              documentName={currentDocument.name}
            />
          </div>
        )

      case "mindmap":
        if (!currentDocument) {
          return (
            <InlineDocumentPicker
              onDocumentSelect={(doc) => handleDocumentSelect(doc, 'mindmap')}
              mode="mindmap"
            />
          )
        }
        return (
          <div className="h-full overflow-y-auto p-6">
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
          <div className="h-full p-4">
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
      <div className="h-screen overflow-hidden">
        {renderModeContent()}
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