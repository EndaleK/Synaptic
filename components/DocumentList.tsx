"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, FileX } from "lucide-react"
import DocumentCard from "./DocumentCard"
import { Document, PreferredMode } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

interface DocumentListProps {
  documents: Document[]
  isLoading: boolean
  onSelectMode: (documentId: string, mode: PreferredMode) => void
  onDelete: (documentId: string) => Promise<void>
  onRefresh: () => void
}

export default function DocumentList({
  documents,
  isLoading,
  onSelectMode,
  onDelete,
  onRefresh
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc =>
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.file_name.localeCompare(b.file_name)
        case 'size':
          return b.file_size - a.file_size
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your documents...</p>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileX className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
            No documents yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload your first document to get started with AI-powered learning!
          </p>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg font-medium transition-all",
            showFilters
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'name', label: 'Name' },
                  { value: 'size', label: 'Size' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value as typeof sortBy)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      sortBy === option.value
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredDocuments.length === documents.length ? (
            <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
          ) : (
            <span>
              {filteredDocuments.length} of {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          )}
        </p>
        <button
          onClick={onRefresh}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No documents match your search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onSelectMode={onSelectMode}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
