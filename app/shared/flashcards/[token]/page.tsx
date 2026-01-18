"use client"

import { useState, useEffect, use } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, Clock, User, ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Flashcard {
  id: string
  question: string
  answer: string
  difficulty: string
}

interface SharedDeckData {
  deckName: string
  cardCount: number
  creatorName?: string
  createdAt: string
  flashcards: Flashcard[]
}

export default function SharedFlashcardsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [deckData, setDeckData] = useState<SharedDeckData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await fetch(`/api/shared/flashcards/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('This flashcard deck was not found or is not publicly shared.')
          } else {
            setError('Failed to load flashcard deck.')
          }
          return
        }
        const data = await response.json()
        setDeckData(data)
      } catch (err) {
        setError('Failed to load flashcard deck.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeck()
  }, [token])

  const handleNext = () => {
    if (!deckData) return
    setStudiedCards(prev => new Set([...prev, currentIndex]))
    setIsFlipped(false)
    setCurrentIndex(prev => (prev + 1) % deckData.flashcards.length)
  }

  const handlePrev = () => {
    if (!deckData) return
    setIsFlipped(false)
    setCurrentIndex(prev => (prev - 1 + deckData.flashcards.length) % deckData.flashcards.length)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setStudiedCards(new Set())
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (error || !deckData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Deck Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This flashcard deck is not available.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            Create Your Own Flashcards
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = deckData.flashcards[currentIndex]
  const progress = (studiedCards.size / deckData.flashcards.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
              {deckData.deckName}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {deckData.cardCount} cards
              </span>
              {deckData.creatorName && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {deckData.creatorName}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try Synaptic Free
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Card {currentIndex + 1} of {deckData.flashcards.length}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {studiedCards.size} studied
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full aspect-[3/2] cursor-pointer perspective-1000"
        >
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-500 transform-style-preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front - Question */}
            <div
              className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">
                Question
              </span>
              <p className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white text-center leading-relaxed">
                {currentCard.question}
              </p>
              <span className="absolute bottom-4 text-sm text-gray-400 dark:text-gray-500">
                Tap to reveal answer
              </span>
            </div>

            {/* Back - Answer */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-4">
                Answer
              </span>
              <p className="text-xl sm:text-2xl font-medium text-white text-center leading-relaxed">
                {currentCard.answer}
              </p>
              <span className="absolute bottom-4 text-sm text-white/60">
                Tap to see question
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handlePrev}
            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Reset progress"
          >
            <RotateCcw className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleNext}
            className="p-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Difficulty Badge */}
        <div className="flex justify-center mt-4">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            currentCard.difficulty === 'easy' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            currentCard.difficulty === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            currentCard.difficulty === 'hard' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {currentCard.difficulty || 'medium'}
          </span>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 sm:hidden">
        <Link
          href="/"
          className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all"
        >
          Create Your Own Flashcards - Free
        </Link>
      </div>

      {/* Desktop CTA */}
      <div className="max-w-4xl mx-auto px-4 py-8 hidden sm:block">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Want to create your own flashcards?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload any document and let AI generate flashcards, podcasts, and mind maps for you.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all"
          >
            Start Learning Free
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
