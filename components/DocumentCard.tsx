"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, File as FileIcon, FileType, Trash2, Download, Loader2, CheckCircle2, AlertCircle, Eye, Sparkles, Zap, Map, MessageCircle, BookOpen, Mic, Network, Database, Star } from "lucide-react"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"
import ContentSelectionModal from "./ContentSelectionModal"
import IndexDocumentButton from "./IndexDocumentButton"

interface DocumentCardProps {
  document: Document
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => void
  onRefresh?: () => void
  onStar?: (documentId: string, starred: boolean) => Promise<void>
  selectedDocuments?: Set<string>
  onToggleSelect?: (documentId: string) => void
}

export default function DocumentCard({ document, onSelectMode, onDelete, onRefresh, onStar, selectedDocuments, onToggleSelect }: DocumentCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGenerationType, setSelectedGenerationType] = useState<'flashcards' | 'podcast' | 'mindmap'>('flashcards')
  const [contentCounts, setContentCounts] = useState({ flashcards: 0, podcasts: 0, mindmaps: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const isSelected = selectedDocuments?.has(document.id) || false

  // Callback when RAG indexing completes
  const handleIndexComplete = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  // Fetch content counts for this document
  useEffect(() => {
    const fetchContentCounts = async () => {
      try {
        const [flashcardsRes, podcastsRes, mindmapsRes] = await Promise.all([
          fetch(`/api/flashcards?documentId=${document.id}`),
          fetch(`/api/podcasts?documentId=${document.id}`),
          fetch(`/api/mindmaps?documentId=${document.id}`)
        ])

        const [flashcardsData, podcastsData, mindmapsData] = await Promise.all([
          flashcardsRes.ok ? flashcardsRes.json() : { flashcards: [] },
          podcastsRes.ok ? podcastsRes.json() : { podcasts: [] },
          mindmapsRes.ok ? mindmapsRes.json() : { mindmaps: [] }
        ])

        setContentCounts({
          flashcards: flashcardsData.flashcards?.length || 0,
          podcasts: podcastsData.podcasts?.length || 0,
          mindmaps: mindmapsData.mindmaps?.length || 0
        })
      } catch (error) {
        console.error('Failed to fetch content counts:', error)
      }
    }

    if (document.processing_status === 'completed') {
      fetchContentCounts()
    }
  }, [document.id, document.processing_status])

  const getFileIcon = () => {
    const type = document.file_type.toLowerCase()
    if (type.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />
    } else if (type.includes('word') || type.includes('docx')) {
      return <FileType className="w-8 h-8 text-blue-500" />
    } else {
      return <FileIcon className="w-8 h-8 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    // Check if this is a large document that needs RAG indexing
    const isLargeDocument = document.file_size > 10 * 1024 * 1024 // >10MB
    const isRAGIndexed = document.rag_indexed === true
    const needsRAGIndexing = isLargeDocument && !document.extracted_text && !isRAGIndexed

    // Don't show "Index Required" if already indexed
    if (needsRAGIndexing && document.processing_status === 'completed') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md text-xs font-medium">
          <Database className="w-3 h-3" />
          Index Required
        </div>
      )
    }

    if (isRAGIndexed && document.processing_status === 'completed') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-xs font-medium">
          <Database className="w-3 h-3" />
          RAG Indexed
        </div>
      )
    }

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
      case 'needs_ocr':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs font-medium">
            <Eye className="w-3 h-3" />
            OCR Required
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
    // For podcasts and mind maps, navigate directly to consolidated views
    if (type === 'podcast' || type === 'mindmap') {
      localStorage.setItem('lastUsedMode', type)
      onSelectMode(document.id, type)
      return
    }

    // For flashcards, keep existing modal flow
    setSelectedGenerationType(type)
    setIsModalOpen(true)
  }

  const handleChatClick = () => {
    localStorage.setItem('lastUsedMode', 'chat')
    onSelectMode(document.id, 'chat')
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('documentId', document.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const isReady = document.processing_status === 'completed'

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => onToggleSelect?.(document.id)}
        className={cn(
          "relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-xl hover:border-accent-primary/30 dark:hover:border-accent-primary/50 hover:bg-[#F8F7FF]/50 dark:hover:bg-[#1A1625]/50 transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col h-full",
          isDeleting && "opacity-50 pointer-events-none",
          isDragging && "opacity-40",
          isSelected && "ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg bg-[#F8F7FF]/30 dark:bg-[#1A1625]/30"
        )}
      >
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect(document.id)
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
          </div>
        )}

        {/* Top Right Actions - Star and Status */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {onStar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStar(document.id, !document.is_starred)
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
              title={document.is_starred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  document.is_starred
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-400 hover:text-yellow-400"
                )}
              />
            </button>
          )}
          {getStatusBadge()}
        </div>

        {/* File Icon and Title Section */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-base font-semibold text-black dark:text-white mb-1.5 truncate pr-16" title={document.file_name}>
              {document.file_name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(document.file_size)}</span>
              <span>•</span>
              <span className="truncate">{formatDate(document.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Content Badges */}
        {isReady && (contentCounts.flashcards > 0 || contentCounts.podcasts > 0 || contentCounts.mindmaps > 0) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {contentCounts.flashcards > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-accent-primary/10 dark:bg-accent-primary/20 text-accent-primary rounded-md text-xs font-medium">
                <BookOpen className="w-3 h-3" />
                <span>{contentCounts.flashcards}</span>
              </div>
            )}
            {contentCounts.podcasts > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md text-xs font-medium">
                <Mic className="w-3 h-3" />
                <span>{contentCounts.podcasts}</span>
              </div>
            )}
            {contentCounts.mindmaps > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-medium">
                <Network className="w-3 h-3" />
                <span>{contentCounts.mindmaps}</span>
              </div>
            )}
          </div>
        )}

        {/* RAG Indexing Required - Show Index Button (only if not already indexed) */}
        {isReady && document.file_size > 10 * 1024 * 1024 && !document.extracted_text && document.rag_indexed !== true && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
              This document is large and requires indexing for AI features.
            </p>
            <IndexDocumentButton
              documentId={document.id}
              documentName={document.file_name}
              onIndexComplete={handleIndexComplete}
              variant="primary"
              size="sm"
            />
          </div>
        )}

        {/* Action Buttons - Grid Layout */}
        <div className="grid grid-cols-2 gap-2 mb-4 mt-auto">
          {/* Flashcards Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleGenerateClick('flashcards')
            }}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-medium text-xs transition-all",
              isReady
                ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate flashcards from this document"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">Flashcards</span>
          </button>

          {/* Podcast Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleGenerateClick('podcast')
            }}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-medium text-xs transition-all",
              isReady
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate podcast from this document"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="truncate">Podcast</span>
          </button>

          {/* Mind Map Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleGenerateClick('mindmap')
            }}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-medium text-xs transition-all",
              isReady
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Generate mind map from this document"
          >
            <Map className="w-3.5 h-3.5" />
            <span className="truncate">Mind Map</span>
          </button>

          {/* Chat Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleChatClick()
            }}
            disabled={!isReady}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-medium text-xs transition-all",
              isReady
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
            title="Chat with this document"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="truncate">Chat</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {(document.file_type.toLowerCase().includes('pdf') || document.file_name.toLowerCase().endsWith('.pdf')) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/dashboard/documents/${document.id}`)
              }}
              className="p-2 bg-accent-primary/5 text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-all hover:scale-110"
              title="View PDF"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {document.storage_path && (
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all hover:scale-110"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all hover:scale-110"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
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
