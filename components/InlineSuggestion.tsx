"use client"

import { useState, useRef, useEffect } from 'react'
import { Check, X, AlertCircle, Lightbulb, BookOpen, Sparkles } from 'lucide-react'
import type { WritingSuggestion } from '@/lib/supabase/types'

interface InlineSuggestionProps {
  suggestion: WritingSuggestion
  onApply: (suggestionId: string) => void
  onDismiss: (suggestionId: string) => void
  position: { top: number; left: number }
}

const suggestionColors = {
  grammar: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  },
  style: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
  },
  clarity: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
  },
  structure: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
  },
  citation: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
  },
  enhancement: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
  }
}

const categoryIcons = {
  grammar: AlertCircle,
  style: Sparkles,
  clarity: Lightbulb,
  structure: BookOpen,
  citation: BookOpen,
  enhancement: Sparkles
}

export default function InlineSuggestion({
  suggestion,
  onApply,
  onDismiss,
  position
}: InlineSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const colors = suggestionColors[suggestion.category] || suggestionColors.style
  const Icon = categoryIcons[suggestion.category] || Lightbulb

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  const handleApply = () => {
    onApply(suggestion.id)
    setIsExpanded(false)
  }

  const handleDismiss = () => {
    onDismiss(suggestion.id)
    setIsExpanded(false)
  }

  return (
    <div
      ref={cardRef}
      className="absolute z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxWidth: isExpanded ? '400px' : '200px'
      }}
    >
      {!isExpanded ? (
        // Compact Badge
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full
            ${colors.badge}
            border ${colors.border}
            text-xs font-medium
            shadow-lg hover:shadow-xl
            transition-all duration-200 hover:scale-105
            cursor-pointer
          `}
        >
          <Icon className="w-3 h-3" />
          <span className="capitalize">{suggestion.category}</span>
        </button>
      ) : (
        // Expanded Card
        <div
          className={`
            ${colors.bg}
            border-2 ${colors.border}
            rounded-lg shadow-xl
            p-4
            animate-in zoom-in-95 duration-200
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${colors.icon}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                {suggestion.category}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* Issue */}
          <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">
            {suggestion.issue}
          </p>

          {/* Suggested Text */}
          {suggestion.suggestedText && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Suggested replacement:</p>
              <div className={`
                px-3 py-2 rounded
                bg-white/50 dark:bg-gray-800/50
                border ${colors.border}
              `}>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  "{suggestion.suggestedText}"
                </p>
              </div>
            </div>
          )}

          {/* Explanation */}
          {suggestion.explanation && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Why:</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {suggestion.explanation}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            {suggestion.suggestedText && (
              <button
                onClick={handleApply}
                className="
                  flex-1 flex items-center justify-center gap-1.5
                  px-3 py-1.5 rounded-md
                  bg-green-600 hover:bg-green-700
                  text-white text-xs font-medium
                  transition-colors
                "
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-1.5 rounded-md
                bg-gray-200 hover:bg-gray-300
                dark:bg-gray-700 dark:hover:bg-gray-600
                text-gray-700 dark:text-gray-300
                text-xs font-medium
                transition-colors
              "
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
