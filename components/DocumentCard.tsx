"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, File, FileType, Trash2, Download, Loader2, CheckCircle2, AlertCircle, Eye, Sparkles, Zap, Map, MessageCircle } from "lucide-react"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"
import ContentSelectionModal from "./ContentSelectionModal"

interface DocumentCardProps {
  document: Document
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => void
}

export default function DocumentCard({ document, onSelectMode, onDelete }: DocumentCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGenerationType, setSelectedGenerationType] = useState<'flashcards' | 'podcast' | 'mindmap'>('flashcards')

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

  const handleGenerateClick = (type: 'flashcards' | 'podcast' | 'mindmap') => {
    setSelectedGenerationType(type)
    setIsModalOpen(true)
  }

  const handleChatClick = () => {
    localStorage.setItem('lastUsedMode', 'chat')
    onSelectMode(document.id, 'chat')
  }

  const isReady = document.processing_status === 'completed'

  return (
    <>
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
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>{formatDate(document.created_at)}</span>
        </div>

        {/* Action Buttons - Grid Layout */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Flashcards Button */}
          <button
            onClick={() => handleGenerateClick('flashcards')}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
              isReady
                ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 shadow-md hover:shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate flashcards from this document"
          >
            <Sparkles className="w-4 h-4" />
            <span>Flashcards</span>
          </button>

          {/* Podcast Button */}
          <button
            onClick={() => handleGenerateClick('podcast')}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
              isReady
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-md hover:shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate podcast from this document"
          >
            <Zap className="w-4 h-4" />
            <span>Podcast</span>
          </button>

          {/* Mind Map Button */}
          <button
            onClick={() => handleGenerateClick('mindmap')}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
              isReady
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90 shadow-md hover:shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate mind map from this document"
          >
            <Map className="w-4 h-4" />
            <span>Mind Map</span>
          </button>

          {/* Chat Button */}
          <button
            onClick={handleChatClick}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
              isReady
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 shadow-md hover:shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Chat with this document"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
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

      {/* Content Selection Modal */}
      <ContentSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={document}
        generationType={selectedGenerationType}
      />
    </>
  )
}
