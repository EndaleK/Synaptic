"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, BookOpen, List, Tag, Sparkles, Check, Loader2, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  TOCSection,
  IndexEntry,
  BookStructure,
  StructureAnalysis,
  AISuggestions,
  ContentSuggestion,
  ContentType
} from "@/lib/types"

interface BookNavigatorProps {
  documentId: string
  onSelectionChange: (selection: {
    type: 'structure' | 'suggestion'
    sectionIds?: string[]
    suggestionId?: string
  }) => void
  className?: string
}

export default function BookNavigator({
  documentId,
  onSelectionChange,
  className
}: BookNavigatorProps) {
  const [viewMode, setViewMode] = useState<'structure' | 'suggestions' | 'index'>('structure')
  const [structures, setStructures] = useState<BookStructure | null>(null)
  const [analysis, setAnalysis] = useState<StructureAnalysis | null>(null)
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  // Load book structure
  useEffect(() => {
    loadStructure()
  }, [documentId])

  // Notify parent of selection changes
  useEffect(() => {
    if (selectedSections.size > 0) {
      onSelectionChange({
        type: 'structure',
        sectionIds: Array.from(selectedSections)
      })
    }
  }, [selectedSections, onSelectionChange])

  const loadStructure = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/structure`)

      if (!response.ok) {
        const data = await response.json()

        // Handle case where structure hasn't been analyzed yet
        if (response.status === 404) {
          setError(
            data.message ||
            'Book structure not available for this document. This may be because:\n\n' +
            '• The document was uploaded before structure detection was added\n' +
            '• The document has no detectable table of contents or index\n' +
            '• Structure extraction is still processing\n\n' +
            'Try using Manual Selection mode instead, or re-upload your document.'
          )
          setIsLoading(false)
          return
        }

        throw new Error(data.error || 'Failed to load book structure')
      }

      const data = await response.json()
      setStructures(data.structures)
      setAnalysis(data.analysis)
      setSuggestions(data.suggestions)

      // Check if we actually have structure data
      if (!data.structures || Object.keys(data.structures).length === 0) {
        setError('No book structure detected in this document. Please use Manual Selection mode.')
        setIsLoading(false)
        return
      }

      // Auto-expand first level
      if (data.structures?.toc?.chapters) {
        const firstLevelIds = data.structures.toc.chapters.map((ch: TOCSection) => ch.id)
        setExpandedSections(new Set(firstLevelIds))
      } else if (data.structures?.bookmarks?.bookmarks) {
        const firstLevelIds = data.structures.bookmarks.bookmarks.map((bm: any) => bm.id)
        setExpandedSections(new Set(firstLevelIds))
      } else if (data.structures?.headings?.headings) {
        const firstLevelIds = data.structures.headings.headings
          .filter((h: any) => h.level === 1)
          .map((h: any) => h.id)
        setExpandedSections(new Set(firstLevelIds))
      }

    } catch (error) {
      console.error('Error loading structure:', error)
      setError(error instanceof Error ? error.message : 'Failed to load structure')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const toggleSectionSelection = (sectionId: string) => {
    const newSelected = new Set(selectedSections)
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId)
    } else {
      newSelected.add(sectionId)
    }
    setSelectedSections(newSelected)
  }

  const selectSuggestion = (suggestionId: string, contentType: ContentType) => {
    onSelectionChange({
      type: 'suggestion',
      suggestionId: `${contentType}-${suggestionId}`
    })
  }

  const renderTOCSection = (section: TOCSection, level: number = 0) => {
    const isExpanded = expandedSections.has(section.id)
    const isSelected = selectedSections.has(section.id)
    const hasChildren = section.sections && section.sections.length > 0

    return (
      <div key={section.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors group",
            isSelected
              ? "bg-accent-primary/10 border border-accent-primary/30"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          style={{ marginLeft: `${level * 20}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleSection(section.id)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {!hasChildren && <div className="w-5" />}

          <button
            onClick={() => toggleSectionSelection(section.id)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-accent-primary border-accent-primary"
                  : "border-gray-300 dark:border-gray-600 group-hover:border-accent-primary/50"
              )}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>

            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {section.title}
            </span>

            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              pp. {section.pageRange.start}-{section.pageRange.end}
            </span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {section.sections!.map(subsection =>
              renderTOCSection(subsection, level + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  const renderStructureView = () => {
    if (!structures) return null

    const recommendedStructure = analysis?.recommended || 'toc'
    const structure = structures[recommendedStructure as keyof BookStructure]

    if (!structure) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No book structure detected for this document.</p>
          <p className="text-sm mt-1">This feature works best with textbooks and academic materials.</p>
        </div>
      )
    }

    // Render TOC
    if ('chapters' in structure && structure.chapters) {
      return (
        <div className="space-y-1">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Recommended: Table of Contents
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {analysis?.reasoning || 'Best structure for navigation'}
            </p>
          </div>

          {structure.chapters.map((chapter: TOCSection) =>
            renderTOCSection(chapter)
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {selectedSections.size} section{selectedSections.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
      )
    }

    return <p className="text-gray-500 dark:text-gray-400">Unsupported structure type</p>
  }

  const renderSuggestion = (suggestion: ContentSuggestion, type: ContentType, index: number) => {
    const typeColors = {
      flashcards: 'from-purple-500 to-pink-500',
      podcasts: 'from-blue-500 to-cyan-500',
      mindmaps: 'from-green-500 to-emerald-500'
    }

    const typeIcons = {
      flashcards: '🎯',
      podcasts: '🎙️',
      mindmaps: '🗺️'
    }

    return (
      <button
        key={suggestion.sectionId}
        onClick={() => selectSuggestion(suggestion.sectionId, type)}
        className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-accent-primary dark:hover:border-accent-primary transition-all group"
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">{typeIcons[type]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {suggestion.title}
              </h4>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                pp. {suggestion.pageRange.start}-{suggestion.pageRange.end}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {suggestion.reason}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-gradient-to-r rounded-full",
                      typeColors[type]
                    )}
                    style={{ width: `${suggestion.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(suggestion.confidence * 100)}% match
                </span>
              </div>

              {suggestion.estimatedOutput && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {suggestion.estimatedOutput.cards && `~${suggestion.estimatedOutput.cards} cards`}
                  {suggestion.estimatedOutput.duration && suggestion.estimatedOutput.duration}
                  {suggestion.estimatedOutput.nodes && `~${suggestion.estimatedOutput.nodes} nodes`}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  const renderSuggestionsView = () => {
    if (!suggestions) return null

    return (
      <div className="space-y-6">
        {/* Flashcard Suggestions */}
        {suggestions.flashcards.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Best for Flashcards
            </h3>
            <div className="space-y-2">
              {suggestions.flashcards.slice(0, 3).map((s, i) =>
                renderSuggestion(s, 'flashcards', i)
              )}
            </div>
          </div>
        )}

        {/* Podcast Suggestions */}
        {suggestions.podcasts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              Best for Podcasts
            </h3>
            <div className="space-y-2">
              {suggestions.podcasts.slice(0, 3).map((s, i) =>
                renderSuggestion(s, 'podcasts', i)
              )}
            </div>
          </div>
        )}

        {/* Mind Map Suggestions */}
        {suggestions.mindmaps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              Best for Mind Maps
            </h3>
            <div className="space-y-2">
              {suggestions.mindmaps.slice(0, 3).map((s, i) =>
                renderSuggestion(s, 'mindmaps', i)
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderIndexView = () => {
    if (!structures?.index?.detected) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No index detected in this document.</p>
        </div>
      )
    }

    const filteredEntries = structures.index.entries.filter(entry =>
      searchTerm === '' || entry.term.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search index..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
        />

        <div className="max-h-96 overflow-y-auto space-y-1">
          {filteredEntries.slice(0, 50).map((entry, i) => (
            <div
              key={i}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.term}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.pages.join(', ')}
                </span>
              </div>
              {entry.subEntries && entry.subEntries.length > 0 && (
                <div className="ml-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {entry.subEntries.join(', ')}
                </div>
              )}
            </div>
          ))}

          {filteredEntries.length > 50 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              Showing first 50 of {filteredEntries.length} entries
            </p>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analyzing book structure...
          </p>
        </div>
      </div>
    )
  }

  const retryExtraction = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/structure`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Structure extraction failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          message: data.message
        })

        throw new Error(
          data.message ||
          data.error ||
          data.details ||
          `Failed to extract structure (${response.status})`
        )
      }

      console.log('Structure extraction successful:', data)

      // Reload structure after successful extraction
      await loadStructure()
    } catch (err) {
      console.error('Error extracting structure:', err)
      setError(err instanceof Error ? err.message : 'Failed to extract structure')
      setIsLoading(false)
    }
  }

  if (error) {
    const isNoStructureError = error.includes('does not appear to have a table of contents')

    return (
      <div className={cn("p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800", className)}>
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <BookOpen className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              {isNoStructureError ? 'No Structure Detected' : 'Smart Structure Unavailable'}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
              {isNoStructureError
                ? 'This document doesn\'t have a detectable table of contents or index in a standard format. This is common with some PDF textbooks.'
                : error}
            </p>
            <div className="space-y-2">
              {isNoStructureError ? (
                <div className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                  <p className="font-semibold mb-1">💡 Recommended:</p>
                  <p>Switch to <strong>Manual Selection</strong> mode to select specific page ranges or let AI detect topics automatically.</p>
                </div>
              ) : (
                <button
                  onClick={retryExtraction}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Extracting...' : 'Try Extracting Structure'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('structure')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
            viewMode === 'structure'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Structure
        </button>

        <button
          onClick={() => setViewMode('suggestions')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
            viewMode === 'suggestions'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          <Sparkles className="w-4 h-4" />
          AI Suggestions
        </button>

        <button
          onClick={() => setViewMode('index')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
            viewMode === 'index'
              ? "bg-accent-primary text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          <List className="w-4 h-4" />
          Index
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
        {viewMode === 'structure' && renderStructureView()}
        {viewMode === 'suggestions' && renderSuggestionsView()}
        {viewMode === 'index' && renderIndexView()}
      </div>
    </div>
  )
}
