"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Target, X, BookOpen, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionFocusBannerProps {
  onSuggestQuestion?: (question: string) => void
  className?: string
}

/**
 * SessionFocusBanner displays when a user navigates to chat from a study session.
 * It shows the focused topic and suggests relevant questions.
 */
export default function SessionFocusBanner({
  onSuggestQuestion,
  className
}: SessionFocusBannerProps) {
  const searchParams = useSearchParams()
  const [dismissed, setDismissed] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  // Extract session context from URL params
  const sessionId = searchParams.get('sessionId')
  const sessionTopic = searchParams.get('sessionTopic')
  const startPage = searchParams.get('startPage')
  const endPage = searchParams.get('endPage')

  // Generate suggested questions based on topic
  useEffect(() => {
    if (!sessionTopic) return

    const questions = [
      `Explain the key concepts of ${sessionTopic} in simple terms`,
      `What are the most important things to know about ${sessionTopic}?`,
      `Can you quiz me on ${sessionTopic}?`,
      `What are common misconceptions about ${sessionTopic}?`,
    ]

    setSuggestedQuestions(questions)
  }, [sessionTopic])

  // Don't render if no session context or dismissed
  if (!sessionId || !sessionTopic || dismissed) {
    return null
  }

  const pageRange = startPage && endPage
    ? `Pages ${startPage}-${endPage}`
    : null

  return (
    <div className={cn(
      "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
      "border border-violet-200 dark:border-violet-800 rounded-xl p-4 mb-4",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
            <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-medium text-violet-900 dark:text-violet-100 flex items-center gap-2">
              Session Focus Mode
            </h3>
            <p className="text-sm text-violet-700 dark:text-violet-300 mt-0.5">
              <strong>{sessionTopic}</strong>
              {pageRange && <span className="text-violet-500 dark:text-violet-400"> ({pageRange})</span>}
            </p>
            <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">
              Your conversation will focus on this topic from your study plan.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-violet-400" />
        </button>
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && onSuggestQuestion && (
        <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800">
          <p className="text-xs text-violet-500 dark:text-violet-400 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Suggested questions for this topic:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => onSuggestQuestion(question)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-colors",
                  "bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300",
                  "border border-violet-200 dark:border-violet-700",
                  "hover:bg-violet-100 dark:hover:bg-violet-900/50"
                )}
              >
                {question.length > 50 ? question.slice(0, 47) + '...' : question}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
