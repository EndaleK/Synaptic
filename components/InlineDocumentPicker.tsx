"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, FileType, Loader2, Upload, ChevronRight, FolderIcon } from "lucide-react"
import { Document } from "@/lib/supabase/types"

interface Folder {
  id: string
  name: string
  color: string
  icon: string
  parent_folder_id: string | null
  documentCount: number
  children: Folder[]
}

interface InlineDocumentPickerProps {
  onDocumentSelect: (document: Document) => void
  mode: string
}

export default function InlineDocumentPicker({
  onDocumentSelect,
  mode
}: InlineDocumentPickerProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'All Documents' }
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [documentsRes, foldersRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/folders')
      ])

      if (!documentsRes.ok || !foldersRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const documentsData = await documentsRes.json()
      const foldersData = await foldersRes.json()

      setDocuments(documentsData.documents || [])
      setFolders(foldersData.folders || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('doc')) return '📝'
    if (fileType.includes('text')) return '📃'
    return '📄'
  }

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case 'flashcards': return '🎯'
      case 'chat': return '💬'
      case 'podcast': return '🎙️'
      case 'mindmap': return '🗺️'
      default: return '📚'
    }
  }

  const getModeName = (mode: string) => {
    switch (mode) {
      case 'flashcards': return 'Flashcards'
      case 'chat': return 'Chat'
      case 'podcast': return 'Podcast'
      case 'mindmap': return 'Mind Map'
      default: return mode
    }
  }

  // Find all folders at current level
  const getCurrentFolders = (): Folder[] => {
    const findFoldersInTree = (folderList: Folder[], parentId: string | null): Folder[] => {
      const result: Folder[] = []
      folderList.forEach(folder => {
        if (folder.parent_folder_id === parentId) {
          result.push(folder)
        }
        result.push(...findFoldersInTree(folder.children, parentId))
      })
      return result
    }

    if (selectedFolderId === null) {
      // Root level: show top-level folders
      return folders
    } else {
      // Inside a folder: show its children
      const findFolder = (folderList: Folder[]): Folder | null => {
        for (const folder of folderList) {
          if (folder.id === selectedFolderId) return folder
          const found = findFolder(folder.children)
          if (found) return found
        }
        return null
      }
      const currentFolder = findFolder(folders)
      return currentFolder?.children || []
    }
  }

  // Filter documents for current folder
  const currentDocuments = selectedFolderId === null
    ? documents.filter(doc => doc.folder_id === null)
    : documents.filter(doc => doc.folder_id === selectedFolderId)

  // Navigate into a folder
  const handleFolderClick = (folder: Folder) => {
    setSelectedFolderId(folder.id)
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }])
  }

  // Navigate to breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    const crumb = breadcrumbs[index]
    setSelectedFolderId(crumb.id)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2">
            Error Loading Documents
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDocuments}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const currentFolders = getCurrentFolders()
  const hasContent = currentDocuments.length > 0 || currentFolders.length > 0

  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Upload className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            No Documents Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload a document to get started with {getModeName(mode)}.
          </p>
          <button
            onClick={() => router.push('/dashboard/documents')}
            className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
          >
            Upload Document
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{getModeEmoji(mode)}</span>
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
            Select a Document
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a document to use with {getModeName(mode)}
          </p>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center gap-2">
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'bg-accent-primary/10 text-accent-primary font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {crumb.name}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {!hasContent && (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">This folder is empty</p>
          </div>
        )}

        {/* Folders and Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Folders */}
          {currentFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="group relative p-5 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-accent-primary dark:hover:border-accent-primary rounded-xl text-left transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: folder.color }}
                >
                  {folder.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-black dark:text-white truncate group-hover:text-accent-primary transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-accent-primary transition-colors" />
              </div>
            </button>
          ))}

          {/* Documents */}
          {currentDocuments.map((document) => {
            const isProcessing = document.processing_status !== 'completed'

            return (
              <button
                key={document.id}
                onClick={() => !isProcessing && onDocumentSelect(document)}
                disabled={isProcessing}
                className={`group relative p-5 border rounded-xl text-left transition-all ${
                  isProcessing
                    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-accent-primary dark:hover:border-accent-primary hover:shadow-lg cursor-pointer'
                }`}
              >
                {/* File Icon & Type */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{getFileIcon(document.file_type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black dark:text-white truncate group-hover:text-accent-primary transition-colors">
                      {document.file_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {document.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  {document.metadata?.page_count && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {document.metadata.page_count} pages
                    </span>
                  )}
                  <span>
                    {new Date(document.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Processing Badge */}
                {isProcessing && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                      Processing...
                    </span>
                  </div>
                )}

                {/* Hover Overlay */}
                {!isProcessing && (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </button>
            )
          })}
        </div>

        {/* Upload More Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard/documents')}
            className="px-4 py-2 text-sm text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors border border-accent-primary/20"
          >
            Upload More Documents
          </button>
        </div>
      </div>
    </div>
  )
}
