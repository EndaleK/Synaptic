"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Target,
  Clock,
  ChevronRight,
  Zap,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeakTopic {
  topic: string
  score: number
  reason: 'low_accuracy' | 'no_flashcards' | 'low_exam_score' | 'not_reviewed'
  flashcardCount: number
  accuracy: number | null
  examScore: number | null
  suggestedAction: string
}

interface WeakTopicsPanelProps {
  documentId?: string
  onGenerateFlashcards?: (topic: string) => void
  onStartQuiz?: (topic: string) => void
  onReviewFlashcards?: (topic: string) => void
  className?: string
}

export default function WeakTopicsPanel({
  documentId,
  onGenerateFlashcards,
  onStartQuiz,
  onReviewFlashcards,
  className
}: WeakTopicsPanelProps) {
  const { isLoaded, isSignedIn } = useUser()
  const [topics, setTopics] = useState<WeakTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const fetchWeakTopics = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (documentId) params.set('documentId', documentId)

        const response = await fetch(`/api/topics/weakness-analysis?${params}`)

        if (!response.ok) {
          if (response.status === 401) return
          // Don't throw - just set empty topics (table may not exist yet)
          setTopics([])
          return
        }

        const data = await response.json()
        setTopics(data.weakTopics || [])
      } catch (err) {
        // Silently fail - weakness analysis feature may not be set up yet
        console.debug('Weak topics not available:', err)
        setTopics([])
      } finally {
        setLoading(false)
      }
    }

    fetchWeakTopics()
  }, [isLoaded, isSignedIn, documentId])

  if (!isLoaded || !isSignedIn) return null

  if (loading) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6",
        className
      )}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6",
        className
      )}>
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6",
        className
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Focus Areas</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Great job! No weak topics identified.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Keep up the good work!
          </p>
        </div>
      </div>
    )
  }

  const getReasonIcon = (reason: WeakTopic['reason']) => {
    switch (reason) {
      case 'no_flashcards':
        return BookOpen
      case 'low_accuracy':
        return Brain
      case 'low_exam_score':
        return Target
      case 'not_reviewed':
        return Clock
      default:
        return AlertTriangle
    }
  }

  const getReasonLabel = (reason: WeakTopic['reason']) => {
    switch (reason) {
      case 'no_flashcards':
        return 'No flashcards'
      case 'low_accuracy':
        return 'Low accuracy'
      case 'low_exam_score':
        return 'Low exam score'
      case 'not_reviewed':
        return 'Not reviewed recently'
      default:
        return 'Needs attention'
    }
  }

  const getActionButton = (topic: WeakTopic) => {
    switch (topic.reason) {
      case 'no_flashcards':
        return {
          label: 'Generate Flashcards',
          icon: Sparkles,
          onClick: () => onGenerateFlashcards?.(topic.topic),
          color: 'bg-violet-600 hover:bg-violet-700 text-white'
        }
      case 'low_accuracy':
      case 'not_reviewed':
        return {
          label: 'Review Now',
          icon: RefreshCw,
          onClick: () => onReviewFlashcards?.(topic.topic),
          color: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      case 'low_exam_score':
        return {
          label: 'Practice Quiz',
          icon: Target,
          onClick: () => onStartQuiz?.(topic.topic),
          color: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
      default:
        return null
    }
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Focus Areas</h3>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            {topics.length} topic{topics.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Topics List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {topics.map((topic, index) => {
          const ReasonIcon = getReasonIcon(topic.reason)
          const action = getActionButton(topic)

          return (
            <div
              key={index}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Topic Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  topic.score < 40 ? "bg-red-100 dark:bg-red-900/30" :
                  topic.score < 60 ? "bg-amber-100 dark:bg-amber-900/30" :
                  "bg-yellow-100 dark:bg-yellow-900/30"
                )}>
                  <ReasonIcon className={cn(
                    "w-5 h-5",
                    topic.score < 40 ? "text-red-600 dark:text-red-400" :
                    topic.score < 60 ? "text-amber-600 dark:text-amber-400" :
                    "text-yellow-600 dark:text-yellow-400"
                  )} />
                </div>

                {/* Topic Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {topic.topic}
                    </h4>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-medium",
                      topic.score < 40 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      topic.score < 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}>
                      {topic.score}%
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {getReasonLabel(topic.reason)}
                    {topic.flashcardCount > 0 && ` • ${topic.flashcardCount} cards`}
                    {topic.accuracy !== null && ` • ${Math.round(topic.accuracy)}% accuracy`}
                  </p>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                    {topic.flashcardCount > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {topic.flashcardCount} cards
                      </span>
                    )}
                    {topic.accuracy !== null && (
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {Math.round(topic.accuracy)}% accuracy
                      </span>
                    )}
                    {topic.examScore !== null && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {Math.round(topic.examScore)}% exam
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {action && (
                    <button
                      onClick={action.onClick}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        action.color
                      )}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  )}
                </div>

                {/* Progress Bar (Mini) */}
                <div className="w-16 flex-shrink-0">
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        topic.score < 40 ? "bg-red-500" :
                        topic.score < 60 ? "bg-amber-500" :
                        "bg-yellow-500"
                      )}
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          Focus on these topics to improve your exam readiness score
        </p>
      </div>
    </div>
  )
}
