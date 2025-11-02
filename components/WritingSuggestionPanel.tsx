"use client"

import { AlertCircle, CheckCircle2, AlertTriangle, Lightbulb, X, Check } from 'lucide-react'
import { useState } from 'react'
import type { WritingSuggestion, SuggestionType, SuggestionSeverity } from '@/lib/supabase/types'

interface WritingSuggestionPanelProps {
  suggestions: WritingSuggestion[]
  onAcceptSuggestion?: (suggestionId: string) => void
  onRejectSuggestion?: (suggestionId: string) => void
  onSuggestionClick?: (suggestion: WritingSuggestion) => void
}

export default function WritingSuggestionPanel({
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onSuggestionClick
}: WritingSuggestionPanelProps) {
  const [selectedType, setSelectedType] = useState<SuggestionType | 'all'>('all')
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (dismissedIds.has(s.id)) return false
    if (selectedType === 'all') return true
    return s.type === selectedType
  })

  // Group by severity
  const errorCount = filteredSuggestions.filter(s => s.severity === 'error').length
  const warningCount = filteredSuggestions.filter(s => s.severity === 'warning').length
  const suggestionCount = filteredSuggestions.filter(s => s.severity === 'suggestion').length

  // Count by type
  const typeCounts: Record<SuggestionType, number> = {
    grammar: suggestions.filter(s => s.type === 'grammar' && !dismissedIds.has(s.id)).length,
    spelling: suggestions.filter(s => s.type === 'spelling' && !dismissedIds.has(s.id)).length,
    structure: suggestions.filter(s => s.type === 'structure' && !dismissedIds.has(s.id)).length,
    tone: suggestions.filter(s => s.type === 'tone' && !dismissedIds.has(s.id)).length,
    citation: suggestions.filter(s => s.type === 'citation' && !dismissedIds.has(s.id)).length,
    clarity: suggestions.filter(s => s.type === 'clarity' && !dismissedIds.has(s.id)).length
  }

  const handleAccept = (suggestionId: string) => {
    onAcceptSuggestion?.(suggestionId)
    setDismissedIds(prev => new Set([...prev, suggestionId]))
  }

  const handleReject = (suggestionId: string) => {
    onRejectSuggestion?.(suggestionId)
    setDismissedIds(prev => new Set([...prev, suggestionId]))
  }

  const getSeverityIcon = (severity: SuggestionSeverity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: SuggestionSeverity) => {
    switch (severity) {
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
      case 'suggestion':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    }
  }

  const getTypeLabel = (type: SuggestionType) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  if (suggestions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            No Suggestions
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your writing looks great! Click "Analyze" to get AI feedback.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Writing Suggestions
        </h2>

        {/* Severity Summary */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{errorCount}</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{warningCount}</span>
            </div>
          )}
          {suggestionCount > 0 && (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium">{suggestionCount}</span>
            </div>
          )}
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({filteredSuggestions.length})
          </button>
          {(Object.entries(typeCounts) as [SuggestionType, number][]).map(([type, count]) => (
            count > 0 && (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {getTypeLabel(type)} ({count})
              </button>
            )
          ))}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No {selectedType !== 'all' ? selectedType : ''} suggestions
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`border-l-4 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all ${getSeverityColor(suggestion.severity)}`}
              onClick={() => onSuggestionClick?.(suggestion)}
            >
              <div className="flex items-start gap-2 mb-2">
                {getSeverityIcon(suggestion.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {suggestion.message}
                  </p>
                </div>
              </div>

              {suggestion.replacement && (
                <div className="ml-6 mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested:</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    "{suggestion.replacement}"
                  </p>
                </div>
              )}

              {suggestion.explanation && (
                <p className="ml-6 text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {suggestion.explanation}
                </p>
              )}

              {/* Action Buttons */}
              <div className="ml-6 flex items-center gap-2">
                {suggestion.replacement && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAccept(suggestion.id)
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Accept
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReject(suggestion.id)
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
