"use client"

import { useState, useEffect } from "react"
import { X, FileText, Search, Check } from "lucide-react"
import { useDocumentStore } from "@/lib/store/useStore"
import type { Document } from "@/lib/supabase/types"

interface DocumentSwitcherModalProps {
  onDocumentSwitch?: () => void
}

export default function DocumentSwitcherModal({ onDocumentSwitch }: DocumentSwitcherModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { currentDocument, setCurrentDocument, addToHistory } = useDocumentStore()

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen])

  // Filter documents based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDocuments(documents)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredDocuments(
        documents.filter((doc) =>
          doc.file_name.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, documents])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/documents?limit=100')
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await response.json()
      const completedDocs = (data.documents || []).filter(
        (doc: Document) => doc.processing_status === 'completed'
      )
      setDocuments(completedDocs)
      setFilteredDocuments(completedDocs)
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentSelect = (doc: Document) => {
    // Update current document in store
    setCurrentDocument({
      id: doc.id,
      name: doc.file_name,
      content: doc.extracted_text || "",
      fileType: doc.file_type,
      storagePath: doc.storage_path,
      sections: doc.sections,
    })

    // Add to history
    addToHistory({
      id: doc.id,
      name: doc.file_name,
    })

    // Close modal
    setIsOpen(false)
    setSearchQuery("")

    // Trigger callback for parent component to reload content
    onDocumentSwitch?.()
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery("")
  }

  // Keyboard shortcut: Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      } else if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center group"
        title="Switch Document (Cmd+K)"
      >
        <FileText className="w-6 h-6" />
        {documents.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {documents.length}
          </span>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black dark:text-white">
                  Switch Document
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No documents found" : "No documents available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => {
                    const isActive = currentDocument?.id === doc.id
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleDocumentSelect(doc)}
                        className={`w-full text-left p-4 rounded-lg transition-all ${
                          isActive
                            ? "bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500"
                            : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className={`w-4 h-4 flex-shrink-0 ${
                                isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-400"
                              }`} />
                              <h3 className={`font-semibold truncate ${
                                isActive ? "text-purple-700 dark:text-purple-300" : "text-black dark:text-white"
                              }`}>
                                {doc.file_name}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {isActive && (
                            <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Cmd+K</kbd> to open,{" "}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
