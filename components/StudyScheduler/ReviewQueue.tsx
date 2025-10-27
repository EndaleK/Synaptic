"use client"

import { useState, useEffect } from 'react'
import { Brain, CheckCircle, AlertCircle, Clock, TrendingUp, Loader2, ArrowRight } from 'lucide-react'
import { formatInterval } from '@/lib/spaced-repetition/sm2-algorithm'

interface FlashcardReview {
  queueId: string | null
  flashcardId: string
  front: string
  back: string
  difficulty: string
  documentName: string
  documentId: string

  easeFactor: number
  interval: number
  repetitions: number
  dueDate: string
  lastReviewedAt: string | null

  maturity: 'new' | 'learning' | 'young' | 'mature'
  estimatedRetention: number
  daysOverdue: number

  timesReviewed: number
  timesCorrect: number
  successRate: number
}

interface ReviewQueueStats {
  totalDue: number
  newCards: number
  learningCards: number
  youngCards: number
  matureCards: number
  averageRetention: number
}

interface ReviewQueueProps {
  onComplete?: () => void
}

export default function ReviewQueue({ onComplete }: ReviewQueueProps) {
  const [queue, setQueue] = useState<FlashcardReview[]>([])
  const [stats, setStats] = useState<ReviewQueueStats | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    startTime: new Date()
  })

  const currentCard = queue[currentIndex]
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0

  // Fetch review queue on mount
  useEffect(() => {
    fetchReviewQueue()
  }, [])

  const fetchReviewQueue = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/flashcards/review-queue')
      if (!response.ok) {
        throw new Error('Failed to fetch review queue')
      }

      const data = await response.json()
      setQueue(data.queue || [])
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue')
      console.error('Review queue error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/flashcards/update-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: currentCard.flashcardId,
          rating
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      const data = await response.json()

      // Update session stats
      const isCorrect = ['good', 'easy'].includes(rating)
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct
      }))

      // Move to next card
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setIsFlipped(false)
      } else {
        // Completed all reviews
        if (onComplete) {
          onComplete()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit review')
      console.error('Submit review error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMaturityColor = (maturity: string) => {
    switch (maturity) {
      case 'new': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      case 'learning': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'young': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'mature': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRatingButtonStyle = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const base = "flex-1 px-4 py-3 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"

    switch (rating) {
      case 'again':
        return `${base} bg-red-500 hover:bg-red-600 text-white`
      case 'hard':
        return `${base} bg-orange-500 hover:bg-orange-600 text-white`
      case 'good':
        return `${base} bg-green-500 hover:bg-green-600 text-white`
      case 'easy':
        return `${base} bg-blue-500 hover:bg-blue-600 text-white`
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-accent-primary" />
        <p className="text-gray-600 dark:text-gray-400">Loading your review queue...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        <button
          onClick={fetchReviewQueue}
          className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  // No cards to review
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            All Caught Up! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            You have no flashcards due for review today. Great job staying on top of your studies!
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:opacity-90"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  // Completed session
  if (currentIndex >= queue.length) {
    const duration = Math.floor((new Date().getTime() - sessionStats.startTime.getTime()) / 60000)
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0

    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Review Session Complete! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Great work! You've completed all your reviews for now.
          </p>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {sessionStats.reviewed}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Cards Reviewed</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {accuracy}%
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 mt-1">Accuracy</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {duration}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Minutes</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchReviewQueue}
            className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-accent-primary text-accent-primary rounded-lg font-semibold hover:bg-accent-primary hover:text-white transition-colors"
          >
            Review More
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:opacity-90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-2xl p-6 border border-accent-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Session</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Card {currentIndex + 1} of {queue.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMaturityColor(currentCard.maturity)}`}>
              {currentCard.maturity.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-accent-primary to-accent-secondary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative cursor-pointer group"
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl min-h-[400px] flex flex-col">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Brain className="w-4 h-4" />
                <span>{currentCard.documentName}</span>
              </div>
              {!isFlipped && (
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Click to reveal answer
                </span>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            {!isFlipped ? (
              /* Front */
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  {currentCard.front}
                </p>
                <div className="mt-8 text-gray-400 dark:text-gray-500">
                  <ArrowRight className="w-6 h-6 mx-auto animate-bounce" />
                </div>
              </div>
            ) : (
              /* Back */
              <div className="text-center w-full">
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  {currentCard.front}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-6">
                  {currentCard.back}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 font-medium">
            How well did you know this?
          </p>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleRating('again')}
              disabled={isSubmitting}
              className={getRatingButtonStyle('again')}
            >
              <div>
                <div className="text-lg">Again</div>
                <div className="text-xs opacity-80 mt-1">&lt;1 min</div>
              </div>
            </button>
            <button
              onClick={() => handleRating('hard')}
              disabled={isSubmitting}
              className={getRatingButtonStyle('hard')}
            >
              <div>
                <div className="text-lg">Hard</div>
                <div className="text-xs opacity-80 mt-1">{formatInterval(Math.max(1, Math.floor(currentCard.interval * 0.8)))}</div>
              </div>
            </button>
            <button
              onClick={() => handleRating('good')}
              disabled={isSubmitting}
              className={getRatingButtonStyle('good')}
            >
              <div>
                <div className="text-lg">Good</div>
                <div className="text-xs opacity-80 mt-1">{formatInterval(currentCard.interval)}</div>
              </div>
            </button>
            <button
              onClick={() => handleRating('easy')}
              disabled={isSubmitting}
              className={getRatingButtonStyle('easy')}
            >
              <div>
                <div className="text-lg">Easy</div>
                <div className="text-xs opacity-80 mt-1">{formatInterval(Math.ceil(currentCard.interval * 1.3))}</div>
              </div>
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Times reviewed: {currentCard.timesReviewed} • Success rate: {currentCard.successRate}%
          </p>
        </div>
      )}
    </div>
  )
}
