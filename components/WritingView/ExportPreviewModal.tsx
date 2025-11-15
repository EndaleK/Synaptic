"use client"

import { useState } from 'react'
import { X, FileText, Download, Eye, Loader2 } from 'lucide-react'
import type { Essay, CitationStyle } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface ExportPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  essay: Essay
  onExport: (format: 'pdf' | 'docx') => Promise<void>
}

export default function ExportPreviewModal({
  isOpen,
  onClose,
  essay,
  onExport
}: ExportPreviewModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  if (!isOpen) return null

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(selectedFormat)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Generate preview HTML
  const getPreviewHTML = () => {
    return `
      <div style="font-family: 'Times New Roman', serif; max-width: 8.5in; margin: 0 auto; padding: 1in; background: white;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 0.5em;">${essay.title}</h1>
        <div style="margin-bottom: 1em; color: #666; font-size: 14px;">
          <p>Word Count: ${essay.word_count} words</p>
          <p>Citation Style: ${essay.citation_style || 'APA'}</p>
        </div>
        <div style="font-size: 12pt; line-height: 2; text-align: justify;">
          ${essay.content}
        </div>
        ${essay.cited_sources.length > 0 ? `
          <div style="margin-top: 2em; page-break-before: always;">
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 0.5em;">References</h2>
            <div style="padding-left: 0.5in; text-indent: -0.5in;">
              ${essay.cited_sources.map(citation => `
                <p style="margin-bottom: 0.5em;">${formatCitation(citation, essay.citation_style || 'APA')}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  const formatCitation = (citation: any, style: CitationStyle) => {
    // Simple APA formatting (in production, use a proper citation library)
    if (style === 'APA') {
      return `${citation.authors || 'Unknown'}. (${citation.year || 'n.d.'}). <em>${citation.title}</em>. ${citation.publication || ''}`
    }
    // Add MLA, Chicago formatting as needed
    return citation.title
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Export Preview
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review before downloading
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedFormat('pdf')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border-2",
                    selectedFormat === 'pdf'
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <FileText className="w-5 h-5" />
                  PDF Document
                </button>
                <button
                  onClick={() => setSelectedFormat('docx')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border-2",
                    selectedFormat === 'docx'
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <FileText className="w-5 h-5" />
                  Word Document
                </button>
              </div>
            </div>

            {/* Preview Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Preview
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 mb-4">
                <div
                  className="bg-white shadow-lg"
                  dangerouslySetInnerHTML={{ __html: getPreviewHTML() }}
                />
              </div>
            )}

            {/* Document Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Document Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Word Count</p>
                  <p className="text-blue-900 dark:text-blue-100">{essay.word_count} words</p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Pages (est.)</p>
                  <p className="text-blue-900 dark:text-blue-100">{Math.ceil(essay.word_count / 250)} pages</p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Citations</p>
                  <p className="text-blue-900 dark:text-blue-100">{essay.cited_sources.length} sources</p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Citation Style</p>
                  <p className="text-blue-900 dark:text-blue-100">{essay.citation_style || 'APA'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export as {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
