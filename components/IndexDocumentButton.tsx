"use client"

import { useState } from "react"
import { Database, Loader2, CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

interface IndexDocumentButtonProps {
  documentId: string
  documentName: string
  onIndexComplete?: () => void
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "default" | "lg"
  showIcon?: boolean
}

export default function IndexDocumentButton({
  documentId,
  documentName,
  onIndexComplete,
  variant = "primary",
  size = "default",
  showIcon = true
}: IndexDocumentButtonProps) {
  const [isIndexing, setIsIndexing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'indexing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<{ chunkCount?: number; textLength?: number; collectionName?: string; alreadyIndexed?: boolean; alreadyExtracted?: boolean; method?: string } | null>(null)

  const startIndexing = async () => {
    setShowDialog(true)
    setIsIndexing(true)
    setStatus('indexing')
    setProgress(0)
    setMessage('Starting indexing...')
    setErrorMessage('')
    setResult(null)

    try {
      // Use text extraction endpoint (no ChromaDB required) for production
      // Falls back to full RAG indexing if ChromaDB is available
      const response = await fetch(`/api/documents/${documentId}/extract-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('[IndexDocumentButton] API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start indexing')
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('Failed to get response reader')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const eventData = line.substring(6)

              // Skip heartbeat messages
              if (eventData.trim() === '' || eventData === ': heartbeat') continue

              try {
                const event = JSON.parse(eventData)

                if (event.type === 'progress') {
                  setProgress(event.progress)
                  setMessage(event.message)
                  console.log(`[IndexDocumentButton] Progress: ${event.progress}% - ${event.message}`)
                } else if (event.type === 'complete') {
                  setStatus('success')
                  setProgress(100)
                  setResult(event.data)

                  if (event.data.alreadyIndexed || event.data.alreadyExtracted) {
                    setMessage('Document text already extracted!')
                  } else if (event.data.textLength) {
                    setMessage(`Successfully extracted ${Math.floor(event.data.textLength / 1000)}K characters!`)
                  } else if (event.data.chunkCount) {
                    setMessage(`Successfully indexed ${event.data.chunkCount} chunks!`)
                  }

                  setIsIndexing(false)

                  // Call completion callback
                  if (onIndexComplete) {
                    setTimeout(() => {
                      onIndexComplete()
                    }, 1000)
                  }
                } else if (event.type === 'error') {
                  setStatus('error')
                  setErrorMessage(event.error)
                  setMessage('Indexing failed')
                  setIsIndexing(false)
                }
              } catch (parseError) {
                console.error('[IndexDocumentButton] Failed to parse SSE message:', parseError, 'Data:', eventData)
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response
        const data = await response.json()
        console.log('[IndexDocumentButton] Raw API response (JSON):', data)

        if (data.error) {
          throw new Error(data.error)
        }

        // Handle success
        setStatus('success')
        setProgress(100)
        setResult(data)
        if (data.textLength) {
          setMessage(`Successfully extracted ${Math.floor(data.textLength / 1000)}K characters!`)
        } else if (data.chunkCount) {
          setMessage(`Successfully indexed ${data.chunkCount} chunks!`)
        }
        setIsIndexing(false)

        if (onIndexComplete) {
          setTimeout(() => {
            onIndexComplete()
          }, 1000)
        }
      }

    } catch (error) {
      console.error('[IndexDocumentButton] Indexing error:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start indexing')
      setMessage('Indexing failed')
      setIsIndexing(false)
    }
  }

  const handleClose = () => {
    if (!isIndexing) {
      setShowDialog(false)
      // Reset state after dialog closes
      setTimeout(() => {
        setStatus('idle')
        setProgress(0)
        setMessage('')
        setErrorMessage('')
        setResult(null)
      }, 300)
    }
  }

  // Button styles based on variant
  const buttonStyles = {
    primary: "px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:shadow-lg transition-all",
    secondary: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all",
    ghost: "px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
  }

  const sizeStyles = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg"
  }

  return (
    <>
      <button
        onClick={startIndexing}
        disabled={isIndexing}
        className={`${buttonStyles[variant]} ${sizeStyles[size]} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isIndexing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Indexing...
          </>
        ) : (
          <>
            {showIcon && <Database className="h-4 w-4" />}
            Index Document
          </>
        )}
      </button>

      {/* Modal Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={!isIndexing ? handleClose : undefined}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  {status === 'indexing' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                  {status === 'idle' && <Database className="h-5 w-5 text-gray-600" />}

                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {status === 'success' ? 'Indexing Complete' :
                     status === 'error' ? 'Indexing Failed' :
                     'Indexing Document'}
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{documentName}</p>
              </div>
              {!isIndexing && (
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress}% - {message}
              </p>
            </div>

            {/* Success Message */}
            {status === 'success' && result && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      {result.alreadyIndexed || result.alreadyExtracted ? 'Already Processed' : result.textLength ? 'Text Extracted' : 'Successfully Indexed'}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {result.alreadyIndexed || result.alreadyExtracted
                        ? 'This document has already been processed. You can now use all features!'
                        : result.textLength
                        ? `Extracted ${Math.floor(result.textLength / 1000)}K characters using ${result.method || 'AI'}. You can now use chat, flashcards, podcast, and mind map features!`
                        : `Document processed into ${result.chunkCount} searchable chunks. You can now use chat, flashcards, podcast, and mind map features!`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 dark:text-red-100">Indexing Failed</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {errorMessage}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                      Common causes:
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-400 mt-1 list-disc list-inside space-y-1">
                      <li>Gemini API key not configured in Vercel</li>
                      <li>File too large for API (try smaller file or split into chapters)</li>
                      <li>Network connection issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Indexing in Progress */}
            {status === 'indexing' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Processing Document</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This may take 1-3 minutes depending on document size. Please keep this window open.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                disabled={isIndexing}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isIndexing ? 'Please Wait...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
