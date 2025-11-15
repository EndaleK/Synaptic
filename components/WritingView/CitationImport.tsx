"use client"

import { useState } from 'react'
import { Search, Loader2, BookOpen, Link2, Hash, CheckCircle } from 'lucide-react'
import type { Citation, CitationStyle } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface CitationImportProps {
  citationStyle: CitationStyle
  onImport: (citation: Omit<Citation, 'id'>) => void
  className?: string
}

export default function CitationImport({
  citationStyle,
  onImport,
  className
}: CitationImportProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [importType, setImportType] = useState<'doi' | 'isbn'>('doi')

  const fetchCitationData = async () => {
    if (!query.trim()) {
      setError('Please enter a DOI or ISBN')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let citationData: any = null

      if (importType === 'doi') {
        // Fetch from CrossRef API
        const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error('DOI not found')

        const data = await response.json()
        const work = data.message

        citationData = {
          type: work.type === 'journal-article' ? 'journal' : 'book',
          title: work.title?.[0] || 'Unknown Title',
          authors: work.author
            ?.map((a: any) => `${a.given} ${a.family}`)
            .join(', ') || 'Unknown Author',
          publication: work['container-title']?.[0] || '',
          year: work.published?.['date-parts']?.[0]?.[0]?.toString() || '',
          doi: work.DOI || query,
          url: work.URL || `https://doi.org/${work.DOI}`,
          pages: work.page || '',
          volume: work.volume || '',
          issue: work.issue || ''
        }
      } else {
        // Fetch from Open Library API
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${query}&format=json&jscmd=data`)
        if (!response.ok) throw new Error('ISBN not found')

        const data = await response.json()
        const bookData = data[`ISBN:${query}`]

        if (!bookData) throw new Error('Book not found')

        citationData = {
          type: 'book',
          title: bookData.title || 'Unknown Title',
          authors: bookData.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author',
          publication: bookData.publishers?.[0]?.name || '',
          year: bookData.publish_date || '',
          isbn: query,
          url: bookData.url || '',
          pages: bookData.number_of_pages?.toString() || ''
        }
      }

      setResult(citationData)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch citation data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = () => {
    if (result) {
      onImport({
        ...result,
        formatted: formatCitation(result)
      })
      setQuery('')
      setResult(null)
    }
  }

  const formatCitation = (data: any): string => {
    // Basic APA formatting (in production, use a proper citation library)
    if (citationStyle === 'APA') {
      if (data.type === 'journal') {
        return `${data.authors}. (${data.year}). ${data.title}. *${data.publication}*, *${data.volume}*(${data.issue}), ${data.pages}. https://doi.org/${data.doi}`
      } else {
        return `${data.authors}. (${data.year}). *${data.title}*. ${data.publication}.`
      }
    }
    // Add MLA, Chicago formatting as needed
    return `${data.authors}. "${data.title}." ${data.publication} (${data.year}).`
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Import Type Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setImportType('doi')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border-2",
            importType === 'doi'
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
          )}
        >
          <Link2 className="w-4 h-4" />
          DOI
        </button>
        <button
          onClick={() => setImportType('isbn')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border-2",
            importType === 'isbn'
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
          )}
        >
          <Hash className="w-4 h-4" />
          ISBN
        </button>
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchCitationData()}
          placeholder={importType === 'doi' ? 'Enter DOI (e.g., 10.1234/example)' : 'Enter ISBN (e.g., 9780123456789)'}
          className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={fetchCitationData}
          disabled={isLoading || !query.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.title}
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {result.authors}
                </p>
                {result.publication && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {result.publication} ({result.year})
                  </p>
                )}
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-200 dark:border-green-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Formatted Citation ({citationStyle}):
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {result.formatted}
            </p>
          </div>

          <button
            onClick={handleImport}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Add to References
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Tip:</strong> Enter a DOI (Digital Object Identifier) for academic papers or an ISBN for books. We'll automatically fetch the citation information and format it according to your chosen citation style.
        </p>
      </div>
    </div>
  )
}
