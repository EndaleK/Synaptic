"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import LearningStyleAssessment from "@/components/LearningStyleAssessment"
import DashboardHome from "@/components/DashboardHome"
import PodcastView from "@/components/PodcastView"
import MindMapView from "@/components/MindMapView"
import QuizPromptModal from "@/components/QuizPromptModal"
import { Flashcard } from "@/lib/types"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import { useDocumentStore } from "@/lib/store/useStore"
import type { LearningStyle, PreferredMode } from "@/lib/supabase/types"

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

export default function DashboardPage() {
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
  const { currentDocument } = useDocumentStore()

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
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-4xl">💬</span>
                </div>
                <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                  No Document Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please select a document from the Documents page to start chatting.
                </p>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Go to Documents
                </button>
              </div>
            </div>
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
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-4xl">🎙️</span>
                </div>
                <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                  No Document Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please select a document from the Documents page to generate a podcast.
                </p>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Go to Documents
                </button>
              </div>
            </div>
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
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-4xl">🗺️</span>
                </div>
                <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                  No Document Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please select a document from the Documents page to generate a mind map.
                </p>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Go to Documents
                </button>
              </div>
            </div>
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
        if (!currentDocument) {
          return (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-4xl">🃏</span>
                </div>
                <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                  No Document Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please select a document from the Documents page to generate flashcards.
                </p>
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Go to Documents
                </button>
              </div>
            </div>
          )
        }
        return (
          <div className="h-full p-4">
            {flashcards.length === 0 ? (
              <DocumentUpload
                onFlashcardsGenerated={setFlashcards}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            ) : (
              <FlashcardDisplay
                flashcards={flashcards}
                onReset={() => {
                  setFlashcards([])
                  setRegenerationCount(0)
                }}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
              />
            )}
          </div>
        )
    }
  }

  return (
    <>
      <div className="h-screen overflow-hidden">
        {renderModeContent()}
      </div>

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