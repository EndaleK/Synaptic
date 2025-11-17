"use client"

import { useState } from "react"
import { FileText, Image as ImageIcon, File, Globe, Star, MoreVertical, Trash2, FolderInput } from "lucide-react"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils"

interface DocumentListViewProps {
  documents: Document[]
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => Promise<void>
  onStar: (documentId: string, starred: boolean) => Promise<void>
  selectedDocuments: Set<string>
  onToggleSelect: (documentId: string) => void
}

export default function DocumentListView({
  documents,
  onSelectMode,
  onDelete,
  onStar,
  selectedDocuments,
  onToggleSelect
}: DocumentListViewProps) {
  const [contextMenu, setContextMenu] = useState<{ documentId: string; x: number; y: number } | null>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />
    if (fileType.includes('url') || fileType.includes('web')) return <Globe className="w-5 h-5 text-green-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs text-green-600 dark:text-green-400">✓ Ready</span>
      case 'processing':
        return <span className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">⚡ Processing</span>
      case 'failed':
        return <span className="text-xs text-red-600 dark:text-red-400">✗ Failed</span>
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        <div className="col-span-1 flex items-center">
          <input
            type="checkbox"
            checked={selectedDocuments.size === documents.length && documents.length > 0}
            onChange={() => {
              if (selectedDocuments.size === documents.length) {
                documents.forEach(doc => onToggleSelect(doc.id))
              } else {
                documents.forEach(doc => {
                  if (!selectedDocuments.has(doc.id)) onToggleSelect(doc.id)
                })
              }
            }}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
          />
        </div>
        <div className="col-span-3">Name</div>
        <div className="col-span-1 text-center" title="Flashcards">⚡</div>
        <div className="col-span-1 text-center" title="Chat">💬</div>
        <div className="col-span-1 text-center" title="Mind Map">🗺️</div>
        <div className="col-span-1 text-center" title="Podcast">🎧</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-1">Modified</div>
        <div className="col-span-1"></div>
      </div>

      {/* Document Rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {documents.map((document) => {
          const isSelected = selectedDocuments.has(document.id)

          return (
            <div
              key={document.id}
              className={cn(
                "grid grid-cols-12 gap-4 px-4 py-3 items-center group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer",
                isSelected && "bg-blue-50 dark:bg-blue-900/20"
              )}
              onClick={() => onToggleSelect(document.id)}
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(document.id)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
              </div>

              {/* Name + Icon */}
              <div className="col-span-12 md:col-span-3 flex items-center gap-3 min-w-0">
                {getFileIcon(document.file_type)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {document.file_name}
                  </p>
                  {/* Mobile: Show content badges inline */}
                  <div className="flex md:hidden items-center gap-2 mt-1 text-xs">
                    {document.metadata?.flashcards_count > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        ⚡ {document.metadata.flashcards_count}
                      </span>
                    )}
                    {document.metadata?.chat_messages_count > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        💬 {document.metadata.chat_messages_count}
                      </span>
                    )}
                    {document.metadata?.mindmaps_count > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                        🗺️ {document.metadata.mindmaps_count}
                      </span>
                    )}
                    {document.metadata?.podcasts_count > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        🎧 {document.metadata.podcasts_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Flashcards Column - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center justify-center">
                {document.metadata?.flashcards_count > 0 ? (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full min-w-[32px]">
                    {document.metadata.flashcards_count}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-700">—</span>
                )}
              </div>

              {/* Chat Column - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center justify-center">
                {document.metadata?.chat_messages_count > 0 ? (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full min-w-[32px]">
                    {document.metadata.chat_messages_count}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-700">—</span>
                )}
              </div>

              {/* Mind Map Column - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center justify-center">
                {document.metadata?.mindmaps_count > 0 ? (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full min-w-[32px]">
                    {document.metadata.mindmaps_count}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-700">—</span>
                )}
              </div>

              {/* Podcast Column - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center justify-center">
                {document.metadata?.podcasts_count > 0 ? (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full min-w-[32px]">
                    {document.metadata.podcasts_count}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-700">—</span>
                )}
              </div>

              {/* Status - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center">
                {getStatusBadge(document.processing_status || 'completed')}
              </div>

              {/* Size - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(document.file_size)}
              </div>

              {/* Modified - Desktop only */}
              <div className="hidden md:flex col-span-1 items-center text-sm text-gray-600 dark:text-gray-400">
                {formatRelativeTime(document.updated_at)}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onStar(document.id, !document.is_starred)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={document.is_starred ? "Unstar" : "Star"}
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      document.is_starred
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-400"
                    )}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setContextMenu({ documentId: document.id, x: e.clientX, y: e.clientY })
                  }}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              const doc = documents.find(d => d.id === contextMenu.documentId)
              if (doc) onSelectMode(doc.id, 'flashcards')
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FolderInput className="w-4 h-4" />
            Open
          </button>
          <button
            onClick={async () => {
              await onDelete(contextMenu.documentId)
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
