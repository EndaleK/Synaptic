"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Network, Loader2, AlertCircle, Sparkles, RefreshCw, History } from 'lucide-react'
import type { MindMapNode, MindMapEdge } from '@/lib/mindmap-generator'
import DocumentSwitcherModal from './DocumentSwitcherModal'

// Dynamically import MindMapViewer to avoid SSR issues with React Flow
const MindMapViewer = dynamic(() => import('./MindMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading mind map viewer...</p>
      </div>
    </div>
  )
})

interface MindMapViewProps {
  documentId: string
  documentName: string
}

interface MindMapData {
  id?: string  // Database ID for saving edits
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  template?: 'hierarchical' | 'flowchart' | 'timeline'
  templateReason?: string
  metadata?: {
    totalNodes: number
    maxDepth: number
    categories: Record<string, number>
  }
}

interface ComplexityAnalysis {
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  score: number
  factors: {
    length: number
    vocabulary: number
    structure: number
    technical: number
  }
  reasoning: string
  recommendedNodes: number
  recommendedDepth: number
}

export default function MindMapView({ documentId, documentName }: MindMapViewProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [existingMindMaps, setExistingMindMaps] = useState<any[]>([])
  const [documentText, setDocumentText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [complexityAnalysis, setComplexityAnalysis] = useState<ComplexityAnalysis | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')

  // Check for existing mind maps on mount
  useEffect(() => {
    const fetchExistingMindMaps = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/mindmaps?documentId=${documentId}`)
        if (response.ok) {
          const data = await response.json()
          setExistingMindMaps(data.mindmaps || [])

          // Auto-load the most recent mind map
          if (data.mindmaps && data.mindmaps.length > 0) {
            const latest = data.mindmaps[0]
            setMindMapData({
              id: latest.id, // Include database ID for saving edits
              title: latest.title,
              nodes: latest.nodes,
              edges: latest.edges,
              template: latest.layout_data?.template,
              templateReason: latest.layout_data?.templateReason,
              metadata: latest.layout_data?.metadata
            })

            // Fetch document text for node expansion
            try {
              const docResponse = await fetch(`/api/documents/${documentId}`)
              if (docResponse.ok) {
                const docData = await docResponse.json()
                if (docData.document?.extracted_text) {
                  setDocumentText(docData.document.extracted_text)
                  console.log('[MindMapView] Loaded document text for node expansion:', docData.document.extracted_text.length, 'chars')
                }
              }
            } catch (docErr) {
              console.error('Failed to fetch document text:', docErr)
              // Continue anyway - node expansion just won't be available
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch existing mind maps:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExistingMindMaps()
  }, [documentId])

  const generateMindMap = async () => {
    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setProgressMessage('Starting mind map generation...')

    console.log('[MindMapView] Generating mind map for documentId:', documentId)
    console.log('[MindMapView] Document name:', documentName)

    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId
          // No maxNodes or maxDepth - let API auto-detect
        })
      })

      console.log('[MindMapView] API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate mind map')
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
                  setProgressMessage(event.message)
                  console.log(`[MindMapView] Progress: ${event.progress}% - ${event.message}`)
                } else if (event.type === 'complete') {
                  const data = event.data
                  console.log('[MindMapView] Received complete event:', data)
                  console.log('[MindMapView] Raw API response:', data)
                  console.log('[MindMapView] data.mindMap exists:', !!data.mindMap)
                  console.log('[MindMapView] data.mindMap.nodes:', data.mindMap?.nodes?.length)
                  console.log('[MindMapView] data.mindMap.edges:', data.mindMap?.edges?.length)

                  // Extract the mindMap object if it exists
                  const mindMapData = data.mindMap || data
                  console.log('[MindMapView] Setting mindMapData:', {
                    title: mindMapData.title,
                    nodeCount: mindMapData.nodes?.length,
                    edgeCount: mindMapData.edges?.length,
                    template: mindMapData.template,
                    templateReason: mindMapData.templateReason,
                    nodesPreview: mindMapData.nodes?.slice(0, 2)
                  })
                  setMindMapData(mindMapData)

                  // Store complexity analysis
                  if (data.complexityAnalysis) {
                    setComplexityAnalysis(data.complexityAnalysis)
                  }

                  // Fetch document text separately (for node expansion)
                  if (data.documentId) {
                    try {
                      const docResponse = await fetch(`/api/documents/${data.documentId}`)
                      if (docResponse.ok) {
                        const docData = await docResponse.json()
                        if (docData.document?.extracted_text) {
                          setDocumentText(docData.document.extracted_text)
                          console.log('[MindMapView] Loaded document text for node expansion:', docData.document.extracted_text.length, 'chars')
                        }
                      }
                    } catch (docErr) {
                      console.error('Failed to fetch document text:', docErr)
                      // Continue anyway - node expansion just won't be available
                    }
                  }
                } else if (event.type === 'error') {
                  throw new Error(event.error)
                }
              } catch (parseError) {
                console.error('[MindMapView] Failed to parse SSE message:', parseError)
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response (for backwards compatibility)
        const data = await response.json()
        console.log('[MindMapView] Raw API response (JSON):', data)
        console.log('[MindMapView] data.mindMap exists:', !!data.mindMap)
        console.log('[MindMapView] data.mindMap.nodes:', data.mindMap?.nodes?.length)
        console.log('[MindMapView] data.mindMap.edges:', data.mindMap?.edges?.length)

        // Extract the mindMap object if it exists
        const mindMapData = data.mindMap || data
        console.log('[MindMapView] Setting mindMapData:', {
          title: mindMapData.title,
          nodeCount: mindMapData.nodes?.length,
          edgeCount: mindMapData.edges?.length,
          template: mindMapData.template,
          templateReason: mindMapData.templateReason,
          nodesPreview: mindMapData.nodes?.slice(0, 2)
        })
        setMindMapData(mindMapData)

        // Store complexity analysis
        if (data.complexityAnalysis) {
          setComplexityAnalysis(data.complexityAnalysis)
        }

        // Fetch document text separately (for node expansion)
        if (data.documentId) {
          try {
            const docResponse = await fetch(`/api/documents/${data.documentId}`)
            if (docResponse.ok) {
              const docData = await docResponse.json()
              if (docData.document?.extracted_text) {
                setDocumentText(docData.document.extracted_text)
                console.log('[MindMapView] Loaded document text for node expansion:', docData.document.extracted_text.length, 'chars')
              }
            }
          } catch (docErr) {
            console.error('Failed to fetch document text:', docErr)
            // Continue anyway - node expansion just won't be available
          }
        }
      }

    } catch (err) {
      console.error('Mind map generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
      setProgress(0)
      setProgressMessage('')
    }
  }

  const handleRegenerate = () => {
    setMindMapData(null)
    generateMindMap()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Checking for existing mind maps...</span>
      </div>
    )
  }

  // If mind map exists, show viewer - MAXIMIZED VIEW
  if (mindMapData) {
    return (
      <div className="h-full flex flex-col">
        {/* Show existing mind map count */}
        {existingMindMaps.length > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 mx-4 mt-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This document has {existingMindMaps.length} mind map{existingMindMaps.length > 1 ? 's' : ''}.
                Showing the most recent one.
              </p>
            </div>
          </div>
        )}

        {/* Compact Header with Regenerate Button */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-accent-primary/5 to-accent-secondary/5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {documentName}
            </h2>
            {complexityAnalysis && (
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                  complexityAnalysis.complexity === 'simple' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  complexityAnalysis.complexity === 'moderate' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  complexityAnalysis.complexity === 'complex' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                }`}>
                  {complexityAnalysis.complexity.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-gray-500 dark:text-gray-400 hidden md:inline">
                  {complexityAnalysis.recommendedNodes} nodes • {complexityAnalysis.recommendedDepth} levels
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
        </div>

        {/* Mind Map Viewer - MAXIMIZED */}
        <div className="flex-1 min-h-0">
          <MindMapViewer
            mindmapId={mindMapData.id} // Pass database ID for saving edits
            title={mindMapData.title || 'Untitled Mind Map'}
            nodes={mindMapData.nodes || []}
            edges={mindMapData.edges || []}
            template='hierarchical'
            templateReason={mindMapData.templateReason}
            documentText={documentText}
          />
        </div>
      </div>
    )
  }

  // Generation interface
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-2xl p-8 border border-accent-primary/20 dark:border-accent-primary/30">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center flex-shrink-0">
            <Network className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Generate Mind Map
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Transform <span className="font-semibold text-accent-primary">{documentName}</span> into an interactive visual concept map
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full">
                <Sparkles className="w-3 h-3" />
                Hierarchical structure
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full">
                <Network className="w-3 h-3" />
                Interactive nodes
              </span>
              <span className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full">
                <Sparkles className="w-3 h-3" />
                Export to PNG/JSON
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent Analysis Info */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Intelligent Complexity Analysis
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Synaptic automatically analyzes your document to determine the optimal mind map structure
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Document Length</div>
            <div className="font-semibold text-gray-900 dark:text-white">Auto-detected</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vocabulary Richness</div>
            <div className="font-semibold text-gray-900 dark:text-white">Analyzed</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Structure Complexity</div>
            <div className="font-semibold text-gray-900 dark:text-white">Measured</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Technical Density</div>
            <div className="font-semibold text-gray-900 dark:text-white">Evaluated</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Generation Failed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={generateMindMap}
                className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateMindMap}
        disabled={isGenerating}
        className="w-full py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating Mind Map...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate Mind Map
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="text-center space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-accent-primary to-accent-secondary h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {progressMessage || 'Analyzing your document...'}
          </p>

          {/* Progress Percentage */}
          {progress > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {progress}% complete
            </p>
          )}
        </div>
      )}

      {/* What to Expect Section */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-primary" />
          What to Expect
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-accent-primary font-bold">1.</span>
            <span>Automatically extracts key concepts and relationships from your document</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-primary font-bold">2.</span>
            <span>Concepts organized into hierarchical structure with categories</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-primary font-bold">3.</span>
            <span>Interactive visualization with zoom, pan, and node exploration</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-primary font-bold">4.</span>
            <span>Export your mind map as PNG image or JSON data</span>
          </div>
        </div>

        {/* Cost Estimate */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Estimated cost:</span> ~$0.01 per mind map generation
          </p>
        </div>
      </div>

      {/* Document Switcher */}
      <DocumentSwitcherModal
        onDocumentSwitch={() => {
          // Clear mind map data when switching documents
          setMindMapData(null)
          setIsGenerating(false)
        }}
      />
    </div>
  )
}
