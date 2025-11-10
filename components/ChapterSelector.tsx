"use client"

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, CheckSquare, Square } from 'lucide-react'
import { Chapter } from '@/lib/chapter-extractor'

interface ChapterSelectorProps {
  documentId: string
  documentName: string
  onConfirm: (selectedChapterIds: string[]) => void
  onCancel: () => void
  isOpen: boolean
}

export default function ChapterSelector({
  documentId,
  documentName,
  onConfirm,
  onCancel,
  isOpen
}: ChapterSelectorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && documentId) {
      extractChapters()
    }
  }, [isOpen, documentId])

  const extractChapters = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/chapters`)

      if (!response.ok) {
        throw new Error('Failed to extract chapters')
      }

      const data = await response.json()

      if (data.chapters && data.chapters.length > 0) {
        setChapters(data.chapters)
        // Pre-select all chapters by default
        setSelectedIds(new Set(data.chapters.map((ch: Chapter) => ch.id)))
      } else {
        // No chapters found - treat as single document
        setChapters([{
          id: 'full-document',
          title: 'Full Document',
          pageStart: 1,
          level: 1,
          selected: true
        }])
        setSelectedIds(new Set(['full-document']))
      }
    } catch (err) {
      console.error('Chapter extraction error:', err)
      setError(err instanceof Error ? err.message : 'Failed to extract chapters')

      // Fallback: single chapter
      setChapters([{
        id: 'full-document',
        title: 'Full Document',
        pageStart: 1,
        level: 1,
        selected: true
      }])
      setSelectedIds(new Set(['full-document']))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleChapter = (chapterId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId)
      } else {
        newSet.add(chapterId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(chapters.map(ch => ch.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one chapter')
      return
    }
    onConfirm(Array.from(selectedIds))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                Select Chapters to Index
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {documentName}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-accent-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-accent-primary animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Analyzing document structure...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                This may take 10-20 seconds for large documents
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedIds.size} of {chapters.length} selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={selectNone}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Select None
                  </button>
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Smart indexing:</strong> Only selected chapters will be indexed, saving time and cost.
                  You can always index more chapters later.
                </p>
              </div>

              {/* Chapter List */}
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => toggleChapter(chapter.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedIds.has(chapter.id)
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {selectedIds.has(chapter.id) ? (
                          <CheckSquare className="w-5 h-5 text-accent-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={`font-medium ${
                              selectedIds.has(chapter.id)
                                ? 'text-black dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                            style={{ marginLeft: `${(chapter.level - 1) * 16}px` }}
                          >
                            {chapter.title}
                          </h3>
                          {chapter.pageStart && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {chapter.pageEnd
                                ? `pp. ${chapter.pageStart}-${chapter.pageEnd}`
                                : `p. ${chapter.pageStart}+`}
                            </span>
                          )}
                        </div>
                        {chapter.level > 1 && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            Section
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || selectedIds.size === 0}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Analyzing...
              </>
            ) : (
              `Continue with ${selectedIds.size} ${selectedIds.size === 1 ? 'chapter' : 'chapters'}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
