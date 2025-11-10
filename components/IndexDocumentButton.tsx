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
  const [result, setResult] = useState<{ chunkCount?: number; collectionName?: string; alreadyIndexed?: boolean } | null>(null)

  const startIndexing = async () => {
    setShowDialog(true)
    setIsIndexing(true)
    setStatus('indexing')
    setProgress(0)
    setMessage('Starting indexing...')
    setErrorMessage('')
    setResult(null)

    try {
      const eventSource = new EventSource(`/api/documents/${documentId}/index`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'progress') {
            setProgress(data.progress)
            setMessage(data.message)
          } else if (data.type === 'complete') {
            setStatus('success')
            setProgress(100)
            setResult(data.data)

            if (data.data.alreadyIndexed) {
              setMessage('Document was already indexed!')
            } else {
              setMessage(`Successfully indexed ${data.data.chunkCount} chunks!`)
            }

            eventSource.close()
            setIsIndexing(false)

            // Call completion callback
            if (onIndexComplete) {
              setTimeout(() => {
                onIndexComplete()
              }, 1000)
            }
          } else if (data.type === 'error') {
            setStatus('error')
            setErrorMessage(data.error)
            setMessage('Indexing failed')
            eventSource.close()
            setIsIndexing(false)
          }
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        setStatus('error')
        setErrorMessage('Connection lost. Please try again.')
        setMessage('Indexing failed')
        eventSource.close()
        setIsIndexing(false)
      }

    } catch (error) {
      console.error('Indexing error:', error)
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
                      {result.alreadyIndexed ? 'Already Indexed' : 'Successfully Indexed'}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {result.alreadyIndexed
                        ? 'This document has already been indexed. You can now use all features!'
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
                      <li>ChromaDB not running (docker run -d -p 8000:8000 chromadb/chroma)</li>
                      <li>OpenAI API key not configured</li>
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
