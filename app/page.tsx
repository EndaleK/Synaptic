"use client"

import { useState } from "react"
import DocumentUpload from "@/components/DocumentUpload"
import FlashcardDisplay from "@/components/FlashcardDisplay"
import { Flashcard } from "@/lib/types"

export default function Home() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Flashcard Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Upload any document and let AI create educational flashcards for you
          </p>
        </header>

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
      </main>
    </div>
  )
}