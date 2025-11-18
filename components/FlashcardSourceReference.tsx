"use client"

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { SourceReference } from '@/lib/supabase/types'

interface FlashcardSourceReferenceProps {
  source: SourceReference
  documentName?: string
  documentId?: string
  compact?: boolean
}

export default function FlashcardSourceReference({
  source,
  documentName,
  documentId,
  compact = true
}: FlashcardSourceReferenceProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!source.page && !source.section && !source.excerpt && !source.chunk) {
    return null
  }

  // Build source text
  const buildSourceText = () => {
    const parts: string[] = []
    if (source.section) parts.push(source.section)
    if (source.page) parts.push(`p.${source.page}`)
    if (source.chunk && !source.page) parts.push(`Chunk ${source.chunk}`)
    return parts.join(', ') || 'Source available'
  }

  const sourceText = buildSourceText()

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
          title="View source reference"
        >
          <BookOpen className="w-3 h-3" />
          <span>{sourceText}</span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {isExpanded && (
          <div className="absolute z-10 mt-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Source Reference
                </h4>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {documentName && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Document:</span>{' '}
                  <span className="text-gray-900 dark:text-white font-medium">{documentName}</span>
                </div>
              )}

              {source.section && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Section:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{source.section}</span>
                </div>
              )}

              {source.page && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Page:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{source.page}</span>
                </div>
              )}

              {source.chunk && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Chunk:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{source.chunk}</span>
                </div>
              )}

              {source.excerpt && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Context:</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 italic">
                    "{source.excerpt}..."
                  </p>
                </div>
              )}

              {documentId && (
                <a
                  href={`/dashboard?mode=chat&documentId=${documentId}`}
                  className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View in document
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Extended view
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <BookOpen className="w-4 h-4" />
        Source Reference
      </div>

      {documentName && (
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">Document:</span>{' '}
          <span className="text-gray-900 dark:text-white font-medium">{documentName}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {source.section && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Section:</span>{' '}
            <span className="text-gray-900 dark:text-white">{source.section}</span>
          </div>
        )}

        {source.page && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Page:</span>{' '}
            <span className="text-gray-900 dark:text-white">{source.page}</span>
          </div>
        )}
      </div>

      {source.excerpt && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">Context:</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">
            "{source.excerpt}..."
          </p>
        </div>
      )}

      {documentId && (
        <a
          href={`/dashboard?mode=chat&documentId=${documentId}`}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View in document
        </a>
      )}
    </div>
  )
}
