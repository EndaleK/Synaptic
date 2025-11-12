/**
 * Custom React Hook: useDocumentStatus
 *
 * Polls document processing status and provides real-time updates
 *
 * Features:
 * - Auto-polling while status is 'processing'
 * - Exponential backoff (1s → 2s → 5s → 10s intervals)
 * - Auto-stops when processing completes
 * - Manual refresh capability
 * - Error handling with retry logic
 *
 * Usage:
 * ```tsx
 * const { status, isLoading, error, refresh } = useDocumentStatus(documentId)
 *
 * if (status?.processingStatus === 'processing') {
 *   return <ProcessingIndicator />
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface DocumentStatus {
  documentId: string
  fileName: string
  fileType: string
  fileSize: number
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_ocr'
  errorMessage?: string
  hasText: boolean
  textLength: number
  ragIndexed: boolean
  ragChunkCount: number
  ragCollectionName?: string | null
  metadata: {
    processingMethod?: string
    processingStartedAt?: string
    processingCompletedAt?: string
    processingDuration?: number
    requiresOcr: boolean
    message?: string
    error?: string
    fileHash?: string
    isLargeFile: boolean
    ragIndexed?: boolean
    ragChunkCount?: number
  }
  timestamps: {
    createdAt: string
    updatedAt: string
    ragIndexedAt?: string | null
  }
}

interface UseDocumentStatusReturn {
  status: DocumentStatus | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  stopPolling: () => void
}

const POLL_INTERVALS = [1000, 2000, 5000, 10000] // Exponential backoff: 1s, 2s, 5s, 10s

export function useDocumentStatus(
  documentId: string | null,
  options: {
    enabled?: boolean
    onComplete?: (status: DocumentStatus) => void
    onError?: (error: string) => void
  } = {}
): UseDocumentStatusReturn {
  const { enabled = true, onComplete, onError } = options

  const [status, setStatus] = useState<DocumentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  // Fetch status from API
  const fetchStatus = useCallback(async () => {
    if (!documentId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}/status`)

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`)
      }

      const data: DocumentStatus = await response.json()
      setStatus(data)

      // Call onComplete callback if processing finished
      if (
        data.processingStatus === 'completed' ||
        data.processingStatus === 'failed' ||
        data.processingStatus === 'needs_ocr'
      ) {
        isPollingRef.current = false
        if (onComplete) {
          onComplete(data)
        }
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [documentId, onComplete, onError])

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchStatus()
  }, [fetchStatus])

  // Stop polling manually
  const stopPolling = useCallback(() => {
    isPollingRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Polling logic with exponential backoff
  useEffect(() => {
    if (!enabled || !documentId) {
      return
    }

    const poll = async () => {
      try {
        const currentStatus = await fetchStatus()

        // Continue polling if still processing
        if (
          currentStatus &&
          (currentStatus.processingStatus === 'processing' ||
            currentStatus.processingStatus === 'pending') &&
          isPollingRef.current
        ) {
          // Exponential backoff
          const intervalIndex = Math.min(pollCountRef.current, POLL_INTERVALS.length - 1)
          const interval = POLL_INTERVALS[intervalIndex]

          timeoutRef.current = setTimeout(() => {
            pollCountRef.current++
            poll()
          }, interval)
        } else {
          // Stop polling when complete or failed
          isPollingRef.current = false
        }
      } catch (err) {
        // On error, retry with max interval
        if (isPollingRef.current) {
          timeoutRef.current = setTimeout(() => {
            poll()
          }, POLL_INTERVALS[POLL_INTERVALS.length - 1])
        }
      }
    }

    // Start polling
    isPollingRef.current = true
    pollCountRef.current = 0
    poll()

    // Cleanup on unmount
    return () => {
      isPollingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [documentId, enabled, fetchStatus])

  return {
    status,
    isLoading,
    error,
    refresh,
    stopPolling,
  }
}
