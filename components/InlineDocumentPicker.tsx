"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Image as ImageIcon, File, Globe, Loader2, Upload, ChevronRight, FolderIcon, LayoutGrid, List as ListIcon, ArrowUpDown, Star } from "lucide-react"
import { Document } from "@/lib/supabase/types"
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils"

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

type ViewMode = 'grid' | 'list' | 'table'
type SortField = 'name' | 'date' | 'size'
type SortDirection = 'asc' | 'desc'

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
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [documentsRes, foldersRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/folders').catch(() => null)
      ])

      if (!documentsRes.ok) {
        throw new Error('Failed to fetch documents')
      }

      const documentsData = await documentsRes.json()

      let foldersData = { folders: [] }
      if (foldersRes && foldersRes.ok) {
        foldersData = await foldersRes.json()
      }

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
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />
    if (fileType.includes('url') || fileType.includes('web')) return <Globe className="w-5 h-5 text-green-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case 'flashcards': return '⚡'
      case 'chat': return '💬'
      case 'podcast': return '🎧'
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

  const getCurrentFolders = (): Folder[] => {
    if (selectedFolderId === null) {
      return folders
    } else {
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

  // Sort documents
  const sortDocuments = (docs: Document[]) => {
    return [...docs].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.file_name.localeCompare(b.file_name)
          break
        case 'date':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        case 'size':
          comparison = a.file_size - b.file_size
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const currentDocuments = sortDocuments(
    selectedFolderId === null
      ? documents.filter(doc => doc.folder_id === null)
      : documents.filter(doc => doc.folder_id === selectedFolderId)
  )

  const handleFolderClick = (folder: Folder) => {
    setSelectedFolderId(folder.id)
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }])
  }

  const handleBreadcrumbClick = (index: number) => {
    const crumb = breadcrumbs[index]
    setSelectedFolderId(crumb.id)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
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
            onClick={fetchData}
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

  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
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
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center">
              <span className="text-2xl">{getModeEmoji(mode)}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
                Select a Document
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Choose a document to use with {getModeName(mode)}
              </p>
            </div>

            {/* View Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'table'
                    ? "bg-white dark:bg-gray-700 text-accent-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Table view"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid'
                    ? "bg-white dark:bg-gray-700 text-accent-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
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

        {/* Folders Section (Always Grid) */}
        {currentFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              Folders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className="group relative p-4 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-accent-primary dark:hover:border-accent-primary rounded-xl text-left transition-all hover:shadow-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: folder.color }}
                    >
                      {folder.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white truncate group-hover:text-accent-primary transition-colors">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-accent-primary transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {currentDocuments.length > 0 && (
          <>
            {currentFolders.length > 0 && (
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                Documents
              </h3>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
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
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {currentDocuments.map((document) => {
                      const isProcessing = document.processing_status !== 'completed'

                      return (
                        <tr
                          key={document.id}
                          onClick={() => !isProcessing && onDocumentSelect(document)}
                          className={cn(
                            "group transition-colors",
                            isProcessing
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(document.file_type)}
                              <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {document.file_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                              {document.file_type.split('/').pop()?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {formatFileSize(document.file_size)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {formatRelativeTime(document.updated_at)}
                          </td>
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getFileIcon(document.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-black dark:text-white truncate group-hover:text-accent-primary transition-colors">
                            {document.file_name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {document.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        {document.metadata?.page_count && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {document.metadata.page_count} pages
                          </span>
                        )}
                        <span>
                          {formatRelativeTime(document.updated_at)}
                        </span>
                      </div>

                      {isProcessing && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                            Processing...
                          </span>
                        </div>
                      )}

                      {!isProcessing && (
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

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
