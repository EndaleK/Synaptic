"use client"

import { useState } from "react"
import { ArrowUpDown, FileText, Image as ImageIcon, File, Globe, Star, MoreVertical, Trash2, FolderInput, Download } from "lucide-react"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils"

interface DocumentTableViewProps {
  documents: Document[]
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => Promise<void>
  onStar: (documentId: string, starred: boolean) => Promise<void>
  selectedDocuments: Set<string>
  onToggleSelect: (documentId: string) => void
  onSort: (field: string) => void
  sortField: string
  sortDirection: 'asc' | 'desc'
}

export default function DocumentTableView({
  documents,
  onSelectMode,
  onDelete,
  onStar,
  selectedDocuments,
  onToggleSelect,
  onSort,
  sortField,
  sortDirection
}: DocumentTableViewProps) {
  const [contextMenu, setContextMenu] = useState<{ documentId: string; x: number; y: number } | null>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
    if (fileType.includes('image')) return <ImageIcon className="w-4 h-4 text-blue-500" />
    if (fileType.includes('url') || fileType.includes('web')) return <Globe className="w-4 h-4 text-green-500" />
    return <File className="w-4 h-4 text-gray-500" />
  }

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      {label}
      <ArrowUpDown className={cn(
        "w-3 h-3",
        sortField === field ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
      )} />
    </button>
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left w-12">
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
            </th>
            <th className="px-4 py-3 text-left w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              <SortableHeader field="name" label="Name" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              <SortableHeader field="size" label="Size" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              <SortableHeader field="date" label="Modified" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Content
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {documents.map((document) => {
            const isSelected = selectedDocuments.has(document.id)

            return (
              <tr
                key={document.id}
                className={cn(
                  "group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                  isSelected && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(document.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  />
                </td>

                {/* Star */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onStar(document.id, !document.is_starred)}
                    title={document.is_starred ? "Unstar" : "Star"}
                  >
                    <Star
                      className={cn(
                        "w-4 h-4",
                        document.is_starred
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-400"
                      )}
                    />
                  </button>
                </td>

                {/* Name */}
                <td
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => onSelectMode(document.id, 'flashcards')}
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(document.file_type)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {document.file_name}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {document.file_type.split('/').pop()?.toUpperCase()}
                  </span>
                </td>

                {/* Size */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatFileSize(document.file_size)}
                </td>

                {/* Modified */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatRelativeTime(document.updated_at)}
                </td>

                {/* Content Generated */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    {document.metadata?.flashcards_count > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        ⚡ {document.metadata.flashcards_count}
                      </span>
                    )}
                    {document.metadata?.podcasts_count > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        🎧 {document.metadata.podcasts_count}
                      </span>
                    )}
                    {document.metadata?.mindmaps_count > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        📊 {document.metadata.mindmaps_count}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {document.processing_status === 'completed' && (
                    <span className="text-xs text-green-600 dark:text-green-400">✓ Ready</span>
                  )}
                  {document.processing_status === 'processing' && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">⚡ Processing</span>
                  )}
                  {document.processing_status === 'failed' && (
                    <span className="text-xs text-red-600 dark:text-red-400">✗ Failed</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContextMenu({ documentId: document.id, x: e.clientX, y: e.clientY })
                    }}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

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
            onClick={() => {
              // Download functionality can be implemented later
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
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
