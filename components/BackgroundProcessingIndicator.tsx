"use client"

import { useState, useEffect, useRef } from 'react'
import { Loader2, FileText, ChevronUp, ChevronDown, X, CheckCircle2 } from 'lucide-react'

interface ProcessingProgress {
  progress_percent?: number
  message?: string
  step_name?: string
  current_step?: number
  total_steps?: number
}

interface ProcessingDocument {
  id: string
  file_name: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_progress?: ProcessingProgress
  file_size: number
  created_at: string
}

/**
 * BackgroundProcessingIndicator - Shows documents being processed in background
 *
 * Appears as a floating indicator in bottom-right corner when any documents
 * are in 'pending' or 'processing' status. Expandable to show list of documents.
 */
export default function BackgroundProcessingIndicator() {
  const [processingDocs, setProcessingDocs] = useState<ProcessingDocument[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [recentlyCompleted, setRecentlyCompleted] = useState<ProcessingDocument[]>([])

  // Poll for processing documents
  // Use a ref to track previous docs for comparison without triggering re-renders
  const prevDocsRef = useRef<ProcessingDocument[]>([])

  useEffect(() => {
    let isMounted = true
    // Poll every 5 seconds to show progress updates in real-time
    const pollInterval = 5000

    const checkProcessing = async () => {
      try {
        const res = await fetch('/api/documents?status=processing&limit=10', {
          credentials: 'include'
        })
        if (!res.ok) return

        const data = await res.json()
        if (!isMounted) return

        const processing = (data.documents || []).filter((d: ProcessingDocument) =>
          d.processing_status === 'processing' || d.processing_status === 'pending'
        )

        // Check for newly completed documents using ref
        const prevIds = prevDocsRef.current.map(d => d.id)
        const currentIds = processing.map((d: ProcessingDocument) => d.id)
        const completed = prevDocsRef.current.filter(d =>
          prevIds.includes(d.id) && !currentIds.includes(d.id)
        )

        if (completed.length > 0) {
          setRecentlyCompleted(prev => [...prev, ...completed.map(d => ({ ...d, processing_status: 'completed' as const }))])
          // Auto-clear completed after 5 seconds
          setTimeout(() => {
            setRecentlyCompleted(prev => prev.filter(d => !completed.find(c => c.id === d.id)))
          }, 5000)
        }

        // Update ref for next comparison
        prevDocsRef.current = processing
        setProcessingDocs(processing)
      } catch (err) {
        // Silently handle errors - don't spam console
      }
    }

    // Initial check
    checkProcessing()

    // Poll every 15 seconds (processing takes minutes, not seconds)
    const interval = setInterval(checkProcessing, pollInterval)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run once on mount

  const totalCount = processingDocs.length + recentlyCompleted.length

  // Don't render if nothing to show or user dismissed
  if (totalCount === 0 || !isVisible) {
    return null
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded view */}
      {isExpanded ? (
        <div className="w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Processing Documents
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                title="Collapse"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document list */}
          <div className="max-h-64 overflow-y-auto">
            {/* Processing documents */}
            {processingDocs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className="relative">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                    <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(doc.file_size)} • {doc.processing_progress?.message || (doc.processing_status === 'pending' ? 'Queued' : 'Processing...')}
                  </p>
                  {/* Progress bar for processing documents */}
                  {doc.processing_progress?.progress_percent && (
                    <div className="mt-1.5">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-violet-500 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${doc.processing_progress.progress_percent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">
                        {doc.processing_progress.progress_percent}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Recently completed */}
            {recentlyCompleted.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800 last:border-0 bg-green-50 dark:bg-green-900/20"
              >
                <div className="relative">
                  <FileText className="w-8 h-8 text-green-500" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Ready to use!
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can continue using other features
            </p>
          </div>
        </div>
      ) : (
        /* Collapsed badge */
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all hover:scale-105"
        >
          <div className="relative">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {processingDocs.length} processing
          </span>
          {recentlyCompleted.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              {recentlyCompleted.length}
            </span>
          )}
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  )
}
