/**
 * Custom hook for real-time writing analysis with debouncing
 * Analyzes content as user types (with 2-second delay)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { WritingType, CitationStyle, WritingSuggestion } from '@/lib/supabase/types'

interface UseRealTimeAnalysisProps {
  content: string
  writingType: WritingType
  citationStyle?: CitationStyle
  enabled?: boolean
  debounceMs?: number
}

export function useRealTimeAnalysis({
  content,
  writingType,
  citationStyle,
  enabled = true,
  debounceMs = 2000
}: UseRealTimeAnalysisProps) {
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState('')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const analyzeContent = useCallback(async (textToAnalyze: string) => {
    // Don't analyze if content is too short or hasn't changed
    if (textToAnalyze.length < 50 || textToAnalyze === lastAnalyzedContent) {
      return
    }

    // Cancel any ongoing request
    if (abortController.current) {
      abortController.current.abort()
    }

    // Create new abort controller
    abortController.current = new AbortController()

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/writing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToAnalyze,
          writingType,
          citationStyle,
          includeStructureAnalysis: false // Don't include structure analysis in real-time
        }),
        signal: abortController.current.signal
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const { suggestions: newSuggestions } = await response.json()

      // Only update if this is still the latest request
      setSuggestions(newSuggestions || [])
      setLastAnalyzedContent(textToAnalyze)
    } catch (error: unknown) {
      // Ignore abort errors (they're expected when user types before analysis completes)
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Real-time analysis error:', error)
        // Don't clear existing suggestions on error, just stop loading
      }
    } finally {
      setIsAnalyzing(false)
    }
  }, [writingType, citationStyle, lastAnalyzedContent])

  // Debounced analysis effect
  useEffect(() => {
    if (!enabled || !content) {
      return
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      analyzeContent(content)
    }, debounceMs)

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [content, enabled, debounceMs, analyzeContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // Manual trigger function (for "Analyze" button)
  const triggerAnalysis = useCallback(() => {
    if (content) {
      analyzeContent(content)
    }
  }, [content, analyzeContent])

  return {
    suggestions,
    isAnalyzing,
    triggerAnalysis,
    clearSuggestions: () => setSuggestions([])
  }
}
