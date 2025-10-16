"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import { Flashcard } from "@/lib/types"

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

export default function Home() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-black" suppressHydrationWarning>
      {/* Enhanced Header with Black/White Theme */}
      <header className="relative overflow-hidden bg-black dark:bg-white shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-100/5"></div>
        
        {/* Decorative Elements */}
        <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 dark:bg-black/10 rounded-full blur-lg"></div>
        <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-white/10 dark:bg-black/10 rounded-full blur-lg"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-2 text-center">
          <div className="space-y-1">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white dark:text-black mb-1 tracking-tight">
              AI Study Tools
            </h1>
            <p className="text-xs md:text-sm text-gray-200 dark:text-gray-800 max-w-2xl mx-auto leading-relaxed">
              Transform your documents into effective study materials. Upload documents to chat with them or generate interactive flashcards.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-full">

        {/* Side-by-Side Layout */}
        <div className="max-w-full mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6 h-[calc(100vh-7.5rem)]">
            
            {/* Left Side - Chat with Documents (30% bigger) */}
            <div className="flex flex-col">
              <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white dark:text-black text-sm">💬</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black dark:text-white">
                      Chat with Documents
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Upload a document and ask questions to get AI-powered answers
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
                <ChatInterface />
              </div>
            </div>

            {/* Right Side - Flashcard Generator */}
            <div className="flex flex-col">
              <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white dark:text-black text-sm">📚</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black dark:text-white">
                      Flashcard Generator
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Upload documents to generate interactive study flashcards
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}