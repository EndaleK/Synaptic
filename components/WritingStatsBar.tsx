"use client"

import { Clock, FileText, Type, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WritingStatsBarProps {
  wordCount: number
  characterCount: number
  readingTime: number
  lastSaved?: Date
  isSaving?: boolean
}

export default function WritingStatsBar({
  wordCount,
  characterCount,
  readingTime,
  lastSaved,
  isSaving = false
}: WritingStatsBarProps) {
  const [sessionTime, setSessionTime] = useState(0)

  // Session timer
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatLastSaved = (date?: Date) => {
    if (!date) return 'Not saved'

    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        {/* Left: Statistics */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span className="font-medium">{wordCount.toLocaleString()}</span>
            <span>words</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium">{characterCount.toLocaleString()}</span>
            <span>characters</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">~{readingTime}</span>
            <span>min read</span>
          </div>
        </div>

        {/* Right: Session & Save Status */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Session: {formatTime(sessionTime)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-600 dark:text-blue-400">Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span>{formatLastSaved(lastSaved)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
