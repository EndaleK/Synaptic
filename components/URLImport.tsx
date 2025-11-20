"use client"

import { useState } from "react"
import { Globe, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { detectContentType, getSourceName } from "@/lib/importers/detector"

interface URLImportProps {
  onImportComplete: () => void
}

export default function URLImport({ onImportComplete }: URLImportProps) {
  const [url, setUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<string | null>(null)

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    setError(null)

    if (newUrl.trim()) {
      const detected = detectContentType(newUrl)
      if (detected.type === 'unsupported') {
        setDetectedType(null)
        setError('This URL type is not supported')
      } else {
        setDetectedType(getSourceName(detected.type))
      }
    } else {
      setDetectedType(null)
    }
  }

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    const detected = detectContentType(url)
    if (detected.type === 'unsupported') {
      setError('This URL type is not supported. Supported types: arXiv, Web pages, Medium, YouTube')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import from URL')
      }

      // Success
      setUrl('')
      setDetectedType(null)
      onImportComplete()
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import from URL')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Import from URL
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Import content directly from the internet
          </p>
        </div>
      </div>

      {/* Supported Types */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-600 dark:text-purple-400">📚</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>arXiv:</strong> Scientific papers & research
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-600 dark:text-purple-400">🌐</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Web:</strong> Medium, blogs, articles
            </span>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Enter URL
        </label>
        <div className="relative">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isImporting && handleImport()}
            placeholder="https://arxiv.org/abs/2301.00000"
            className="w-full px-4 py-3 pr-10 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isImporting}
          />
          {detectedType && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>

        {/* Detected Type Badge */}
        {detectedType && (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md font-medium">
              ✓ Detected: {detectedType}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={isImporting || !url.trim() || !detectedType}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {isImporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Importing...</span>
          </>
        ) : (
          <>
            <Globe className="w-5 h-5" />
            <span>Import from URL</span>
          </>
        )}
      </button>

      {/* Examples */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Examples:
        </p>
        <div className="space-y-1">
          <button
            onClick={() => handleUrlChange('https://arxiv.org/abs/2301.00000')}
            className="block w-full text-left px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
            disabled={isImporting}
          >
            https://arxiv.org/abs/2301.00000
          </button>
          <button
            onClick={() => handleUrlChange('https://medium.com/@example/article')}
            className="block w-full text-left px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
            disabled={isImporting}
          >
            https://medium.com/@example/article
          </button>
        </div>
      </div>
    </div>
  )
}
