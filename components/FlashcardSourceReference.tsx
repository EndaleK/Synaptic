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

  // Stop click propagation to prevent card flip
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!source.page && !source.section && !source.excerpt && !source.chunk) {
    return null
  }

  // Build source text - prioritize section name over potentially inaccurate page numbers
  const buildSourceText = () => {
    const parts: string[] = []
    if (source.section) {
      // Truncate long section names for display
      const truncatedSection = source.section.length > 30
        ? source.section.slice(0, 27) + '...'
        : source.section
      parts.push(truncatedSection)
    }
    // Only show page if no section (page numbers may be start of range, not specific)
    if (source.page && !source.section) parts.push(`p.${source.page}`)
    if (source.chunk && !source.page && !source.section) parts.push(`Chunk ${source.chunk}`)
    return parts.join(', ') || 'Source available'
  }

  const sourceText = buildSourceText()

  if (compact) {
    // Build query params for chat context
    const buildChatUrl = () => {
      const params = new URLSearchParams()
      params.set('mode', 'chat')
      if (documentId) params.set('documentId', documentId)
      // Pass source context to pre-fill chat query
      if (source.section) params.set('sourceSection', source.section)
      if (source.excerpt) params.set('sourceExcerpt', source.excerpt.slice(0, 200))
      return `/dashboard?${params.toString()}`
    }

    return (
      <div className="relative flex items-center gap-2" onClick={handleClick}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
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
          <div
            className="absolute bottom-full left-0 mb-2 z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
            onClick={handleClick}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Source Reference
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(false)
                  }}
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
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 italic line-clamp-3">
                    "{source.excerpt}..."
                  </p>
                </div>
              )}

              {documentId && (
                <a
                  href={buildChatUrl()}
                  onClick={handleClick}
                  className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ask about this in Chat
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
