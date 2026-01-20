'use client'

import { useEffect, useState } from 'react'

// Helper to determine error type and provide helpful suggestions
function getErrorInfo(error: Error & { digest?: string }) {
  const message = error.message?.toLowerCase() || ''
  const name = error.name?.toLowerCase() || ''

  // PDF.js related errors
  if (message.includes('pdf') || message.includes('worker') || name.includes('pdf')) {
    return {
      title: 'PDF Loading Error',
      description: 'There was an issue with the PDF viewer. This usually resolves on retry.',
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Try a different browser'
      ]
    }
  }

  // Network/fetch errors
  if (message.includes('fetch') || message.includes('network') || message.includes('failed to load')) {
    return {
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your internet connection.',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ]
    }
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('authentication') || message.includes('401')) {
    return {
      title: 'Session Expired',
      description: 'Your session may have expired. Please sign in again.',
      suggestions: [
        'Sign out and sign back in',
        'Clear browser cookies for this site',
        'Try a different browser'
      ]
    }
  }

  // Chunk loading errors (dynamic imports)
  if (message.includes('chunk') || message.includes('loading chunk') || message.includes('dynamic')) {
    return {
      title: 'Loading Error',
      description: 'A component failed to load. This often happens after updates.',
      suggestions: [
        'Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)',
        'Clear your browser cache',
        'Try again in a few minutes'
      ]
    }
  }

  // Default error
  return {
    title: 'Something went wrong',
    description: 'An unexpected error occurred while loading the application.',
    suggestions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'If the problem persists, contact support'
    ]
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const errorInfo = getErrorInfo(error)

  useEffect(() => {
    // Log error to console for debugging
    console.error('App error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    if (error.digest) {
      console.error('Error digest:', error.digest)
    }
  }, [error])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {errorInfo.title}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {errorInfo.description}
        </p>

        {/* Suggestions */}
        <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Try these steps:</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {errorInfo.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400">{i + 1}.</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={reset}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={handleRefresh}
            className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Refresh page
          </button>
        </div>

        {/* Error details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          {showDetails ? 'Hide' : 'Show'} technical details
        </button>

        {showDetails && (
          <div className="mt-3 text-left bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-auto max-h-32">
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
              <strong>Error:</strong> {error.name || 'Unknown'}<br />
              <strong>Message:</strong> {error.message || 'No message'}<br />
              {error.digest && <><strong>Digest:</strong> {error.digest}</>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}