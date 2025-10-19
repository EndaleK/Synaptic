"use client"

import React, { useState } from 'react'
import { X, BookOpen, Quote, Lightbulb, Loader2, Minimize2, Maximize2, ChevronUp } from 'lucide-react'

interface NodeDetail {
  expandedExplanation: string
  quotes: Array<{
    text: string
    context: string
  }>
  examples: Array<{
    title: string
    description: string
  }>
}

interface MindMapDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  nodeLabel: string
  nodeDescription?: string
  nodeDetails: NodeDetail | null
  isLoading: boolean
  selectedNodePosition?: { x: number; y: number } | null
}

export default function MindMapDetailPanel({
  isOpen,
  onClose,
  nodeLabel,
  nodeDescription,
  nodeDetails,
  isLoading,
  selectedNodePosition
}: MindMapDetailPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  if (!isOpen) return null

  return (
    <div>
      {/* Backdrop - Only show when not minimized */}
      {!isMinimized && (
        <div
          className="fixed inset-0 bg-black/10 dark:bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel - Full or Minimized */}
      {isMinimized ? (
        // Minimized State - Floating Card
        <div
          className="fixed top-24 right-6 w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-50 rounded-xl border-2 border-accent-primary/30 overflow-hidden transform transition-all duration-300 ease-out"
          style={{
            animation: 'slideInFromRight 0.3s ease-out'
          }}
        >
          <div className="bg-gradient-to-r from-accent-primary to-accent-secondary p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">
                  {nodeLabel}
                </h3>
                {nodeDescription && (
                  <p className="text-white/80 text-sm truncate mt-1">
                    {nodeDescription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Maximize panel"
                  title="Expand"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading details...
                </span>
              ) : nodeDetails ? (
                nodeDetails.expandedExplanation.substring(0, 120) + '...'
              ) : (
                'Click expand to view full details'
              )}
            </p>
            <button
              onClick={() => setIsMinimized(false)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <ChevronUp className="w-4 h-4" />
              Expand Full Details
            </button>
          </div>
        </div>
      ) : (
        // Full State - Side Panel
        <div
          className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto transform transition-all duration-300 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-accent-primary to-accent-secondary p-6 shadow-md z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                {nodeLabel}
              </h2>
              {nodeDescription && (
                <p className="text-white/90 text-sm">
                  {nodeDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Minimize panel"
                title="Minimize"
              >
                <Minimize2 className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close panel"
                title="Close"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            // Loading State
            <div className="space-y-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-accent-primary mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Generating detailed insights...
                  </p>
                </div>
              </div>

              {/* Loading Skeleton */}
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-5/6" />
              </div>
            </div>
          ) : nodeDetails ? (
            // Loaded Content
            <>
              {/* Expanded Explanation */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detailed Explanation
                  </h3>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {nodeDetails.expandedExplanation}
                  </p>
                </div>
              </section>

              {/* Quotes from Source */}
              {nodeDetails.quotes && nodeDetails.quotes.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg">
                      <Quote className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Relevant Quotes
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {nodeDetails.quotes.map((quote, index) => (
                      <div
                        key={index}
                        className="border-l-4 border-accent-primary bg-gray-50 dark:bg-gray-800 p-4 rounded-r-lg"
                      >
                        <p className="text-gray-700 dark:text-gray-300 italic mb-2">
                          "{quote.text}"
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {quote.context}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Practical Examples */}
              {nodeDetails.examples && nodeDetails.examples.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Practical Examples
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {nodeDetails.examples.map((example, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 border border-accent-primary/20 p-4 rounded-lg"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {example.title}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {example.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            // Error State
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Failed to Load Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Unable to generate detailed information for this concept. Please try again.
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
