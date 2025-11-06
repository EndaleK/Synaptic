"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PageRange {
  start: number
  end: number
}

export interface Topic {
  id: string
  title: string
  pageRange: PageRange
  description?: string
}

export interface SelectionData {
  type: 'pages' | 'topic' | 'full'
  pageRange?: PageRange
  topic?: Topic
}

interface PageTopicSelectorProps {
  documentId: string
  totalPages: number
  onSelectionChange: (selection: SelectionData) => void
  className?: string
}

export default function PageTopicSelector({
  documentId,
  totalPages,
  onSelectionChange,
  className
}: PageTopicSelectorProps) {
  const [selectionMode, setSelectionMode] = useState<'full' | 'pages' | 'topics'>('full')
  const [pageStart, setPageStart] = useState<string>('1')
  const [pageEnd, setPageEnd] = useState<string>(totalPages.toString())
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)
  const [topicsError, setTopicsError] = useState<string | null>(null)

  // Reset state when documentId changes (prevents stale topics from previous document)
  useEffect(() => {
    setTopics([])
    setSelectedTopicId(null)
    setTopicsError(null)
    setSelectionMode('full')
    setPageStart('1')
    setPageEnd(totalPages.toString())
  }, [documentId, totalPages])

  // Notify parent of selection changes
  useEffect(() => {
    if (selectionMode === 'full') {
      onSelectionChange({ type: 'full' })
    } else if (selectionMode === 'pages') {
      const start = parseInt(pageStart) || 1
      const end = parseInt(pageEnd) || totalPages
      onSelectionChange({
        type: 'pages',
        pageRange: { start: Math.max(1, start), end: Math.min(totalPages, end) }
      })
    } else if (selectionMode === 'topics' && selectedTopicId) {
      const topic = topics.find(t => t.id === selectedTopicId)
      if (topic) {
        onSelectionChange({ type: 'topic', topic })
      }
    }
  }, [selectionMode, pageStart, pageEnd, selectedTopicId, topics, totalPages, onSelectionChange])

  // Load topics when switching to topic mode
  useEffect(() => {
    if (selectionMode === 'topics' && topics.length === 0 && !isLoadingTopics) {
      loadTopics()
    }
  }, [selectionMode, topics.length, isLoadingTopics])

  const loadTopics = async () => {
    setIsLoadingTopics(true)
    setTopicsError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/topics`)

      if (!response.ok) {
        throw new Error('Failed to detect topics')
      }

      const data = await response.json()
      setTopics(data.topics || [])

      if (data.topics && data.topics.length > 0) {
        // Auto-select first topic
        setSelectedTopicId(data.topics[0].id)
      }
    } catch (error) {
      console.error('Error loading topics:', error)
      setTopicsError(error instanceof Error ? error.message : 'Failed to load topics')
    } finally {
      setIsLoadingTopics(false)
    }
  }

  const handlePageStartChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setPageStart(value)
      // Auto-adjust end if start > end
      if (num > parseInt(pageEnd)) {
        setPageEnd(value)
      }
    } else if (value === '') {
      setPageStart('')
    }
  }

  const handlePageEndChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setPageEnd(value)
      // Auto-adjust start if end < start
      if (num < parseInt(pageStart)) {
        setPageStart(value)
      }
    } else if (value === '') {
      setPageEnd('')
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectionMode('full')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all",
            selectionMode === 'full'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          Full Document
        </button>
        <button
          onClick={() => setSelectionMode('pages')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all",
            selectionMode === 'pages'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          Page Range
        </button>
        <button
          onClick={() => setSelectionMode('topics')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1",
            selectionMode === 'topics'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Smart Topics
        </button>
      </div>

      {/* Page Range Input */}
      {selectionMode === 'pages' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Page Range
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageStart}
                onChange={(e) => handlePageStartChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                placeholder="Start"
              />
            </div>
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageEnd}
                onChange={(e) => handlePageEndChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                placeholder="End"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total: {totalPages} pages available
          </p>
        </div>
      )}

      {/* Topic Selection */}
      {selectionMode === 'topics' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Topic or Section
          </label>

          {isLoadingTopics && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Detecting topics with AI...
              </span>
            </div>
          )}

          {topicsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{topicsError}</p>
              <button
                onClick={loadTopics}
                className="mt-2 text-sm text-red-700 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoadingTopics && !topicsError && topics.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No topics detected in this document. Try using page range instead.
              </p>
            </div>
          )}

          {!isLoadingTopics && topics.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    selectedTopicId === topic.id
                      ? "border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-accent-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {topic.title}
                      </div>
                      {topic.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {topic.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Pages {topic.pageRange.start}-{topic.pageRange.end}
                      </div>
                    </div>
                    {selectedTopicId === topic.id && (
                      <Check className="w-5 h-5 text-accent-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Document Mode */}
      {selectionMode === 'full' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Flashcards or podcast will be generated from the entire document ({totalPages} pages).
          </p>
        </div>
      )}
    </div>
  )
}
