"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Upload, RefreshCw, PanelLeftClose, PanelLeft } from "lucide-react"
import DocumentList from "@/components/DocumentList"
import DocumentListView from "@/components/DocumentListView"
import DocumentTableView from "@/components/DocumentTableView"
import FolderTree from "@/components/FolderTree"
import QuickAccess from "@/components/QuickAccess"
import ViewToggle, { ViewMode } from "@/components/ViewToggle"
import BulkOperationsToolbar from "@/components/BulkOperationsToolbar"
import AdvancedFilters, { FilterOptions } from "@/components/AdvancedFilters"
import KeyboardShortcutsHandler from "@/components/KeyboardShortcutsHandler"
import Breadcrumb, { documentsBreadcrumb } from "@/components/Breadcrumb"
import { useToast } from "@/components/ToastContainer"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { useDocumentStore, useUIStore } from "@/lib/store/useStore"
import GoogleDocsImport from "@/components/GoogleDocsImport"
import { cn } from "@/lib/utils"

// Use new simplified uploader (no chunking, direct Supabase upload)
const SimpleDocumentUploader = dynamic(() => import("@/components/SimpleDocumentUploader"), {
  ssr: false,
})

const DEFAULT_FILTERS: FilterOptions = {
  fileTypes: [],
  statuses: [],
  sizeRange: 'all',
  dateRange: 'all',
  hasContent: {
    flashcards: false,
    podcasts: false,
    mindmaps: false
  }
}

function DocumentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  // State
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [quickAccessSection, setQuickAccessSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { setCurrentDocument } = useDocumentStore()
  const { setActiveMode } = useUIStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/documents')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch documents (${response.status})`)
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Selective polling for processing documents
  useEffect(() => {
    const processingDocs = documents.filter(doc => doc.processing_status === 'processing')
    if (processingDocs.length === 0) return

    const interval = setInterval(async () => {
      try {
        const updates = await Promise.all(
          processingDocs.map(async (doc) => {
            const response = await fetch(`/api/documents/${doc.id}`)
            if (!response.ok) return null
            return response.json()
          })
        )

        setDocuments(prevDocs => {
          const newDocs = [...prevDocs]
          updates.forEach((updatedDoc) => {
            if (!updatedDoc) return
            const index = newDocs.findIndex(d => d.id === updatedDoc.id)
            if (index !== -1 && newDocs[index].processing_status !== updatedDoc.processing_status) {
              newDocs[index] = updatedDoc
            }
          })
          return newDocs
        })
      } catch (error) {
        console.error('Error polling documents:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [documents])

  // Handle document selection
  const handleSelectMode = async (documentId: string, mode: PreferredMode) => {
    try {
      const document = documents.find(doc => doc.id === documentId)
      if (!document) throw new Error('Document not found')

      if (document.processing_status !== 'completed') {
        toast.warning('This document is still processing. Please wait.')
        return
      }

      // Update last accessed
      await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_accessed_at: new Date().toISOString() })
      })

      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path,
        fileSize: document.file_size,
        metadata: document.metadata
      })

      setActiveMode(mode)
      router.push('/dashboard')
    } catch (err) {
      console.error('Error selecting document:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to open document')
    }
  }

  // Handle document deletion
  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete document')

      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      setSelectedDocuments(prev => {
        const next = new Set(prev)
        next.delete(documentId)
        return next
      })
      toast.success('Document deleted successfully')
    } catch (err) {
      console.error('Error deleting document:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete document')
      throw err
    }
  }

  // Handle star/unstar
  const handleStar = async (documentId: string, starred: boolean) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/star`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: starred })
      })

      if (!response.ok) throw new Error('Failed to update document')

      // Update local state
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, is_starred: starred } : doc
      ))

      toast.success(starred ? 'Document starred' : 'Document unstarred')
    } catch (err) {
      console.error('Error starring document:', err)
      toast.error('Failed to update document')
    }
  }

  // Handle document selection toggle
  const handleToggleSelect = (documentId: string) => {
    setSelectedDocuments(prev => {
      const next = new Set(prev)
      if (next.has(documentId)) {
        next.delete(documentId)
      } else {
        next.add(documentId)
      }
      return next
    })
  }

  // Handle bulk operations
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedDocuments.size} documents?`)) return

    try {
      await Promise.all(
        Array.from(selectedDocuments).map(id => handleDelete(id))
      )
      setSelectedDocuments(new Set())
    } catch (err) {
      toast.error('Failed to delete some documents')
    }
  }

  const handleBulkStar = async () => {
    try {
      await Promise.all(
        Array.from(selectedDocuments).map(id => handleStar(id, true))
      )
      toast.success(`Starred ${selectedDocuments.size} documents`)
    } catch (err) {
      toast.error('Failed to star some documents')
    }
  }

  const handleBulkMove = () => {
    toast.info('Move feature coming soon!')
  }

  const handleBulkExport = () => {
    toast.info('Export feature coming soon!')
  }

  // Filter documents
  const getFilteredDocuments = () => {
    let filtered = documents

    // Quick access filtering
    if (quickAccessSection === 'starred') {
      filtered = filtered.filter(doc => doc.is_starred)
    } else if (quickAccessSection === 'recent') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      filtered = filtered.filter(doc =>
        new Date(doc.last_accessed_at || doc.updated_at) > sevenDaysAgo
      )
    } else if (quickAccessSection === 'trash') {
      filtered = filtered.filter(doc => doc.is_deleted)
    } else {
      // All documents (exclude trash)
      filtered = filtered.filter(doc => !doc.is_deleted)
    }

    // Folder filtering
    if (selectedFolderId) {
      filtered = filtered.filter(doc => doc.folder_id === selectedFolderId)
    } else if (quickAccessSection === null) {
      filtered = filtered.filter(doc => doc.folder_id === null)
    }

    // Advanced filters
    if (filters.fileTypes.length > 0) {
      filtered = filtered.filter(doc =>
        filters.fileTypes.some(type => doc.file_type.toLowerCase().includes(type))
      )
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter(doc =>
        filters.statuses.includes(doc.processing_status || 'completed')
      )
    }

    if (filters.sizeRange !== 'all') {
      filtered = filtered.filter(doc => {
        const sizeMB = doc.file_size / (1024 * 1024)
        if (filters.sizeRange === 'small') return sizeMB < 1
        if (filters.sizeRange === 'medium') return sizeMB >= 1 && sizeMB <= 10
        if (filters.sizeRange === 'large') return sizeMB > 10
        return true
      })
    }

    if (filters.dateRange !== 'all') {
      const now = new Date()
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.updated_at)
        if (filters.dateRange === 'today') {
          return docDate.toDateString() === now.toDateString()
        }
        if (filters.dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return docDate > weekAgo
        }
        if (filters.dateRange === 'month') {
          return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear()
        }
        if (filters.dateRange === 'year') {
          return docDate.getFullYear() === now.getFullYear()
        }
        return true
      })
    }

    if (filters.hasContent.flashcards) {
      filtered = filtered.filter(doc => (doc.metadata?.flashcards_count || 0) > 0)
    }
    if (filters.hasContent.podcasts) {
      filtered = filtered.filter(doc => (doc.metadata?.podcasts_count || 0) > 0)
    }
    if (filters.hasContent.mindmaps) {
      filtered = filtered.filter(doc => (doc.metadata?.mindmaps_count || 0) > 0)
    }

    return filtered
  }

  // Sorting
  const getSortedDocuments = (docs: Document[]) => {
    return [...docs].sort((a, b) => {
      let comparison = 0

      if (sortField === 'name') {
        comparison = a.file_name.localeCompare(b.file_name)
      } else if (sortField === 'size') {
        comparison = a.file_size - b.file_size
      } else if (sortField === 'date') {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const filteredDocuments = getFilteredDocuments()
  const sortedDocuments = getSortedDocuments(filteredDocuments)

  // Calculate counts for Quick Access
  const quickAccessCounts = {
    starred: documents.filter(d => d.is_starred && !d.is_deleted).length,
    recent: documents.filter(d => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return new Date(d.last_accessed_at || d.updated_at) > sevenDaysAgo && !d.is_deleted
    }).length,
    trash: documents.filter(d => d.is_deleted).length
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcutsHandler
        onUpload={() => setIsUploadModalOpen(true)}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        onToggleView={setViewMode}
        onQuickSearch={() => searchInputRef.current?.focus()}
      />

      <div className="max-w-[1800px] mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={documentsBreadcrumb} className="mb-6" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={isSidebarCollapsed ? "Show sidebar (Cmd+B)" : "Hide sidebar (Cmd+B)"}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
                My Documents
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {sortedDocuments.length} {sortedDocuments.length === 1 ? 'document' : 'documents'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

            <button
              onClick={fetchDocuments}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary/10 dark:bg-accent-primary/20 text-accent-primary rounded-lg font-medium hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsGoogleDocsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="#4285F4"/>
                <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 13h8M8 17h8M8 9h2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="hidden sm:inline">Google Docs</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:shadow-xl transition-all shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Upload
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mb-6">
            <AdvancedFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar */}
          {!isSidebarCollapsed && (
            <div className={cn(
              "flex-shrink-0 transition-all duration-300",
              isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[320px]"
            )}>
              <div className="sticky top-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <QuickAccess
                  selectedSection={quickAccessSection}
                  onSelectSection={(section) => {
                    setQuickAccessSection(section)
                    setSelectedFolderId(null)
                  }}
                  counts={quickAccessCounts}
                />
                <FolderTree
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={(folderId) => {
                    setSelectedFolderId(folderId)
                    setQuickAccessSection(null)
                  }}
                  onFolderChange={fetchDocuments}
                />
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="flex-1 min-w-0">
            {viewMode === 'grid' && (
              <DocumentList
                documents={sortedDocuments}
                isLoading={isLoading}
                onSelectMode={handleSelectMode}
                onDelete={handleDelete}
                onRefresh={fetchDocuments}
                onUpload={() => setIsUploadModalOpen(true)}
                onStar={handleStar}
                selectedDocuments={selectedDocuments}
                onToggleSelect={handleToggleSelect}
              />
            )}

            {viewMode === 'list' && (
              <DocumentListView
                documents={sortedDocuments}
                onSelectMode={handleSelectMode}
                onDelete={handleDelete}
                onStar={handleStar}
                selectedDocuments={selectedDocuments}
                onToggleSelect={handleToggleSelect}
              />
            )}

            {viewMode === 'table' && (
              <DocumentTableView
                documents={sortedDocuments}
                onSelectMode={handleSelectMode}
                onDelete={handleDelete}
                onStar={handleStar}
                selectedDocuments={selectedDocuments}
                onToggleSelect={handleToggleSelect}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedCount={selectedDocuments.size}
        onClear={() => setSelectedDocuments(new Set())}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onStar={handleBulkStar}
        onExport={handleBulkExport}
      />

      {/* Upload Modal */}
      <SimpleDocumentUploader
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchDocuments()
          toast.success('Document uploaded successfully')
        }}
      />

      {/* Google Docs Import Modal */}
      {isGoogleDocsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsGoogleDocsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <GoogleDocsImport
              onImportComplete={() => {
                toast.success('Google Doc imported successfully!')
                setIsGoogleDocsModalOpen(false)
                fetchDocuments()
              }}
            />
            <button
              onClick={() => setIsGoogleDocsModalOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Wrap in Suspense for Next.js 15 compatibility
export default function DocumentsPageNew() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
        </div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  )
}
