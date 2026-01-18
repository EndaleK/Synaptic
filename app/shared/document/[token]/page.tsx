"use client"

import { useState, useEffect, use } from "react"
import { FileText, User, Calendar, ExternalLink, BookOpen, Mic, Network } from "lucide-react"
import Link from "next/link"

interface SharedDocumentData {
  fileName: string
  fileType: string
  creatorName?: string
  createdAt: string
  summary?: string
  hasFlashcards: boolean
  hasPodcasts: boolean
  hasMindmaps: boolean
  flashcardsCount: number
  podcastsCount: number
  mindmapsCount: number
}

export default function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [documentData, setDocumentData] = useState<SharedDocumentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/shared/document/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('This document was not found or is not publicly shared.')
          } else {
            setError('Failed to load document.')
          }
          return
        }
        const data = await response.json()
        setDocumentData(data)
      } catch (err) {
        setError('Failed to load document.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [token])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Document Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This document is not available.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            Start Learning with Synaptic
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                {documentData.fileName}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="uppercase text-xs">{documentData.fileType.split('/').pop()}</span>
                {documentData.creatorName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {documentData.creatorName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try Synaptic Free
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary */}
        {documentData.summary && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Summary
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {documentData.summary}
            </p>
          </div>
        )}

        {/* Generated Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Study Materials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Flashcards */}
            <div className={`p-4 rounded-xl ${documentData.hasFlashcards ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className={`w-5 h-5 ${documentData.hasFlashcards ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 dark:text-white">Flashcards</span>
              </div>
              {documentData.hasFlashcards ? (
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  {documentData.flashcardsCount} cards available
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not yet generated
                </p>
              )}
            </div>

            {/* Podcasts */}
            <div className={`p-4 rounded-xl ${documentData.hasPodcasts ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Mic className={`w-5 h-5 ${documentData.hasPodcasts ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 dark:text-white">Podcasts</span>
              </div>
              {documentData.hasPodcasts ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {documentData.podcastsCount} episode{documentData.podcastsCount !== 1 ? 's' : ''} available
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not yet generated
                </p>
              )}
            </div>

            {/* Mind Maps */}
            <div className={`p-4 rounded-xl ${documentData.hasMindmaps ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Network className={`w-5 h-5 ${documentData.hasMindmaps ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 dark:text-white">Mind Maps</span>
              </div>
              {documentData.hasMindmaps ? (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {documentData.mindmapsCount} map{documentData.mindmapsCount !== 1 ? 's' : ''} available
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not yet generated
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Want to create study materials from your own documents?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload any PDF, DOCX, or web page and let AI generate flashcards, podcasts, and mind maps.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all"
          >
            Start Learning Free
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 sm:hidden">
        <Link
          href="/"
          className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all"
        >
          Start Learning Free
        </Link>
      </div>
    </div>
  )
}
