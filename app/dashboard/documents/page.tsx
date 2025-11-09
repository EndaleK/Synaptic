"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Upload, RefreshCw, Search, X } from "lucide-react"
import DocumentList from "@/components/DocumentList"
import FolderTree from "@/components/FolderTree"
import Breadcrumb, { documentsBreadcrumb } from "@/components/Breadcrumb"
import { useToast } from "@/components/ToastContainer"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { useDocumentStore, useUIStore } from "@/lib/store/useStore"

// Use new simplified uploader (no chunking, direct Supabase upload)
const SimpleDocumentUploader = dynamic(() => import("@/components/SimpleDocumentUploader"), {
  ssr: false,
})

export default function DocumentsPage() {
  const router = useRouter()
  const toast = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { setCurrentDocument } = useDocumentStore()
  const { setActiveMode } = useUIStore()

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/documents')

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
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

  // Auto-refresh polling for documents with "processing" status
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.processing_status === 'processing')

    if (hasProcessing) {
      console.log('📊 Auto-refresh enabled: Found documents with "processing" status')
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing documents (processing status detected)...')
        fetchDocuments()
      }, 3000) // Poll every 3 seconds

      return () => {
        console.log('⏹️ Auto-refresh stopped')
        clearInterval(interval)
      }
    }
  }, [documents, fetchDocuments])

  const handleSelectMode = async (documentId: string, mode: PreferredMode) => {
    try {
      // Find the document
      const document = documents.find(doc => doc.id === documentId)

      if (!document) {
        throw new Error('Document not found')
      }

      if (document.processing_status !== 'completed') {
        toast.warning('This document is still processing. Please wait.')
        return
      }

      // Update global document store
      setCurrentDocument({
        id: document.id,
        name: document.file_name,
        content: document.extracted_text || '',
        fileType: document.file_type,
        storagePath: document.storage_path
      })

      // Set the active mode
      setActiveMode(mode)

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Error selecting document:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to open document')
    }
  }

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      toast.success('Document deleted successfully')
    } catch (err) {
      console.error('Error deleting document:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete document')
      throw err
    }
  }

  const handleUploadClick = () => {
    setIsUploadModalOpen(true)
  }

  const handleUploadSuccess = () => {
    // Refresh the documents list after successful upload
    fetchDocuments()
    toast.success('Document uploaded successfully')
  }

  // Filter documents based on selected folder and search query
  const filteredDocuments = documents.filter(doc => {
    // Filter by folder
    const folderMatch = selectedFolderId === null
      ? doc.folder_id === null
      : doc.folder_id === selectedFolderId

    // Filter by search query
    const searchMatch = searchQuery.trim() === '' ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())

    return folderMatch && searchMatch
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={documentsBreadcrumb} className="mb-6" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary mb-2">
              My Documents
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and access your uploaded documents
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchDocuments}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary/10 dark:bg-accent-primary/20 text-accent-primary rounded-lg font-medium hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 transition-all disabled:opacity-50 border border-accent-primary/30 dark:border-accent-primary/50"
              title="Refresh documents"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:shadow-xl transition-all shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Document
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'} matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Two-column layout: Folder sidebar + Document list */}
        <div className="flex gap-6">
          {/* Left Sidebar - Folder Tree */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <FolderTree
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onFolderChange={fetchDocuments}
              />
            </div>
          </div>

          {/* Right Content - Document List */}
          <div className="flex-1 min-w-0">
            <DocumentList
              documents={filteredDocuments}
              isLoading={isLoading}
              onSelectMode={handleSelectMode}
              onDelete={handleDelete}
              onRefresh={fetchDocuments}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal - Using new simple uploader (no chunking) */}
      <SimpleDocumentUploader
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
