"use client"

import { useState } from 'react'
import { X, Upload, CheckCircle2, AlertCircle, ChevronUp, FileText } from 'lucide-react'

interface UploadProgressToastProps {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  onExpand?: () => void
  onDismiss?: () => void
}

export default function UploadProgressToast({
  fileName,
  progress,
  status,
  error,
  onExpand,
  onDismiss
}: UploadProgressToastProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const truncatedName = fileName.length > 25
    ? fileName.slice(0, 22) + '...'
    : fileName

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-violet-500 animate-pulse" />
      case 'processing':
        return <FileText className="w-4 h-4 text-amber-500 animate-pulse" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${Math.round(progress)}%`
      case 'processing':
        return 'Processing document...'
      case 'completed':
        return 'Upload complete!'
      case 'error':
        return error || 'Upload failed'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-violet-500'
      case 'processing':
        return 'bg-amber-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
    }
  }

  // Auto-dismiss after completion
  if (status === 'completed' && onDismiss) {
    setTimeout(onDismiss, 3000)
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-violet-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:bg-violet-600 transition-all hover:scale-105"
        title={`${truncatedName} - ${getStatusText()}`}
      >
        {status === 'uploading' || status === 'processing' ? (
          <div className="relative">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-30" />
              <circle
                cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 75.4} 75.4`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {Math.round(progress)}
            </span>
          </div>
        ) : (
          getStatusIcon()
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {status === 'uploading' ? 'Uploading' : status === 'processing' ? 'Processing' : status === 'completed' ? 'Complete' : 'Error'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onExpand && (status === 'uploading' || status === 'processing') && (
            <button
              onClick={onExpand}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="View details"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Minimize"
          >
            <ChevronUp className="w-4 h-4 rotate-180" />
          </button>
          {(status === 'completed' || status === 'error') && onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate mb-2" title={fileName}>
          {truncatedName}
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${status === 'completed' ? 100 : progress}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {getStatusText()}
        </p>

        {status === 'uploading' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            You can continue browsing while this uploads
          </p>
        )}
      </div>
    </div>
  )
}
