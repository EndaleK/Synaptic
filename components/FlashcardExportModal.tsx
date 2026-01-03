'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Download,
  FileText,
  Table,
  Package,
  Loader2,
  CheckCircle,
  Info,
  ChevronDown,
  FileImage,
  Grid3X3,
  List,
  Scissors
} from 'lucide-react'

interface ExportFormat {
  id: string
  name: string
  description: string
  extension: string
}

interface DocumentOption {
  id: string
  name: string
  flashcardCount: number
}

interface ExportOptions {
  totalFlashcards: number
  documents: DocumentOption[]
  formats: ExportFormat[]
}

interface FlashcardExportModalProps {
  isOpen: boolean
  onClose: () => void
  documentId?: string
  documentName?: string
}

export default function FlashcardExportModal({
  isOpen,
  onClose,
  documentId: initialDocumentId,
  documentName: initialDocumentName
}: FlashcardExportModalProps) {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<ExportOptions | null>(null)

  // Export settings
  const [selectedFormat, setSelectedFormat] = useState<string>('anki-text')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(initialDocumentId || 'all')
  const [deckName, setDeckName] = useState(initialDocumentName || 'Synaptic Export')
  const [includeReversed, setIncludeReversed] = useState(false)
  const [includeTags, setIncludeTags] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  // PDF-specific options
  const [pdfLayout, setPdfLayout] = useState<'grid' | 'list' | 'printable'>('grid')
  const [includeAnswers, setIncludeAnswers] = useState(true)

  // Fetch export options
  useEffect(() => {
    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  // Update deck name when document selection changes
  useEffect(() => {
    if (selectedDocumentId !== 'all' && options) {
      const doc = options.documents.find(d => d.id === selectedDocumentId)
      if (doc) {
        setDeckName(doc.name.replace(/\.[^/.]+$/, ''))
      }
    } else if (selectedDocumentId === 'all') {
      setDeckName('Synaptic Export')
    }
  }, [selectedDocumentId, options])

  const fetchOptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/flashcards/export')
      if (!response.ok) throw new Error('Failed to fetch export options')

      const data = await response.json()
      setOptions(data)

      // Set initial document if provided
      if (initialDocumentId) {
        setSelectedDocumentId(initialDocumentId)
      }
    } catch (err) {
      console.error('Error fetching export options:', err)
      setError('Failed to load export options')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/flashcards/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          documentId: selectedDocumentId !== 'all' ? selectedDocumentId : undefined,
          deckName,
          includeReversed,
          includeTags,
          // PDF-specific options
          ...(selectedFormat === 'pdf' && {
            pdfLayout,
            includeAnswers
          })
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Export failed')
      }

      // Get filename from header
      const formatExtensions: Record<string, string> = {
        'anki-text': 'txt',
        'csv': 'csv',
        'apkg': 'apkg',
        'pdf': 'pdf'
      }
      const filename = response.headers.get('X-Filename') || `flashcards.${formatExtensions[selectedFormat] || 'txt'}`

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const getFormatIcon = (formatId: string) => {
    switch (formatId) {
      case 'anki-text':
        return <FileText className="w-5 h-5" />
      case 'csv':
        return <Table className="w-5 h-5" />
      case 'pdf':
        return <FileImage className="w-5 h-5" />
      case 'apkg':
        return <Package className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getFlashcardCount = () => {
    if (!options) return 0
    if (selectedDocumentId === 'all') return options.totalFlashcards
    const doc = options.documents.find(d => d.id === selectedDocumentId)
    return doc?.flashcardCount || 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export Flashcards
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download for Anki or other apps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : error && !options ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchOptions}
                className="mt-4 px-4 py-2 text-sm text-blue-500 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Flashcards
                </label>
                <select
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="all">
                    All Flashcards ({options?.totalFlashcards || 0})
                  </option>
                  {options?.documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.flashcardCount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {options?.formats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`mb-2 ${selectedFormat === format.id ? 'text-blue-500' : 'text-gray-400'}`}>
                        {getFormatIcon(format.id)}
                      </div>
                      <p className={`text-sm font-medium ${selectedFormat === format.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {format.name.split(' ')[0]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format.extension}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF Layout Options */}
              {selectedFormat === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PDF Layout
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPdfLayout('grid')}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        pdfLayout === 'grid'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Grid3X3 className={`w-5 h-5 mx-auto mb-1 ${pdfLayout === 'grid' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${pdfLayout === 'grid' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        Grid
                      </p>
                      <p className="text-xs text-gray-500">2x3 cards</p>
                    </button>
                    <button
                      onClick={() => setPdfLayout('list')}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        pdfLayout === 'list'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <List className={`w-5 h-5 mx-auto mb-1 ${pdfLayout === 'list' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${pdfLayout === 'list' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        List
                      </p>
                      <p className="text-xs text-gray-500">Q&A format</p>
                    </button>
                    <button
                      onClick={() => setPdfLayout('printable')}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        pdfLayout === 'printable'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Scissors className={`w-5 h-5 mx-auto mb-1 ${pdfLayout === 'printable' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${pdfLayout === 'printable' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        Printable
                      </p>
                      <p className="text-xs text-gray-500">Cut & fold</p>
                    </button>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={includeAnswers}
                      onChange={(e) => setIncludeAnswers(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include answers
                    </span>
                  </label>
                </div>
              )}

              {/* Deck Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deck Name
                </label>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter deck name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced Options
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-3 pl-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTags}
                        onChange={(e) => setIncludeTags(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include tags
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeReversed}
                        onChange={(e) => setIncludeReversed(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include reversed cards (Back → Front)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Info Note */}
              {selectedFormat === 'apkg' && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    The .apkg format is experimental. For best results, use the Anki Text format and import it into Anki.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getFlashcardCount()} cards to export
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={exporting || success || getFlashcardCount() === 0}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                success
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
