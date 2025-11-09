"use client"

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, ChevronDown, FolderPlus, MoreVertical, Pencil, Trash2, FolderIcon } from 'lucide-react'
import FolderModal from './FolderModal'

interface Folder {
  id: string
  name: string
  color: string
  icon: string
  parent_folder_id: string | null
  position: number
  documentCount: number
  children: Folder[]
  created_at: string
  updated_at: string
}

interface FolderTreeProps {
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onFolderChange?: () => void
}

export default function FolderTree({ selectedFolderId, onSelectFolder, onFolderChange }: FolderTreeProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    folderId: string
    x: number
    y: number
  } | null>(null)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [parentFolder, setParentFolder] = useState<{ id: string; name: string } | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  // Refs for click-outside detection
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders')
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  // Close context menu on click outside - with proper target checking
  useEffect(() => {
    if (!contextMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node

      // Don't close if clicking the menu itself
      if (menuRef.current?.contains(target)) {
        return
      }

      // Don't close if clicking any three-dot button
      const clickedMenuButton = Array.from(menuButtonRef.current.values()).some(
        button => button?.contains(target)
      )
      if (clickedMenuButton) {
        return
      }

      // Close menu for any other click
      setContextMenu(null)
    }

    // Use mousedown instead of click for better timing
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      folderId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleCreateSubfolder = (folderId: string, folderName: string) => {
    setParentFolder({ id: folderId, name: folderName })
    setIsFolderModalOpen(true)
    setContextMenu(null)
  }

  const handleCreateFolder = async (name: string, color: string, icon: string) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          icon,
          parentFolderId: parentFolder?.id || null,
          position: 0
        })
      })

      if (response.ok) {
        await fetchFolders()
        onFolderChange?.()

        // Auto-expand parent folder if creating subfolder
        if (parentFolder?.id) {
          setExpandedFolders(prev => new Set([...prev, parentFolder.id]))
        }
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
      throw error
    }
  }

  const handleRenameFolder = async (folderId: string) => {
    const folder = findFolderById(folders, folderId)
    if (!folder) return

    const newName = prompt('Enter new folder name:', folder.name)
    if (!newName || newName.trim() === '' || newName === folder.name) return

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })

      if (response.ok) {
        await fetchFolders()
        onFolderChange?.()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to rename folder')
      }
    } catch (error) {
      console.error('Failed to rename folder:', error)
      alert('Failed to rename folder')
    }
    setContextMenu(null)
  }

  const handleDeleteFolder = async (folderId: string) => {
    const folder = findFolderById(folders, folderId)
    if (!folder) return

    const hasDocuments = folder.documentCount > 0
    const hasSubfolders = folder.children.length > 0

    let message = `Delete folder "${folder.name}"?`
    if (hasDocuments && hasSubfolders) {
      message += `\n\nThis folder contains ${folder.documentCount} document(s) and ${folder.children.length} subfolder(s). Documents will be moved to root, and subfolders will be deleted.`
    } else if (hasDocuments) {
      message += `\n\nThis folder contains ${folder.documentCount} document(s). They will be moved to root.`
    } else if (hasSubfolders) {
      message += `\n\nThis folder contains ${folder.children.length} subfolder(s). They will also be deleted.`
    }

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchFolders()
        onFolderChange?.()

        // Deselect if deleted folder was selected
        if (selectedFolderId === folderId) {
          onSelectFolder(null)
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert('Failed to delete folder')
    }
    setContextMenu(null)
  }

  const findFolderById = (folders: Folder[], id: string): Folder | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder
      if (folder.children.length > 0) {
        const found = findFolderById(folder.children, id)
        if (found) return found
      }
    }
    return null
  }

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    const documentId = e.dataTransfer.getData('documentId')
    if (!documentId) return

    setDragOverFolderId(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })

      if (response.ok) {
        // Refresh folders to update document counts
        await fetchFolders()
        onFolderChange?.()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to move document')
      }
    } catch (error) {
      console.error('Failed to move document:', error)
      alert('Failed to move document')
    }
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(folderId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
  }

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children.length > 0
    const isDragOver = dragOverFolderId === folder.id

    return (
      <div key={folder.id}>
        {/* Folder Row */}
        <div
          className={`
            group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
            ${isDragOver ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500' : ''}
          `}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-5" /> /* Spacer for alignment */
          )}

          {/* Folder Icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-sm flex-shrink-0"
            style={{ backgroundColor: folder.color }}
          >
            {folder.icon}
          </div>

          {/* Folder Name */}
          <span className={`flex-1 text-sm truncate ${isSelected ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
            {folder.name}
          </span>

          {/* Document Count */}
          {folder.documentCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {folder.documentCount}
            </span>
          )}

          {/* Context Menu Button */}
          <button
            type="button"
            ref={(el) => {
              if (el) menuButtonRef.current.set(folder.id, el)
              else menuButtonRef.current.delete(folder.id)
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenu(e, folder.id)
            }}
            className="p-1 invisible group-hover:visible hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all cursor-pointer z-10 relative"
            title="Folder options"
          >
            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Children (Subfolders) */}
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Folders</h3>
          <button
            onClick={() => {
              setParentFolder(null)
              setIsFolderModalOpen(true)
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* All Documents (Root) */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2 mx-3 mt-3 rounded-lg cursor-pointer transition-colors
            ${selectedFolderId === null ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
            ${dragOverFolderId === 'root' ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500' : ''}
          `}
          onClick={() => onSelectFolder(null)}
          onDrop={(e) => handleDrop(e, null)}
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
        >
          <FolderIcon className={`w-5 h-5 ${selectedFolderId === null ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
          <span className={`flex-1 text-sm ${selectedFolderId === null ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
            All Documents
          </span>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {folders.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                No folders yet
              </p>
              <button
                onClick={() => {
                  setParentFolder(null)
                  setIsFolderModalOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <FolderPlus className="w-4 h-4" />
                Create Your First Folder
              </button>
            </div>
          ) : (
            folders.map(folder => renderFolder(folder))
          )}
        </div>
      </div>

      {/* Context Menu - Rendered via Portal */}
      {contextMenu && typeof window !== 'undefined' && (() => {
        return createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <button
            onClick={() => {
              const folder = findFolderById(folders, contextMenu.folderId)
              if (folder) handleCreateSubfolder(contextMenu.folderId, folder.name)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create Subfolder
          </button>
          <button
            onClick={() => handleRenameFolder(contextMenu.folderId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => handleDeleteFolder(contextMenu.folderId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>,
        document.body
        )
      })()}

      {/* Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false)
          setParentFolder(null)
        }}
        onCreateFolder={handleCreateFolder}
        parentFolderName={parentFolder?.name}
      />
    </>
  )
}
