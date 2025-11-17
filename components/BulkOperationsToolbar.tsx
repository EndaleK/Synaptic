"use client"

import { X, Trash2, FolderInput, Star, Download } from "lucide-react"

interface BulkOperationsToolbarProps {
  selectedCount: number
  onClear: () => void
  onDelete: () => Promise<void>
  onMove: () => void
  onStar: () => Promise<void>
  onExport: () => void
}

export default function BulkOperationsToolbar({
  selectedCount,
  onClear,
  onDelete,
  onMove,
  onStar,
  onExport
}: BulkOperationsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400 rounded-xl shadow-2xl px-6 py-4 animate-slideUp">
      <div className="flex items-center gap-4">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {selectedCount} selected
          </span>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMove}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Move to folder"
          >
            <FolderInput className="w-4 h-4" />
            <span className="hidden sm:inline">Move</span>
          </button>

          <button
            onClick={onStar}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Star all"
          >
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Star</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete selected"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Clear Selection */}
        <button
          onClick={onClear}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )
}
