"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import { Flashcard } from "@/lib/types"
import { useUIStore } from "@/lib/store/useStore"

// Dynamic import to prevent SSR hydration issues
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

export default function DashboardHome() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { activeMode } = useUIStore()

  // Render different content based on active mode
  const renderModeContent = () => {
    switch (activeMode) {
      case "chat":
        return (
          <div className="h-full p-4">
            <ChatInterface />
          </div>
        )

      case "podcast":
        return (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-4xl">🎙️</span>
              </div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                Podcast Mode Coming Soon
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Convert your documents into AI-narrated podcasts with natural voice synthesis.
                Perfect for learning on the go!
              </p>
              <div className="inline-block px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                Stay tuned for this feature
              </div>
            </div>
          </div>
        )

      case "mindmap":
        return (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-4xl">🗺️</span>
              </div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
                Mind Map Mode Coming Soon
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Visualize concepts and their relationships as interactive mind maps.
                See the big picture at a glance!
              </p>
              <div className="inline-block px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                Stay tuned for this feature
              </div>
            </div>
          </div>
        )

      case "flashcards":
      default:
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
                onReset={() => setFlashcards([])}
              />
            )}
          </div>
        )
    }
  }

  return (
    <div className="h-screen overflow-hidden">
      {renderModeContent()}
    </div>
  )
}