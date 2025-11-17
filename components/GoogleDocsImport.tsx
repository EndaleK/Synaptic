"use client"

import { useState } from "react"
import { FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react"

interface GoogleDocsImportProps {
  onImportComplete?: (documentId: string) => void
}

export default function GoogleDocsImport({ onImportComplete }: GoogleDocsImportProps) {
  const [googleDocsUrl, setGoogleDocsUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    setError("")

    try {
      const response = await fetch('/api/google/auth?returnTo=/dashboard')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Google')
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google')
      setIsConnecting(false)
    }
  }

  const handleImport = async () => {
    if (!googleDocsUrl.trim()) {
      setError("Please enter a Google Docs URL")
      return
    }

    setIsImporting(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/google/docs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleDocsUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's an auth error
        if (response.status === 403) {
          setIsConnected(false)
        }
        throw new Error(data.error || 'Failed to import document')
      }

      setSuccess(`Successfully imported: ${data.document.title}`)
      setGoogleDocsUrl("")

      if (onImportComplete && data.document.id) {
        onImportComplete(data.document.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import document')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="#4285F4"/>
            <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 13h8M8 17h8M8 9h2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Import from Google Docs
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your Google account to import documents
          </p>
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={handleConnectGoogle}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all font-semibold text-gray-700 dark:text-gray-300"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Account
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={googleDocsUrl}
              onChange={(e) => setGoogleDocsUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isImporting}
            />
            <button
              onClick={handleImport}
              disabled={isImporting || !googleDocsUrl.trim()}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste the URL of a Google Doc you have access to
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Success!</p>
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}
    </div>
  )
}
