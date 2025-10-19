"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Network, Loader2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import type { MindMapNode, MindMapEdge } from '@/lib/mindmap-generator'

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
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  metadata?: {
    totalNodes: number
    maxDepth: number
    categories: Record<string, number>
  }
}

export default function MindMapView({ documentId, documentName }: MindMapViewProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [maxNodes, setMaxNodes] = useState(25)
  const [maxDepth, setMaxDepth] = useState(3)

  const generateMindMap = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          maxNodes,
          maxDepth
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate mind map')
      }

      const data = await response.json()
      console.log('Mind map data received:', data)

      // Extract the mindMap object if it exists
      const mindMapData = data.mindMap || data
      setMindMapData(mindMapData)

      // Store document text for detail generation
      if (data.documentText) {
        setDocumentText(data.documentText)
      }
    } catch (err) {
      console.error('Mind map generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    setMindMapData(null)
    generateMindMap()
  }

  // If mind map exists, show viewer
  if (mindMapData) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with Regenerate Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {documentName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mind Map Visualization
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {/* Mind Map Viewer */}
        <div className="flex-1">
          <MindMapViewer
            title={mindMapData.title}
            nodes={mindMapData.nodes}
            edges={mindMapData.edges}
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

      {/* Advanced Options */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-semibold text-gray-900 dark:text-white">
            Advanced Options
          </span>
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            {/* Max Nodes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Nodes: {maxNodes}
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                More nodes = more detailed map (may take longer to generate)
              </p>
            </div>

            {/* Max Depth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Depth: {maxDepth}
              </label>
              <input
                type="range"
                min="2"
                max="5"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Higher depth = more hierarchical levels
              </p>
            </div>
          </div>
        )}
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

      {/* What to Expect Section */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-primary" />
          What to Expect
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-accent-primary font-bold">1.</span>
            <span>AI extracts key concepts and relationships from your document</span>
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
    </div>
  )
}
