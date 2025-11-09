"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, Sparkles, BookmarkCheck, Trash2 } from "lucide-react"
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

interface Preset {
  id: string
  preset_name: string
  selection_data: SelectionData
  created_at: string
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

  // Preset loading state
  const [presets, setPresets] = useState<Preset[]>([])
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  // Reset state when documentId changes (prevents stale topics from previous document)
  useEffect(() => {
    console.log(`🔄 PageTopicSelector reset for new document:`, { documentId, totalPages })
    setTopics([])
    setSelectedTopicId(null)
    setTopicsError(null)
    setSelectionMode('full')
    setPageStart('1')
    setPageEnd(totalPages.toString())
    setSelectedPresetId(null)

    // Load presets for new document
    loadPresets()
  }, [documentId, totalPages])

  // Load saved presets
  const loadPresets = async () => {
    setIsLoadingPresets(true)

    try {
      const response = await fetch(`/api/documents/${documentId}/presets`)

      if (!response.ok) {
        throw new Error('Failed to load presets')
      }

      const data = await response.json()
      setPresets(data.presets || [])
      console.log(`📚 Loaded ${data.count} presets for document ${documentId}`)

    } catch (error) {
      console.error('Error loading presets:', error)
      // Fail silently - presets are optional
    } finally {
      setIsLoadingPresets(false)
    }
  }

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
      console.log(`🔍 Loading topics for documentId: ${documentId}`)

      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now()
      const response = await fetch(`/api/documents/${documentId}/topics?t=${timestamp}`, {
        cache: 'no-store', // Disable browser cache
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to detect topics')
      }

      const data = await response.json()
      console.log(`📦 Loaded ${data.topics?.length || 0} topics for document ${documentId}:`, data.topics?.slice(0, 3).map((t: Topic) => t.title))

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

  const handleLoadPreset = (preset: Preset) => {
    console.log(`📖 Loading preset: ${preset.preset_name}`, preset.selection_data)

    const selectionData = preset.selection_data
    setSelectedPresetId(preset.id)

    // Apply the saved selection
    if (selectionData.type === 'full') {
      setSelectionMode('full')
    } else if (selectionData.type === 'pages' && selectionData.pageRange) {
      setSelectionMode('pages')
      setPageStart(selectionData.pageRange.start.toString())
      setPageEnd(selectionData.pageRange.end.toString())
    } else if (selectionData.type === 'topic' && selectionData.topic) {
      setSelectionMode('topics')
      // Load topics if not already loaded
      if (topics.length === 0) {
        loadTopics().then(() => {
          // After topics load, select the topic from preset
          setSelectedTopicId(selectionData.topic!.id)
        })
      } else {
        setSelectedTopicId(selectionData.topic.id)
      }
    }
  }

  const handleDeletePreset = async (presetId: string, presetName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering load preset

    if (!confirm(`Delete preset "${presetName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/presets?presetId=${presetId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete preset')
      }

      console.log(`🗑️ Deleted preset: ${presetName}`)

      // Refresh presets list
      setPresets(presets.filter(p => p.id !== presetId))

      // Clear selection if deleted preset was selected
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null)
      }

    } catch (error) {
      console.error('Error deleting preset:', error)
      alert('Failed to delete preset. Please try again.')
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Saved Presets Dropdown */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4" />
            Saved Selections
          </label>
          <div className="space-y-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleLoadPreset(preset)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left group",
                  selectedPresetId === preset.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {preset.preset_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {preset.selection_data.type === 'full' && 'Full Document'}
                    {preset.selection_data.type === 'pages' && `Pages ${preset.selection_data.pageRange?.start}-${preset.selection_data.pageRange?.end}`}
                    {preset.selection_data.type === 'topic' && preset.selection_data.topic?.title}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPresetId === preset.id && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, preset.preset_name, e)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete preset"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
