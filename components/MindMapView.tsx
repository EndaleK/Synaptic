"use client"

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Network, Loader2, AlertCircle, Sparkles, RefreshCw, History, GitBranch, Circle, Share2 } from 'lucide-react'
import type { MindMapNode, MindMapEdge } from '@/lib/mindmap-generator'
import type { MindMapType } from '@/lib/supabase/types'
import DocumentSwitcherModal from './DocumentSwitcherModal'
import InfoTipBanner from './InfoTipBanner'

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
  mapType?: MindMapType  // NEW: Mind map type (hierarchical, radial, concept)
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
  const [selectedMapType, setSelectedMapType] = useState<MindMapType>('hierarchical')
  const [isPreviewMode, setIsPreviewMode] = useState(false) // NEW: Track if showing unsaved preview
  const [showGenerationForm, setShowGenerationForm] = useState(true) // Show generation form first

  // Content selection state
  const [contentType, setContentType] = useState<'full' | 'chapters' | 'pageRange' | 'smartTopics'>('full')
  const [pageRange, setPageRange] = useState({ start: '', end: '' })
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  // 📊 Study session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // Check for existing mind maps on mount
  useEffect(() => {
    const fetchExistingMindMaps = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/mindmaps?documentId=${documentId}`)
        if (response.ok) {
          const data = await response.json()
          setExistingMindMaps(data.mindmaps || [])

          // Don't auto-load - let user choose via "View" button in banner
          // This matches the podcast behavior
          console.log('[MindMapView] Found', data.mindmaps?.length || 0, 'existing mind maps')
        }
      } catch (err) {
        console.error('Failed to fetch existing mind maps:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExistingMindMaps()
  }, [documentId])

  // 📊 STATISTICS: Start study session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: documentId,
            sessionType: 'mindmap',
            plannedDurationMinutes: 30 // Default estimate for mindmap session
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.sessionId)
          sessionStartTime.current = new Date()
          console.log('[MindMapView] Study session started:', data.sessionId)
        }
      } catch (error) {
        console.error('[MindMapView] Failed to start study session:', error)
      }
    }

    startSession()
  }, [documentId])

  // 📊 STATISTICS: Complete study session when component unmounts
  useEffect(() => {
    return () => {
      // Complete session on unmount using fetch with keepalive
      if (sessionId && sessionStartTime.current) {
        const durationMinutes = Math.round((Date.now() - sessionStartTime.current.getTime()) / 60000)

        // Only record if session lasted at least 1 minute
        if (durationMinutes >= 1) {
          // Use fetch with keepalive: works during page unload and sets proper Content-Type header
          fetch('/api/study-sessions/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              durationMinutes
            }),
            keepalive: true // Ensures request completes even during page unload
          }).then(response => {
            if (response.ok) {
              console.log('[MindMapView] Study session completed:', durationMinutes, 'minutes')
            } else {
              console.warn('[MindMapView] Failed to complete study session:', response.status)
            }
          }).catch(error => {
            console.error('[MindMapView] Error completing study session:', error)
          })
        }
      }
    }
  }, [sessionId])

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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          mapType: selectedMapType
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
                    mapType: mindMapData.mapType,
                    nodeCount: mindMapData.nodes?.length,
                    edgeCount: mindMapData.edges?.length,
                    template: mindMapData.template,
                    templateReason: mindMapData.templateReason,
                    nodesPreview: mindMapData.nodes?.slice(0, 2)
                  })

                  console.log('[MindMapView] ⚠️ SETTING PREVIEW MODE - Mind map should display now')
                  setMindMapData(mindMapData)
                  setIsPreviewMode(true) // NEW: Mark as preview (unsaved)
                  setShowGenerationForm(false) // Switch to viewer after generation
                  console.log('[MindMapView] ⚠️ Preview mode state set to TRUE')

                  // Sync the selectedMapType state with the generated map type
                  if (mindMapData.mapType) {
                    console.log('[MindMapView] ⚠️ Syncing map type:', mindMapData.mapType)
                    setSelectedMapType(mindMapData.mapType)
                  } else {
                    console.warn('[MindMapView] ⚠️ WARNING: No mapType in response data!')
                  }

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
        setIsPreviewMode(true) // NEW: Mark as preview (unsaved)
        setShowGenerationForm(false) // Switch to viewer after generation

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
    setIsPreviewMode(false)
    generateMindMap()
  }

  // NEW: Save mind map to library
  const handleSaveToLibrary = async () => {
    if (!mindMapData) return

    // Use mapType from mindMapData (set by API) or fall back to selectedMapType (from regenerate)
    const mapTypeToSave = (mindMapData as any).mapType || selectedMapType

    const response = await fetch('/api/mindmaps/save', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        title: mindMapData.title,
        mapType: mapTypeToSave,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        layoutData: {
          ...mindMapData.metadata,
          template: mindMapData.template,
          templateReason: mindMapData.templateReason
        },
        documentText: documentText || null // Include document text for node expansion feature
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save mind map')
    }

    const data = await response.json()
    console.log('[MindMapView] Mind map saved successfully:', data.mindMap.id)

    // Update the mind map data with the saved ID
    setMindMapData({
      ...mindMapData,
      id: data.mindMap.id
    })

    // Exit preview mode
    setIsPreviewMode(false)

    // Refresh the existing mind maps list
    const refreshResponse = await fetch(`/api/mindmaps?documentId=${documentId}`)
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json()
      setExistingMindMaps(refreshData.mindmaps || [])
      console.log('[MindMapView] Refreshed mind maps list:', refreshData.mindmaps?.length, 'maps')
    }
  }

  // NEW: Reload document text (for when saved mind maps are missing document_text)
  const handleReloadDocumentText = async () => {
    if (!documentId) {
      console.error('[MindMapView] Cannot reload: No documentId available')
      return
    }

    console.log('[MindMapView] 🔄 Manually reloading document text for document:', documentId)

    try {
      const docResponse = await fetch(`/api/documents/${documentId}`)
      console.log('[MindMapView] Reload response status:', docResponse.status)

      if (docResponse.ok) {
        const docData = await docResponse.json()
        console.log('[MindMapView] Reload returned:', {
          hasDocument: !!docData.document,
          hasExtractedText: !!docData.document?.extracted_text,
          extractedTextLength: docData.document?.extracted_text?.length || 0
        })

        if (docData.document?.extracted_text) {
          setDocumentText(docData.document.extracted_text)
          console.log('[MindMapView] ✓ Successfully reloaded document text:', docData.document.extracted_text.length, 'chars')
        } else {
          console.error('[MindMapView] ✗ Reload failed: No extracted_text in response')
          setError('Could not reload document text: Document has no extracted text')
        }
      } else {
        const errorText = await docResponse.text()
        console.error('[MindMapView] ✗ Reload failed with status:', docResponse.status, errorText)
        setError(`Failed to reload document text: ${docResponse.status} ${errorText}`)
      }
    } catch (err) {
      console.error('[MindMapView] ✗ Exception during reload:', err)
      setError(err instanceof Error ? err.message : 'Failed to reload document text')
    }
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

  // Show mind map viewer when user chooses to view (via banner button or after generation)
  if (mindMapData && !showGenerationForm) {
    return (
      <div className="h-full flex flex-col">
        {/* Back to generation form button */}
        <button
          onClick={() => setShowGenerationForm(true)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-accent-primary transition-colors mx-4 mt-2 mb-1"
        >
          <Sparkles className="w-4 h-4" />
          Generate New Mind Map
        </button>

        {/* Show existing mind map count */}
        {existingMindMaps.length > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 mb-2 mx-4 mt-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                This document has {existingMindMaps.length} mind map{existingMindMaps.length > 1 ? 's' : ''}.
                Showing the most recent one.
              </p>
            </div>
          </div>
        )}

        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                Preview Mode - This mind map has not been saved yet
              </p>
            </div>
          </div>
        )}

        {/* Compact Header with Action Buttons */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          </div>
        </div>

        {/* Mind Map Viewer - MAXIMIZED */}
        <div className="flex-1 min-h-0">
          <MindMapViewer
            mindmapId={mindMapData.id} // Pass database ID for saving edits
            title={mindMapData.title || 'Untitled Mind Map'}
            nodes={mindMapData.nodes || []}
            edges={mindMapData.edges || []}
            template={mindMapData.template || 'hierarchical'}
            templateReason={mindMapData.templateReason}
            mapType={mindMapData.mapType || selectedMapType} // NEW: Pass mind map type for layout
            documentText={documentText}
            documentId={documentId} // NEW: Pass documentId for reloading
            onReloadDocumentText={handleReloadDocumentText} // NEW: Reload callback
            onSave={isPreviewMode ? handleSaveToLibrary : undefined} // Pass save callback for unsaved mind maps
          />
        </div>
      </div>
    )
  }

  // Generation interface
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        {/* Compact Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <Network className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                Generate Mind Map
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                Visualize "{documentName}"
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Existing Mind Maps Banner */}
          {existingMindMaps.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You have {existingMindMaps.length} existing mind map{existingMindMaps.length > 1 ? 's' : ''} for this document
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Load the most recent mind map
                    const latest = existingMindMaps[0]
                    setMindMapData({
                      id: latest.id,
                      title: latest.title,
                      nodes: latest.nodes,
                      edges: latest.edges,
                      template: latest.layout_data?.template,
                      templateReason: latest.layout_data?.templateReason,
                      metadata: latest.layout_data?.metadata
                    })
                    // Load document text if available
                    if (latest.document_text) {
                      setDocumentText(latest.document_text)
                    }
                    // Switch to viewer
                    setShowGenerationForm(false)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Network className="w-4 h-4" />
                  View
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Content Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Select Content
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setContentType('full')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'full'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Full Document
                </div>
              </button>
              <button
                onClick={() => setContentType('chapters')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'chapters'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Chapters
                </div>
              </button>
              <button
                onClick={() => setContentType('pageRange')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'pageRange'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Page Range
                </div>
              </button>
              <button
                onClick={() => setContentType('smartTopics')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'smartTopics'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Smart Topics
                </div>
              </button>
            </div>
            {/* Page Range Inputs */}
            {contentType === 'pageRange' && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Start"
                  value={pageRange.start}
                  onChange={(e) => setPageRange({ ...pageRange, start: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="End"
                  value={pageRange.end}
                  onChange={(e) => setPageRange({ ...pageRange, end: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            )}
            {/* Info message */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {contentType === 'full' && `Mind map will be generated from the entire document`}
              {contentType === 'chapters' && 'Select specific chapters (feature coming soon)'}
              {contentType === 'pageRange' && 'Specify page range to generate from'}
              {contentType === 'smartTopics' && 'AI will extract and focus on key topics (feature coming soon)'}
            </p>
          </div>

          {/* Mind Map Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Map Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Hierarchical Button */}
              <button
                onClick={() => setSelectedMapType('hierarchical')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  selectedMapType === 'hierarchical'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <GitBranch className="w-5 h-5 mx-auto mb-1 text-accent-primary" />
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Hierarchical
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Tree
                </div>
              </button>

              {/* Radial Button */}
              <button
                onClick={() => setSelectedMapType('radial')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  selectedMapType === 'radial'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <Circle className="w-5 h-5 mx-auto mb-1 text-accent-primary" />
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Radial
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Circular
                </div>
              </button>

              {/* Concept Map Button */}
              <button
                onClick={() => setSelectedMapType('concept')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  selectedMapType === 'concept'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <Share2 className="w-5 h-5 mx-auto mb-1 text-accent-primary" />
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  Concept
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Network
                </div>
              </button>
            </div>
            {/* Type Description */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {selectedMapType === 'hierarchical' && 'Tree structure with parent-child relationships'}
              {selectedMapType === 'radial' && 'Circular layout with central concept'}
              {selectedMapType === 'concept' && 'Network structure with cross-links'}
            </p>
          </div>

          {/* First-time generation tip */}
          {existingMindMaps.length === 0 && !isGenerating && (
            <InfoTipBanner
              tipId="first_mindmap_generation"
              title="Building Your Mind Map"
              message="Creating a mind map takes 1-2 minutes. We'll analyze your document structure and extract key concepts to visualize."
              icon="clock"
              variant="info"
            />
          )}

          {/* Generate Button */}
          <button
            onClick={generateMindMap}
            disabled={isGenerating}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold text-base sm:text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Generate Mind Map</span>
              </>
            )}
          </button>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-accent-primary to-accent-secondary h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-center text-gray-600 dark:text-gray-400">
                {progressMessage || 'Analyzing document...'}
              </p>
              {progress > 0 && (
                <p className="text-xs text-center text-gray-500">
                  {progress}% complete
                </p>
              )}
            </div>
          )}
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
