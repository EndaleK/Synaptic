"use client"

import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UploadProgressProps {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  onCancel?: () => void
}

export default function UploadProgress({
  fileName,
  progress,
  status,
  error,
  onCancel
}: UploadProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-purple-600 dark:text-purple-400'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Error'
    }
  }

  return (
    <div className={cn(
      "p-4 bg-white dark:bg-gray-800 border rounded-lg transition-all",
      status === 'error'
        ? "border-red-200 dark:border-red-800"
        : "border-gray-200 dark:border-gray-700"
    )}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          status === 'completed' && "bg-green-100 dark:bg-green-900/30",
          status === 'error' && "bg-red-100 dark:bg-red-900/30",
          (status === 'uploading' || status === 'processing') && "bg-purple-100 dark:bg-purple-900/30"
        )}>
          {status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : status === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {fileName}
            </p>
            {status !== 'completed' && status !== 'error' && onCancel && (
              <button
                onClick={onCancel}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Cancel upload"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* Status Text */}
          <p className={cn("text-xs font-medium mb-2", getStatusColor())}>
            {getStatusText()} {status !== 'error' && status !== 'completed' && `${progress}%`}
          </p>

          {/* Progress Bar */}
          {status !== 'completed' && status !== 'error' && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Upload Progress Container for multiple files
interface UploadProgressContainerProps {
  uploads: UploadProgressProps[]
  onCancelAll?: () => void
}

export function UploadProgressContainer({ uploads, onCancelAll }: UploadProgressContainerProps) {
  if (uploads.length === 0) return null

  const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'processing')

  return (
    <div className="fixed bottom-24 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] space-y-3">
      {uploads.length > 1 && hasActiveUploads && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Uploading {uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length} files
          </p>
          {onCancelAll && (
            <button
              onClick={onCancelAll}
              className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              Cancel All
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {uploads.map((upload, index) => (
          <UploadProgress key={index} {...upload} />
        ))}
      </div>
    </div>
  )
}
