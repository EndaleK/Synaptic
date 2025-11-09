"use client"

import { useState } from 'react'
import { X, Loader2, FolderPlus } from 'lucide-react'

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolder: (name: string, color: string, icon: string) => Promise<void>
  parentFolderName?: string
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gray', value: '#6B7280' }
]

const FOLDER_ICONS = ['📁', '📂', '📚', '📖', '📝', '🗂️', '📋', '🎯', '⭐', '💼', '🎓', '🔬', '💡', '🎨', '🎵']

export default function FolderModal({ isOpen, onClose, onCreateFolder, parentFolderName }: FolderModalProps) {
  const [folderName, setFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#3B82F6')
  const [selectedIcon, setSelectedIcon] = useState('📁')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!folderName.trim()) {
      setError('Folder name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await onCreateFolder(folderName.trim(), selectedColor, selectedIcon)

      // Reset form
      setFolderName('')
      setSelectedColor('#3B82F6')
      setSelectedIcon('📁')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setFolderName('')
      setSelectedColor('#3B82F6')
      setSelectedIcon('📁')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Folder
              </h2>
              {parentFolderName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  in {parentFolderName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Folder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Biology 101"
              maxLength={100}
              disabled={isCreating}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Folder Color
            </label>
            <div className="grid grid-cols-9 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isCreating}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100 scale-110'
                      : 'hover:scale-105'
                  } disabled:opacity-50`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Folder Icon
            </label>
            <div className="grid grid-cols-10 gap-2">
              {FOLDER_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  disabled={isCreating}
                  className={`w-8 h-8 text-2xl flex items-center justify-center rounded-lg transition-all ${
                    selectedIcon === icon
                      ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-110'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
                  } disabled:opacity-50`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: selectedColor }}
              >
                {selectedIcon}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {folderName || 'Folder Name'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !folderName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
