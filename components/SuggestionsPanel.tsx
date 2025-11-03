"use client"

import { X, AlertCircle, CheckCircle2, Info, ChevronRight } from 'lucide-react'
import type { WritingSuggestion } from '@/lib/supabase/types'

interface SuggestionsPanelProps {
  isOpen: boolean
  onClose: () => void
  suggestions: WritingSuggestion[]
  onSuggestionClick?: (suggestion: WritingSuggestion) => void
  onApplySuggestion?: (suggestionId: string, replacement: string) => void
}

export default function SuggestionsPanel({
  isOpen,
  onClose,
  suggestions,
  onSuggestionClick,
  onApplySuggestion
}: SuggestionsPanelProps) {
  const getSeverityIcon = (severity: WritingSuggestion['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'suggestion':
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: WritingSuggestion['severity']) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10'
      case 'suggestion':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
    }
  }

  const getTypeLabel = (type: WritingSuggestion['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = []
    }
    acc[suggestion.type].push(suggestion)
    return acc
  }, {} as Record<string, WritingSuggestion[]>)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Writing Suggestions
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {suggestions.length} {suggestions.length === 1 ? 'issue' : 'issues'} found
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No issues found
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your writing looks great!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => (
              <div key={type}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  {getTypeLabel(type)}
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {typeSuggestions.length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {typeSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${getSeverityColor(
                        suggestion.severity
                      )}`}
                      onClick={() => onSuggestionClick?.(suggestion)}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        {getSeverityIcon(suggestion.severity)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {suggestion.message}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Context */}
                      {suggestion.context && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Context:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-800 p-2 rounded">
                            "{suggestion.context}"
                          </p>
                        </div>
                      )}

                      {/* Replacement */}
                      {suggestion.replacement && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Suggested replacement:
                          </p>
                          <div className="flex items-start gap-2">
                            <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded flex-1">
                              "{suggestion.replacement}"
                            </p>
                            {onApplySuggestion && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onApplySuggestion(suggestion.id, suggestion.replacement!)
                                }}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {suggestion.explanation && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Why:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {suggestion.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
