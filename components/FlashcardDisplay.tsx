"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Download, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { Flashcard } from "@/lib/types"

interface FlashcardDisplayProps {
  flashcards: Flashcard[]
  onReset: () => void
}

export default function FlashcardDisplay({ flashcards, onReset }: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set())

  const currentCard = flashcards[currentIndex]
  const progress = ((studiedCards.size / flashcards.length) * 100).toFixed(0)

  const handleNext = useCallback(() => {
    if (!studiedCards.has(currentCard.id)) {
      setStudiedCards(new Set([...studiedCards, currentCard.id]))
    }
    setFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
  }, [currentCard.id, studiedCards, flashcards.length])

  const handlePrevious = useCallback(() => {
    setFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }, [flashcards.length])

  const handleFlip = useCallback(() => {
    setFlipped(!flipped)
    if (!flipped && !studiedCards.has(currentCard.id)) {
      setStudiedCards(new Set([...studiedCards, currentCard.id]))
    }
  }, [flipped, currentCard.id, studiedCards])

  const handleExport = () => {
    const dataStr = JSON.stringify(flashcards, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    
    const exportFileDefaultName = `flashcards-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          handleFlip()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleFlip, handleNext, handlePrevious])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <Home className="h-5 w-5" />
              New Document
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Progress: {progress}% ({studiedCards.size}/{flashcards.length} cards studied)
          </p>
        </div>

        <div className="relative h-96 mb-8">
          <div
            className={cn(
              "absolute inset-0 w-full h-full transition-transform duration-500 cursor-pointer",
              "transform-style-preserve-3d",
              flipped ? "rotate-y-180" : ""
            )}
            onClick={handleFlip}
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div 
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl shadow-lg flex items-center justify-center p-8 backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-2xl md:text-3xl font-medium text-center text-gray-800 dark:text-gray-100">
                {currentCard.front}
              </p>
            </div>
            
            <div 
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl shadow-lg flex items-center justify-center p-8 backface-hidden rotate-y-180"
              style={{ 
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)"
              }}
            >
              <p className="text-lg md:text-xl text-center text-gray-800 dark:text-gray-100">
                {currentCard.back}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4">
          <button
            onClick={handlePrevious}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={handleFlip}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="h-5 w-5" />
            Flip Card
          </button>
          
          <button
            onClick={handleNext}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Click the card or press Space to flip
        </p>
      </div>
    </div>
  )
}