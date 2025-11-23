"use client"

import { useState } from 'react'
import { BookOpen, Plus, Trash2, Edit2, Copy, FileText, ExternalLink, Check } from 'lucide-react'
import type { Citation, CitationStyle } from '@/lib/supabase/types'
import CitationImport from './WritingView/CitationImport'
import { useToast } from '@/components/ToastContainer'

interface CitationManagerProps {
  citations: Citation[]
  citationStyle: CitationStyle
  onAddCitation?: (citation: Omit<Citation, 'id'>) => void
  onUpdateCitation?: (citationId: string, citation: Partial<Citation>) => void
  onDeleteCitation?: (citationId: string) => void
  onGenerateFromDocument?: (documentId: string) => void
}

export default function CitationManager({
  citations,
  citationStyle,
  onAddCitation,
  onUpdateCitation,
  onDeleteCitation,
  onGenerateFromDocument
}: CitationManagerProps) {
  const toast = useToast()
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [doiInput, setDoiInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [newCitation, setNewCitation] = useState<Omit<Citation, 'id'>>({
    author: '',
    title: '',
    publication_date: '',
    publisher: '',
    url: '',
    doi: '',
    pages: '',
    access_date: ''
  })

  const formatCitation = (citation: Citation, style: CitationStyle): string => {
    // Simplified citation formatting - in production, use citation-js library
    const { author, title, publication_date, publisher, url, doi, pages } = citation

    switch (style) {
      case 'APA':
        return `${author}. (${publication_date || 'n.d.'}). ${title}${publisher ? `. ${publisher}` : ''}${doi ? `. https://doi.org/${doi}` : url ? `. ${url}` : ''}`

      case 'MLA':
        return `${author}. "${title}."${publisher ? ` ${publisher},` : ''} ${publication_date || 'n.d.'}${pages ? `, pp. ${pages}` : ''}${url ? `. ${url}` : ''}`

      case 'Chicago':
        return `${author}. "${title}."${publisher ? ` ${publisher},` : ''} ${publication_date || 'n.d.'}${doi ? `. https://doi.org/${doi}` : url ? `. ${url}` : ''}`

      case 'Harvard':
        return `${author} ${publication_date ? `(${publication_date})` : '(n.d.)'} '${title}'${publisher ? `, ${publisher}` : ''}${url ? `, available at: ${url}` : ''}`

      case 'IEEE':
        return `${author}, "${title},"${publisher ? ` ${publisher},` : ''} ${publication_date || 'n.d.'}${doi ? `, doi: ${doi}` : ''}`

      case 'Vancouver':
        return `${author}. ${title}${publisher ? `. ${publisher}` : ''}; ${publication_date || 'n.d.'}${pages ? `:${pages}` : ''}${doi ? `. doi:${doi}` : ''}`

      default:
        return `${author}. ${title}. ${publication_date || 'n.d.'}`
    }
  }

  const handleFetchMetadata = async () => {
    if (!doiInput && !urlInput) {
      toast.warning('Please enter a DOI or URL')
      return
    }

    setIsFetchingMetadata(true)

    try {
      const response = await fetch('/api/citations/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doi: doiInput || undefined,
          url: urlInput || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to fetch citation metadata')
      }

      const { citation } = await response.json()

      // Auto-fill the form with fetched data
      setNewCitation({
        author: citation.author || '',
        title: citation.title || '',
        publication_date: citation.publication_date || '',
        publisher: citation.publisher || '',
        url: citation.url || urlInput || '',
        doi: citation.doi || doiInput || '',
        pages: citation.pages || '',
        access_date: citation.access_date || new Date().toISOString().split('T')[0]
      })

      // Clear inputs
      setDoiInput('')
      setUrlInput('')

      toast.success('Citation metadata fetched successfully! Review and save.')
    } catch (error: unknown) {
      console.error('Citation fetch error:', error)
      toast.error(error.message || 'Failed to fetch citation metadata')
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const handleAddCitation = () => {
    if (!newCitation.author || !newCitation.title) {
      toast.warning('Author and Title are required')
      return
    }

    onAddCitation?.(newCitation)
    setNewCitation({
      author: '',
      title: '',
      publication_date: '',
      publisher: '',
      url: '',
      doi: '',
      pages: '',
      access_date: ''
    })
    setDoiInput('')
    setUrlInput('')
    setIsAddingNew(false)
  }

  const handleCopyCitation = (citation: Citation) => {
    const formatted = formatCitation(citation, citationStyle)
    navigator.clipboard.writeText(formatted)
    setCopiedId(citation.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyAll = () => {
    const allFormatted = citations.map(c => formatCitation(c, citationStyle)).join('\n\n')
    navigator.clipboard.writeText(allFormatted)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Citations
            </h2>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
              {citations.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {citations.length > 0 && (
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Copy all citations"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy All
              </button>
            )}
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Citation
            </button>
          </div>
        </div>

        {/* Citation Style Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Format:</span>
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium text-xs">
            {citationStyle}
          </span>
        </div>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* New Citation Form */}
        {isAddingNew && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-accent-primary/30 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">New Citation</h3>

            {/* Quick Add from DOI/ISBN */}
            <div className="mb-4">
              <CitationImport
                citationStyle={citationStyle}
                onImport={(citation) => {
                  onAddCitation?.(citation)
                  setIsAddingNew(false)
                }}
              />
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 text-center">
              Or manually enter citation details below
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author(s) *
                </label>
                <input
                  type="text"
                  value={newCitation.author}
                  onChange={(e) => setNewCitation({ ...newCitation, author: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  placeholder="Last, F. M."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newCitation.title}
                  onChange={(e) => setNewCitation({ ...newCitation, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  placeholder="Article or Book Title"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="text"
                    value={newCitation.publication_date || ''}
                    onChange={(e) => setNewCitation({ ...newCitation, publication_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={newCitation.publisher || ''}
                    onChange={(e) => setNewCitation({ ...newCitation, publisher: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    placeholder="Publisher Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={newCitation.url || ''}
                  onChange={(e) => setNewCitation({ ...newCitation, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DOI
                  </label>
                  <input
                    type="text"
                    value={newCitation.doi || ''}
                    onChange={(e) => setNewCitation({ ...newCitation, doi: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    placeholder="10.xxxx/xxxxx"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pages
                  </label>
                  <input
                    type="text"
                    value={newCitation.pages || ''}
                    onChange={(e) => setNewCitation({ ...newCitation, pages: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    placeholder="1-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleAddCitation}
                  className="flex-1 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all"
                >
                  Add Citation
                </button>
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Citations */}
        {citations.length === 0 && !isAddingNew ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              No Citations Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add citations manually or generate them from your documents
            </p>
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Your First Citation
            </button>
          </div>
        ) : (
          citations.map((citation) => (
            <div
              key={citation.id}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {citation.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {citation.author}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {citation.url && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Open URL"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </a>
                  )}
                  <button
                    onClick={() => handleCopyCitation(citation)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Copy citation"
                  >
                    {copiedId === citation.id ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteCitation?.(citation.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Delete citation"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>

              {/* Formatted Citation */}
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                  {formatCitation(citation, citationStyle)}
                </p>
              </div>

              {/* Metadata */}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {citation.publication_date && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {citation.publication_date}
                  </span>
                )}
                {citation.publisher && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    {citation.publisher}
                  </span>
                )}
                {citation.doi && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    DOI: {citation.doi}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
