"use client"

import { useState } from 'react'
import { Sparkles, X, ChevronUp } from 'lucide-react'
import WritingSuggestionPanel from './WritingSuggestionPanel'
import type { WritingSuggestion } from '@/lib/supabase/types'

interface FloatingSuggestionBadgeProps {
  suggestions: WritingSuggestion[]
  onApplySuggestion: (suggestion: WritingSuggestion) => void
  onDismissSuggestion: (suggestionId: string) => void
}

export default function FloatingSuggestionBadge({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion
}: FloatingSuggestionBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (suggestions.length === 0) return null

  // Count by severity for badge display
  const errorCount = suggestions.filter(s => s.severity === 'error').length
  const warningCount = suggestions.filter(s => s.severity === 'warning').length
  const suggestionCount = suggestions.filter(s => s.severity === 'suggestion').length

  return (
    <>
      {/* Floating Badge - Bottom Right Corner (Grammarly-style) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-20 right-6 z-50 group"
        >
          <div className="relative">
            {/* Badge with suggestion count */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-blue-500 hover:border-blue-600 transition-all hover:shadow-xl">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
              </span>
              <ChevronUp className="w-4 h-4 text-gray-500" />
            </div>

            {/* Error indicator - red dot if errors exist */}
            {errorCount > 0 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                {errorCount}
              </div>
            )}
          </div>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-xs py-1 px-3 rounded whitespace-nowrap">
              {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''}`}
              {warningCount > 0 && (errorCount > 0 ? ', ' : '') + `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
              {suggestionCount > 0 && ((errorCount > 0 || warningCount > 0) ? ', ' : '') + `${suggestionCount} tip${suggestionCount > 1 ? 's' : ''}`}
            </div>
            <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute bottom-0 right-6 -mb-1"></div>
          </div>
        </button>
      )}

      {/* Expanded Panel - Slides up from bottom right */}
      {isExpanded && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Writing Suggestions
              </h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Close suggestions panel"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Suggestion Stats */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm">
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                  </span>
                </div>
              )}
              {suggestionCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {suggestionCount} {suggestionCount === 1 ? 'tip' : 'tips'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto p-4">
            <WritingSuggestionPanel
              suggestions={suggestions}
              onApplySuggestion={onApplySuggestion}
              onDismissSuggestion={onDismissSuggestion}
            />
          </div>
        </div>
      )}
    </>
  )
}
