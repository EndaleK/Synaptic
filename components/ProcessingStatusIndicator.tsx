/**
 * Component: ProcessingStatusIndicator
 *
 * Displays real-time PDF processing status with visual feedback
 *
 * States:
 * - Processing: Animated spinner with progress message
 * - Completed: Success checkmark with extraction stats
 * - Failed: Error icon with retry option
 * - Needs OCR: Special notice about scanned PDFs with OCR option
 *
 * Features:
 * - Auto-polling via useDocumentStatus hook
 * - Animated transitions
 * - Processing duration display
 * - Text extraction stats
 */

'use client'

import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'
import { CheckCircle, XCircle, AlertCircle, Loader2, FileText, Eye } from 'lucide-react'

interface ProcessingStatusIndicatorProps {
  documentId: string
  onComplete?: () => void
  className?: string
  compact?: boolean
}

export default function ProcessingStatusIndicator({
  documentId,
  onComplete,
  className = '',
  compact = false,
}: ProcessingStatusIndicatorProps) {
  const { status, isLoading, error } = useDocumentStatus(documentId, {
    enabled: true,
    onComplete: () => {
      if (onComplete) {
        onComplete()
      }
    },
  })

  if (!status) {
    return null
  }

  const { processingStatus, metadata, hasText, textLength, fileName, ragIndexed, ragChunkCount } = status

  // Format processing duration
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return null
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Compact mode - single line status
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {processingStatus === 'processing' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-gray-600">Processing...</span>
          </>
        )}
        {processingStatus === 'completed' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">Ready</span>
          </>
        )}
        {processingStatus === 'failed' && (
          <>
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-gray-600">Failed</span>
          </>
        )}
        {processingStatus === 'needs_ocr' && (
          <>
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-gray-600">OCR Required</span>
          </>
        )}
      </div>
    )
  }

  // Full mode - detailed status card
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {/* Processing State */}
      {processingStatus === 'processing' && (
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">Processing PDF...</h4>
            <p className="text-sm text-gray-600 mb-2">
              Extracting text and indexing <span className="font-medium">{fileName}</span>
            </p>
            <div className="text-xs text-gray-500">
              {metadata.processingDuration && (
                <p>Processing for {formatDuration(metadata.processingDuration)}</p>
              )}
              <p>Method: {metadata.processingMethod || 'Multi-tier extraction + RAG indexing'}</p>
              <p className="text-blue-600 mt-1">⚡ Processing in background - you can close this and come back later</p>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {processingStatus === 'completed' && (
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">Processing Complete</h4>
            <p className="text-sm text-gray-600 mb-2">
              Successfully extracted text from <span className="font-medium">{fileName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
              {hasText && (
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>{textLength.toLocaleString()} characters extracted</span>
                </div>
              )}
              {ragIndexed && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>{ragChunkCount} chunks indexed for RAG</span>
                </div>
              )}
              {metadata.processingDuration && (
                <span>Completed in {formatDuration(metadata.processingDuration)}</span>
              )}
              {metadata.processingMethod && (
                <span className="capitalize">Method: {metadata.processingMethod}</span>
              )}
            </div>
            {ragIndexed && (
              <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800">
                ✨ Document ready for AI chat, flashcard generation, and semantic search
              </div>
            )}
          </div>
        </div>
      )}

      {/* Failed State */}
      {processingStatus === 'failed' && (
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">Processing Failed</h4>
            <p className="text-sm text-gray-600 mb-2">
              Unable to extract text from <span className="font-medium">{fileName}</span>
            </p>
            {metadata.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 mb-2">
                {metadata.error}
              </div>
            )}
            <p className="text-xs text-gray-500">
              You can still view the PDF, but text-based features (chat, flashcards) won't be available.
            </p>
          </div>
        </div>
      )}

      {/* Needs OCR State */}
      {processingStatus === 'needs_ocr' && (
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">Scanned PDF Detected</h4>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">{fileName}</span> appears to be a scanned document with no extractable text.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
              <p className="text-sm text-amber-900 mb-2">
                <strong>AI-Powered OCR Available</strong>
              </p>
              <p className="text-xs text-amber-800 mb-2">
                Use GPT-4o Vision to extract text from scanned pages (~$0.05 per page).
              </p>
              <button className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded transition-colors">
                Enable OCR Processing
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Eye className="w-3 h-3" />
              <span>You can still view the PDF in the viewer</span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 mt-3 pt-3 border-t">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-600">
              Status check error: {error}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
