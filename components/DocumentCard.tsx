"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, File, FileType, Trash2, Download, Loader2, CheckCircle2, AlertCircle, ChevronDown, Eye } from "lucide-react"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/lib/store/useStore"

interface DocumentCardProps {
  document: Document
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => void
}

export default function DocumentCard({ document, onSelectMode, onDelete }: DocumentCardProps) {
  const router = useRouter()
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lastUsedMode, setLastUsedMode] = useState<PreferredMode>('flashcards')
  const { activeMode } = useUIStore()

  // Load last used mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('lastUsedMode') as PreferredMode
      if (savedMode && ['flashcards', 'chat', 'podcast', 'mindmap'].includes(savedMode)) {
        setLastUsedMode(savedMode)
      }
    }
  }, [])

  const getFileIcon = () => {
    const type = document.file_type.toLowerCase()
    if (type.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />
    } else if (type.includes('word') || type.includes('docx')) {
      return <FileType className="w-8 h-8 text-blue-500" />
    } else {
      return <File className="w-8 h-8 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    switch (document.processing_status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </div>
        )
      case 'processing':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Failed
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded-md text-xs font-medium">
            Pending
          </div>
        )
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${document.file_name}"?`)) {
      setIsDeleting(true)
      await onDelete(document.id)
    }
  }

  const modes = [
    { id: 'flashcards', name: 'Flashcards', icon: '🎯', available: true },
    { id: 'chat', name: 'Chat', icon: '💬', available: true },
    { id: 'podcast', name: 'Podcast', icon: '🎙️', available: true },
    { id: 'mindmap', name: 'Mind Map', icon: '🗺️', available: true }
  ]

  const handleQuickOpen = () => {
    // Priority 1: If user is in a specific mode (not home), use that mode
    // This ensures selecting a document from Mind Map mode stays in Mind Map mode
    let modeToUse: PreferredMode = lastUsedMode

    if (activeMode && activeMode !== 'home' && ['flashcards', 'chat', 'podcast', 'mindmap'].includes(activeMode)) {
      modeToUse = activeMode as PreferredMode
    }

    // Check if mode is available
    const mode = modes.find(m => m.id === modeToUse)
    if (mode?.available) {
      // Save mode and open
      localStorage.setItem('lastUsedMode', modeToUse)
      onSelectMode(document.id, modeToUse)
    } else {
      // Fallback to flashcards if mode isn't available
      localStorage.setItem('lastUsedMode', 'flashcards')
      onSelectMode(document.id, 'flashcards')
    }
  }

  const handleModeSelect = (modeId: string) => {
    const mode = modes.find(m => m.id === modeId)
    if (mode?.available) {
      localStorage.setItem('lastUsedMode', modeId)
      setLastUsedMode(modeId as PreferredMode)
      onSelectMode(document.id, modeId as PreferredMode)
    } else {
      alert(`${mode?.name} mode is coming soon!`)
    }
  }

  return (
    <div className={cn(
      "relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        {getStatusBadge()}
      </div>

      {/* File Icon */}
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-3">
        {getFileIcon()}
      </div>

      {/* File Info */}
      <h3 className="text-base font-semibold text-black dark:text-white mb-1 truncate pr-20" title={document.file_name}>
        {document.file_name}
      </h3>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>{formatFileSize(document.file_size)}</span>
        <span>•</span>
        <span>{formatDate(document.created_at)}</span>
      </div>

      {/* Smart Mode Selection */}
      {!showModeSelector ? (
        <div className="flex gap-2">
          <button
            onClick={handleQuickOpen}
            disabled={document.processing_status !== 'completed'}
            className={cn(
              "flex-1 py-2 px-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium transition-all shadow-lg",
              document.processing_status === 'completed'
                ? "hover:opacity-90 hover:shadow-xl"
                : "opacity-50 cursor-not-allowed"
            )}
          >
            {(() => {
              // Show the mode that will actually be used
              const modeToUse = (activeMode && activeMode !== 'home' && ['flashcards', 'chat', 'podcast', 'mindmap'].includes(activeMode))
                ? activeMode
                : lastUsedMode
              return `Open in ${modes.find(m => m.id === modeToUse)?.name || 'Flashcards'}`
            })()}
          </button>
          <button
            onClick={() => setShowModeSelector(true)}
            disabled={document.processing_status !== 'completed'}
            className={cn(
              "py-2 px-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg transition-all shadow-lg",
              document.processing_status === 'completed'
                ? "hover:opacity-90 hover:shadow-xl"
                : "opacity-50 cursor-not-allowed"
            )}
            title="Choose different mode"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Choose Learning Mode:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                disabled={!mode.available}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  mode.available
                    ? "border-accent-primary/30 dark:border-accent-primary/50 hover:border-accent-primary dark:hover:border-accent-primary hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20"
                    : "border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-2xl">{mode.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {mode.name}
                </span>
                {!mode.available && (
                  <span className="text-xs text-gray-400">Soon</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModeSelector(false)}
            className="w-full py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {(document.file_type.toLowerCase().includes('pdf') || document.file_name.toLowerCase().endsWith('.pdf')) && (
          <button
            onClick={() => router.push(`/dashboard/documents/${document.id}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent-primary hover:text-accent-secondary hover:bg-accent-primary/10 rounded-lg transition-colors"
            title="View PDF"
          >
            <Eye className="w-3.5 h-3.5" />
            View PDF
          </button>
        )}
        {document.storage_path && (
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Error Message */}
      {document.processing_status === 'failed' && document.error_message && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">
            {document.error_message}
          </p>
        </div>
      )}
    </div>
  )
}
