"use client"

import { useState, useMemo } from "react"
import { RefreshCw, ChevronDown, Eye, EyeOff, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiffViewerProps {
  versions: Array<{
    version_number: number
    content: string
    timestamp: string
    word_count: number
  }>
  currentContent: string
  className?: string
}

type DiffType = 'added' | 'removed' | 'unchanged'

interface DiffSegment {
  type: DiffType
  text: string
}

/**
 * DiffViewer - Side-by-side comparison of essay versions for revision stage
 *
 * Based on research: "Comparing drafts helps students understand their
 * revision process and see how their thinking evolved" (Revision Pedagogy)
 *
 * Features:
 * - Side-by-side or inline diff view
 * - Highlight additions, deletions, unchanged text
 * - Version selector
 * - Revision statistics (words added/removed)
 */
export default function DiffViewer({
  versions,
  currentContent,
  className
}: DiffViewerProps) {

  const [selectedVersion, setSelectedVersion] = useState<number>(
    versions.length > 0 ? versions[versions.length - 1].version_number : 0
  )
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side')
  const [showUnchanged, setShowUnchanged] = useState(true)

  // Get selected version content
  const selectedVersionContent = useMemo(() => {
    const version = versions.find(v => v.version_number === selectedVersion)
    return version?.content || ''
  }, [versions, selectedVersion])

  // Calculate diff using a simple word-based algorithm
  // (In production, consider using a library like diff-match-patch)
  const diff = useMemo(() => {
    return calculateDiff(selectedVersionContent, currentContent)
  }, [selectedVersionContent, currentContent])

  // Calculate statistics
  const stats = useMemo(() => {
    const added = diff.filter(d => d.type === 'added').reduce((sum, d) => sum + d.text.split(/\s+/).length, 0)
    const removed = diff.filter(d => d.type === 'removed').reduce((sum, d) => sum + d.text.split(/\s+/).length, 0)
    const unchanged = diff.filter(d => d.type === 'unchanged').reduce((sum, d) => sum + d.text.split(/\s+/).length, 0)

    return { added, removed, unchanged, total: added + removed + unchanged }
  }, [diff])

  if (versions.length === 0) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center", className)}>
        <RefreshCw className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Previous Versions
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Save your work to create versions that you can compare later
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revision Comparison
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-all",
                viewMode === 'side-by-side'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('inline')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-all",
                viewMode === 'inline'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Inline
            </button>
          </div>

          {/* Version Selector */}
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {versions.map((version) => (
              <option key={version.version_number} value={version.version_number}>
                Version {version.version_number} ({new Date(version.timestamp).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{stats.added}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Words Added</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{stats.removed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Words Removed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.unchanged}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Unchanged</div>
          </div>
        </div>

        {/* Show/Hide Unchanged Toggle */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {showUnchanged ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showUnchanged ? 'Hide' : 'Show'} unchanged text
          </button>
        </div>
      </div>

      {/* Diff Display */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Previous Version */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Version {selectedVersion}
              </h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="text-sm leading-relaxed space-y-2">
                {diff.map((segment, index) => {
                  if (!showUnchanged && segment.type === 'unchanged') return null
                  if (segment.type === 'added') return null // Don't show in old version

                  return (
                    <span
                      key={index}
                      className={cn(
                        segment.type === 'removed' && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through",
                        segment.type === 'unchanged' && "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {segment.text}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Current Version */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Current Version
              </h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="text-sm leading-relaxed space-y-2">
                {diff.map((segment, index) => {
                  if (!showUnchanged && segment.type === 'unchanged') return null
                  if (segment.type === 'removed') return null // Don't show in new version

                  return (
                    <span
                      key={index}
                      className={cn(
                        segment.type === 'added' && "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
                        segment.type === 'unchanged' && "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {segment.text}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Inline View
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Changes from Version {selectedVersion} to Current
            </h4>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="text-sm leading-relaxed space-y-1">
              {diff.map((segment, index) => {
                if (!showUnchanged && segment.type === 'unchanged') return null

                return (
                  <span
                    key={index}
                    className={cn(
                      segment.type === 'added' && "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
                      segment.type === 'removed' && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through",
                      segment.type === 'unchanged' && "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {segment.text}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Revision Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><span className="text-green-700 dark:text-green-300">Green</span> text shows additions you made</li>
              <li><span className="text-red-700 dark:text-red-300">Red strikethrough</span> shows deletions</li>
              <li>Look for patterns in your revisions to improve your writing process</li>
              <li>Consider why you made each change - was it for clarity, structure, or style?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple word-based diff algorithm
 * (In production, use a library like diff-match-patch for better accuracy)
 */
function calculateDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const diff: DiffSegment[] = []
  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (oldIndex >= oldWords.length) {
      // Rest is added
      diff.push({ type: 'added', text: newWords.slice(newIndex).join('') })
      break
    }

    if (newIndex >= newWords.length) {
      // Rest is removed
      diff.push({ type: 'removed', text: oldWords.slice(oldIndex).join('') })
      break
    }

    if (oldWords[oldIndex] === newWords[newIndex]) {
      // Unchanged
      diff.push({ type: 'unchanged', text: oldWords[oldIndex] })
      oldIndex++
      newIndex++
    } else {
      // Different - look ahead to find match
      const oldLookahead = oldWords.slice(oldIndex, oldIndex + 5)
      const newLookahead = newWords.slice(newIndex, newIndex + 5)

      const newMatchIndex = oldLookahead.indexOf(newWords[newIndex])
      const oldMatchIndex = newLookahead.indexOf(oldWords[oldIndex])

      if (newMatchIndex > 0) {
        // Words were removed
        diff.push({ type: 'removed', text: oldWords.slice(oldIndex, oldIndex + newMatchIndex).join('') })
        oldIndex += newMatchIndex
      } else if (oldMatchIndex > 0) {
        // Words were added
        diff.push({ type: 'added', text: newWords.slice(newIndex, newIndex + oldMatchIndex).join('') })
        newIndex += oldMatchIndex
      } else {
        // Single word change
        diff.push({ type: 'removed', text: oldWords[oldIndex] })
        diff.push({ type: 'added', text: newWords[newIndex] })
        oldIndex++
        newIndex++
      }
    }
  }

  // Merge consecutive segments of same type
  const merged: DiffSegment[] = []
  for (const segment of diff) {
    const last = merged[merged.length - 1]
    if (last && last.type === segment.type) {
      last.text += segment.text
    } else {
      merged.push(segment)
    }
  }

  return merged
}
