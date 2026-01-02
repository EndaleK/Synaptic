"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, File as FileIcon, FileType, Trash2, Download, Loader2, AlertCircle, Eye, Sparkles, Map, MessageCircle, BookOpen, Mic, Network, Database, Star, MoreHorizontal } from "lucide-react"
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
  const [showActions, setShowActions] = useState(false)
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
      return <FileText className="w-5 h-5 text-red-500" />
    } else if (type.includes('word') || type.includes('docx')) {
      return <FileType className="w-5 h-5 text-blue-500" />
    } else {
      return <FileIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getFileExtension = () => {
    const name = document.file_name
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE'
    return ext.length > 4 ? ext.substring(0, 4) : ext
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
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        className={cn(
          "group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col h-full overflow-hidden",
          "hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md",
          isDeleting && "opacity-50 pointer-events-none",
          isDragging && "opacity-40 scale-[0.98]",
          isSelected && "ring-2 ring-violet-500 dark:ring-violet-400 border-transparent"
        )}
      >
        {/* Selection Checkbox - Always visible when selection mode is active */}
        {onToggleSelect && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect(document.id)
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 flex-1">
          {/* Header Row - File type badge, star, and status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* File Type Badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                document.file_type.toLowerCase().includes('pdf')
                  ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                  : document.file_type.toLowerCase().includes('doc')
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}>
                {getFileIcon()}
                <span>{getFileExtension()}</span>
              </div>

              {/* Status Indicator - Compact dot style */}
              {document.processing_status === 'processing' && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                </div>
              )}
              {document.processing_status === 'failed' && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" />
                </div>
              )}
              {document.processing_status === 'needs_ocr' && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-medium">
                  OCR
                </div>
              )}
              {document.rag_indexed && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded text-[10px] font-medium">
                  <Database className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            {/* Star Button */}
            {onStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStar(document.id, !document.is_starred)
                }}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  document.is_starred
                    ? "text-yellow-500"
                    : "text-gray-300 dark:text-gray-600 hover:text-yellow-500 opacity-0 group-hover:opacity-100"
                )}
                title={document.is_starred ? "Unstar" : "Star"}
              >
                <Star className={cn("w-4 h-4", document.is_starred && "fill-current")} />
              </button>
            )}
          </div>

          {/* Document Title */}
          <h3
            className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug"
            title={document.file_name}
          >
            {document.file_name}
          </h3>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mb-3">
            <span>{formatFileSize(document.file_size)}</span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span>{formatDate(document.created_at)}</span>
          </div>

          {/* Content Counts - Subtle inline badges */}
          {isReady && (contentCounts.flashcards > 0 || contentCounts.podcasts > 0 || contentCounts.mindmaps > 0) && (
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
              {contentCounts.flashcards > 0 && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>{contentCounts.flashcards}</span>
                </div>
              )}
              {contentCounts.podcasts > 0 && (
                <div className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>{contentCounts.podcasts}</span>
                </div>
              )}
              {contentCounts.mindmaps > 0 && (
                <div className="flex items-center gap-1">
                  <Network className="w-3 h-3" />
                  <span>{contentCounts.mindmaps}</span>
                </div>
              )}
            </div>
          )}

          {/* RAG Indexing Required Notice */}
          {isReady && document.file_size > 10 * 1024 * 1024 && !document.extracted_text && document.rag_indexed !== true && (
            <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Large file — indexing required for AI features
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

          {/* Error Message */}
          {document.processing_status === 'failed' && document.error_message && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                {document.error_message}
              </p>
            </div>
          )}
        </div>

        {/* Action Bar - Shows on hover with smooth transition */}
        <div className={cn(
          "border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm transition-all duration-200",
          showActions || !isReady ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {/* Primary Actions - Clean horizontal layout */}
          <div className="p-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleGenerateClick('flashcards')
              }}
              disabled={!isReady}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                isReady
                  ? "text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300"
                  : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
              )}
              title="Generate flashcards"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleGenerateClick('podcast')
              }}
              disabled={!isReady}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                isReady
                  ? "text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300"
                  : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
              )}
              title="Generate podcast"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audio</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleGenerateClick('mindmap')
              }}
              disabled={!isReady}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                isReady
                  ? "text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300"
                  : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
              )}
              title="Generate mind map"
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleChatClick()
              }}
              disabled={!isReady}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                isReady
                  ? "text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300"
                  : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
              )}
              title="Chat with document"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>

            {/* More Actions Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showActions && (
                <div className="absolute right-0 bottom-full mb-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]">
                  {(document.file_type.toLowerCase().includes('pdf') || document.file_name.toLowerCase().endsWith('.pdf')) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/documents/${document.id}`)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View PDF
                    </button>
                  )}
                  {document.storage_path && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/api/documents/${document.id}/download`, '_blank')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
