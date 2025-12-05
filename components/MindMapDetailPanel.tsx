"use client"

import React, { useState } from 'react'
import { X, BookOpen, Quote, Lightbulb, Loader2, Minimize2, Maximize2, ChevronUp, Maximize, RefreshCw } from 'lucide-react'

type PanelState = 'minimized' | 'compact' | 'expanded'

interface NodeDetail {
  expandedExplanation: string
  hasDocumentText?: boolean  // NEW: Flag to indicate if document text is available
  canReload?: boolean  // NEW: Flag to indicate if reload is possible
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
  onReloadDocumentText?: () => Promise<void>  // NEW: Callback to reload document text
}

export default function MindMapDetailPanel({
  isOpen,
  onClose,
  nodeLabel,
  nodeDescription,
  nodeDetails,
  isLoading,
  selectedNodePosition,
  onReloadDocumentText
}: MindMapDetailPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('compact')
  const [isReloading, setIsReloading] = useState(false)

  // Handle reload document text
  const handleReload = async () => {
    if (!onReloadDocumentText) return

    setIsReloading(true)
    try {
      await onReloadDocumentText()
      // Reopen the panel after reload
      setTimeout(() => {
        onClose() // Close to trigger refresh
      }, 500)
    } catch (error) {
      console.error('Failed to reload document text:', error)
    } finally {
      setIsReloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div>
      {/* Backdrop - Only show when not minimized */}
      {panelState !== 'minimized' && (
        <div
          className="fixed inset-0 bg-black/10 dark:bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel - Three States */}
      {panelState === 'minimized' ? (
        // Minimized State - Enhanced Floating Card
        <div
          className="fixed top-24 right-6 w-[420px] bg-white dark:bg-gray-900 shadow-2xl z-50 rounded-2xl border border-accent-primary/20 overflow-hidden transform transition-all duration-300 ease-out hover:shadow-[0_20px_70px_-15px_rgba(124,58,237,0.3)]"
          style={{
            animation: 'slideInFromRight 0.3s ease-out'
          }}
        >
          <div className="bg-gradient-to-r from-accent-primary via-purple-500 to-accent-secondary p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white leading-tight mb-1">
                  {nodeLabel}
                </h3>
                {nodeDescription && (
                  <p className="text-white/90 text-sm line-clamp-1 mt-2">
                    {nodeDescription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setPanelState('compact')}
                  className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                  aria-label="Open compact view"
                  title="Compact View"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-accent-primary/5 via-purple-50 to-accent-secondary/5 dark:from-accent-primary/10 dark:via-purple-900/20 dark:to-accent-secondary/10">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4 mb-4">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                  <span className="text-gray-600 dark:text-gray-400">Loading details...</span>
                </span>
              ) : nodeDetails ? (
                nodeDetails.expandedExplanation
              ) : (
                <span className="text-gray-500 dark:text-gray-500 italic">Click expand to view full details</span>
              )}
            </p>
            <button
              onClick={() => setPanelState('compact')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all text-sm font-semibold group"
            >
              <Maximize className="w-4 h-4 group-hover:scale-110 transition-transform" />
              View Full Details
            </button>
          </div>
        </div>
      ) : (
        // Compact & Expanded States - Side Panel
        <div
          className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto transform transition-all duration-300 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            panelState === 'compact' ? 'w-full md:w-96' : 'w-full md:w-[500px]'
          }`}
        >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-accent-primary via-purple-500 to-accent-secondary shadow-lg z-10">
          <div className={`flex items-start justify-between gap-4 ${panelState === 'compact' ? 'p-5' : 'p-6'}`}>
            <div className="flex-1 min-w-0">
              <h2 className={`font-bold text-white leading-tight ${panelState === 'compact' ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>
                {nodeLabel}
              </h2>
              {nodeDescription && (
                <p className={`text-white/90 ${panelState === 'compact' ? 'text-xs line-clamp-2' : 'text-sm'}`}>
                  {nodeDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {panelState === 'compact' ? (
                <button
                  onClick={() => setPanelState('expanded')}
                  className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                  aria-label="Expand panel"
                  title="Expand"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button
                  onClick={() => setPanelState('compact')}
                  className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                  aria-label="Compact view"
                  title="Compact"
                >
                  <Minimize2 className="w-5 h-5 text-white" />
                </button>
              )}
              <button
                onClick={() => setPanelState('minimized')}
                className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                aria-label="Minimize panel"
                title="Minimize"
              >
                <ChevronUp className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/25 rounded-xl transition-all hover:scale-110"
                aria-label="Close panel"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`space-y-6 ${panelState === 'compact' ? 'p-5' : 'p-6'}`}>
          {isLoading ? (
            // Loading State
            <div className="space-y-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-accent-primary mx-auto mb-4" />
                  <p className={`text-gray-600 dark:text-gray-400 ${panelState === 'compact' ? 'text-sm' : 'text-base'}`}>
                    Generating detailed insights...
                  </p>
                </div>
              </div>

              {/* Loading Skeleton */}
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse w-5/6" />
              </div>
            </div>
          ) : nodeDetails ? (
            // Loaded Content
            <>
              {/* Reload Button - Show at top if document text is missing and reload is available */}
              {nodeDetails.canReload && onReloadDocumentText && (
                <div className="mb-4">
                  <button
                    onClick={handleReload}
                    disabled={isReloading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                    {isReloading ? 'Loading Document Text...' : 'Reload Document Text'}
                  </button>
                </div>
              )}

              {/* Expanded Explanation */}
              <section>
                <div className={`flex items-center gap-2 mb-4 ${panelState === 'compact' ? 'mb-3' : 'mb-4'}`}>
                  <div className={`p-2 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl ${panelState === 'compact' ? 'p-1.5' : 'p-2'}`}>
                    <BookOpen className={`text-white ${panelState === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  </div>
                  <h3 className={`font-bold text-gray-900 dark:text-white ${panelState === 'compact' ? 'text-base' : 'text-lg'}`}>
                    Detailed Explanation
                  </h3>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className={`text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap ${panelState === 'compact' ? 'text-sm' : 'text-base'}`}>
                    {nodeDetails.expandedExplanation}
                  </p>
                </div>
              </section>

              {/* Quotes from Source */}
              {nodeDetails.quotes && nodeDetails.quotes.length > 0 && (
                <section>
                  <div className={`flex items-center gap-2 ${panelState === 'compact' ? 'mb-3' : 'mb-4'}`}>
                    <div className={`bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl ${panelState === 'compact' ? 'p-1.5' : 'p-2'}`}>
                      <Quote className={`text-white ${panelState === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    </div>
                    <h3 className={`font-bold text-gray-900 dark:text-white ${panelState === 'compact' ? 'text-base' : 'text-lg'}`}>
                      Relevant Quotes
                    </h3>
                  </div>
                  <div className={`space-y-${panelState === 'compact' ? '3' : '4'}`}>
                    {nodeDetails.quotes.map((quote, index) => (
                      <div
                        key={index}
                        className={`border-l-4 border-accent-primary bg-gray-50 dark:bg-gray-800 rounded-r-xl ${panelState === 'compact' ? 'p-3' : 'p-4'}`}
                      >
                        <p className={`text-gray-700 dark:text-gray-300 italic mb-2 ${panelState === 'compact' ? 'text-sm' : 'text-base'}`}>
                          "{quote.text}"
                        </p>
                        <p className={`text-gray-600 dark:text-gray-400 ${panelState === 'compact' ? 'text-xs' : 'text-sm'}`}>
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
                  <div className={`flex items-center gap-2 ${panelState === 'compact' ? 'mb-3' : 'mb-4'}`}>
                    <div className={`bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl ${panelState === 'compact' ? 'p-1.5' : 'p-2'}`}>
                      <Lightbulb className={`text-white ${panelState === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    </div>
                    <h3 className={`font-bold text-gray-900 dark:text-white ${panelState === 'compact' ? 'text-base' : 'text-lg'}`}>
                      Practical Examples
                    </h3>
                  </div>
                  <div className={`space-y-${panelState === 'compact' ? '3' : '4'}`}>
                    {nodeDetails.examples.map((example, index) => (
                      <div
                        key={index}
                        className={`bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 border border-accent-primary/20 rounded-xl ${panelState === 'compact' ? 'p-3' : 'p-4'}`}
                      >
                        <h4 className={`font-semibold text-gray-900 dark:text-white mb-2 ${panelState === 'compact' ? 'text-sm' : 'text-base'}`}>
                          {example.title}
                        </h4>
                        <p className={`text-gray-700 dark:text-gray-300 ${panelState === 'compact' ? 'text-sm' : 'text-base'}`}>
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
