"use client"

import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Download, Maximize2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import type { MindMapNode, MindMapEdge } from '@/lib/mindmap-generator'
import MindMapDetailPanel from './MindMapDetailPanel'

interface MindMapViewerProps {
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  documentText?: string
  onNodeClick?: (node: MindMapNode) => void
}

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

// Category color mapping with enhanced palette for better readability
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },       // Blue - Abstract ideas
  process: { bg: '#F0FDF4', border: '#10B981', text: '#065F46' },       // Green - Procedures
  example: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },       // Amber - Illustrations
  definition: { bg: '#FCE7F3', border: '#EC4899', text: '#9F1239' },    // Pink - Terminology
  principle: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },     // Purple - Rules/Laws
  data: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },          // Red - Statistics/Facts
  technique: { bg: '#ECFDF5', border: '#14B8A6', text: '#134E4A' },     // Teal - Skills/Tools
  outcome: { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },       // Orange - Results/Benefits
}

export default function MindMapViewer({ title, nodes = [], edges = [], documentText, onNodeClick }: MindMapViewerProps) {
  // Debug logging
  React.useEffect(() => {
    console.log('[MindMapViewer] Initialized with:', {
      title,
      nodeCount: nodes?.length || 0,
      edgeCount: edges?.length || 0,
      nodes: nodes?.slice(0, 3) || [], // First 3 nodes
      edges: edges?.slice(0, 3) || [], // First 3 edges
    })
  }, [title, nodes, edges])

  // State for detail panel
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [nodeDetails, setNodeDetails] = useState<NodeDetail | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)

  // Convert our node format to React Flow format
  const flowNodes: Node[] = useMemo(() => {
    console.log('[MindMapViewer] flowNodes useMemo triggered', {
      nodesExists: !!nodes,
      nodesIsArray: Array.isArray(nodes),
      nodesLength: nodes?.length,
      nodesType: typeof nodes,
      firstNode: nodes?.[0]
    })

    // Guard clause: return empty array if nodes is undefined or empty
    if (!nodes || nodes.length === 0) {
      console.log('[MindMapViewer] No nodes to convert, returning empty array')
      return []
    }

    console.log('[MindMapViewer] Converting', nodes.length, 'nodes to React Flow format')

    const converted = nodes.map((node, index) => {
      const colors = categoryColors[node.category || 'concept'] || categoryColors.concept

      // Enhanced hierarchical layout with better spacing
      const levelSpacing = 500  // Horizontal spacing between levels (increased)
      const nodeSpacing = 280  // Vertical spacing between nodes (increased for readability)

      // Get all nodes at this level
      const nodesAtLevel = nodes.filter(n => n.level === node.level)
      const indexAtLevel = nodesAtLevel.indexOf(node)

      // Simple vertical centering with better distribution
      const totalAtLevel = nodesAtLevel.length
      const yPosition = (indexAtLevel - (totalAtLevel - 1) / 2) * nodeSpacing

      return {
        id: node.id,
        type: 'default',
        position: {
          x: node.level * levelSpacing,
          y: yPosition
        },
        data: {
          label: (
            <div className="text-center px-5 py-4">
              <div
                className={`font-bold ${node.level === 0 ? 'text-lg' : node.level === 1 ? 'text-base' : 'text-sm'} leading-snug`}
                style={{ color: colors.text }}
              >
                {node.label}
              </div>
              {node.description && node.description.trim() && (
                <div className={`text-sm text-gray-700 dark:text-gray-600 mt-2 leading-relaxed font-medium ${node.level === 0 ? 'max-w-sm' : 'max-w-xs'}`}>
                  {node.description.substring(0, node.level === 0 ? 120 : 80)}
                  {(node.description?.length || 0) > (node.level === 0 ? 120 : 80) ? '...' : ''}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: colors.bg,
          border: `4px solid ${colors.border}`,
          borderRadius: node.level === 0 ? '28px' : node.level === 1 ? '20px' : '16px',
          padding: node.level === 0 ? '20px' : '16px',
          minWidth: node.level === 0 ? '300px' : node.level === 1 ? '240px' : '200px',
          maxWidth: node.level === 0 ? '400px' : node.level === 1 ? '320px' : '280px',
          fontSize: node.level === 0 ? '18px' : '16px',
          boxShadow: node.level === 0
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : node.level === 1
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        className: 'mindmap-node hover:scale-105 hover:shadow-2xl active:scale-95',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })

    console.log('[MindMapViewer] Converted nodes complete:', {
      convertedLength: converted.length,
      firstConverted: converted[0],
      hasPosition: !!converted[0]?.position,
      hasData: !!converted[0]?.data
    })

    return converted
  }, [nodes])

  // Convert our edge format to React Flow format with enhanced readability
  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => {
      // Determine if this is a cross-link (connects nodes at different branches/levels)
      const sourceNode = nodes.find(n => n.id === edge.from)
      const targetNode = nodes.find(n => n.id === edge.to)
      const isCrossLink = sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: isCrossLink ? 'default' : 'smoothstep', // Use straight lines for cross-links
        animated: !isCrossLink, // Only animate hierarchical edges
        style: {
          stroke: isCrossLink ? '#F97316' : '#3B82F6', // Orange for cross-links, blue for hierarchy
          strokeWidth: isCrossLink ? 3 : 2.5,
          strokeDasharray: isCrossLink ? '8 6' : undefined, // Dashed for cross-links
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCrossLink ? '#F97316' : '#3B82F6',
          width: 20,
          height: 20,
        },
        label: edge.relationship,
        labelStyle: {
          fill: '#1F2937',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.015em'
        },
        labelBgStyle: {
          fill: isCrossLink ? '#FFF7ED' : '#EBF5FF',
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [8, 12] as [number, number],
        labelBgBorderRadius: 6,
      }
    })
  }, [edges, nodes])

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  // Update React Flow nodes/edges when flowNodes/flowEdges change
  React.useEffect(() => {
    console.log('[MindMapViewer] Updating reactFlowNodes', {
      flowNodesLength: flowNodes.length,
      currentReactFlowNodesLength: reactFlowNodes.length
    })
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  React.useEffect(() => {
    console.log('[MindMapViewer] Updating reactFlowEdges', {
      flowEdgesLength: flowEdges.length,
      currentReactFlowEdgesLength: reactFlowEdges.length
    })
    setEdges(flowEdges)
  }, [flowEdges, setEdges])

  const handleNodeClick = useCallback(async (_event: React.MouseEvent, node: Node) => {
    console.log('[MindMapViewer] Node clicked:', node.id)
    const originalNode = nodes.find(n => n.id === node.id)
    if (!originalNode) {
      console.log('[MindMapViewer] Original node not found for:', node.id)
      return
    }

    console.log('[MindMapViewer] Opening panel for:', originalNode.label)

    // Call the optional callback if provided
    if (onNodeClick) {
      onNodeClick(originalNode)
    }

    // Get node position from the DOM
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect()
      setSelectedNodePosition({
        x: rect.right,
        y: rect.top + rect.height / 2
      })
    }

    // Open panel and fetch details
    setSelectedNode(originalNode)
    setIsPanelOpen(true)
    setIsLoadingDetails(true)
    setNodeDetails(null)

    console.log('[MindMapViewer] Fetching details from API...')
    try {
      const response = await fetch('/api/mindmap/expand-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: originalNode.id,
          nodeLabel: originalNode.label,
          nodeDescription: originalNode.description,
          documentText: documentText || ''
        })
      })

      if (!response.ok) {
        console.error('[MindMapViewer] API response not ok:', response.status)
        throw new Error('Failed to fetch node details')
      }

      const data = await response.json()
      console.log('[MindMapViewer] Received data:', data)
      setNodeDetails({
        expandedExplanation: data.expandedExplanation,
        quotes: data.quotes || [],
        examples: data.examples || []
      })
    } catch (error) {
      console.error('[MindMapViewer] Error fetching node details:', error)
      setNodeDetails(null)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [nodes, documentText, onNodeClick])

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setSelectedNode(null)
    setNodeDetails(null)
    setSelectedNodePosition(null)
  }, [])

  // Export as PNG
  const handleExportPNG = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      const canvas = await html2canvas(flowElement, {
        backgroundColor: '#ffffff',
        scale: 2
      })

      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_mindmap.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to export mind map:', error)
      alert('Failed to export mind map as PNG')
    }
  }, [title])

  // Export as JSON
  const handleExportJSON = useCallback(() => {
    const data = { title, nodes, edges }
    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const link = document.createElement('a')
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_mindmap.json`
    link.href = dataUri
    link.click()
  }, [title, nodes, edges])

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        .react-flow-controls {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }

        .react-flow-controls button {
          background-color: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
          color: #1e293b !important;
          cursor: pointer !important;
          height: 36px !important;
          width: 36px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .react-flow-controls button:hover {
          background-color: #f8fafc !important;
          box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.15) !important;
        }

        .react-flow-controls svg {
          width: 16px !important;
          height: 16px !important;
        }
      `}</style>
      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">{title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {nodes?.length || 0} concepts • {edges?.length || 0} connections
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as PNG"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as JSON"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>
        </div>

        {/* Interaction Guide */}
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1">
            <span className="font-semibold">🖱️ Scroll:</span> Zoom
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold">🖱️ Drag:</span> Pan
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold">Click:</span> Node Details
          </span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        {(reactFlowNodes?.length ?? 0) > 0 ? (
          <ReactFlow
            nodes={reactFlowNodes}
            edges={reactFlowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{
              padding: 0.2,
              includeHiddenNodes: false,
              minZoom: 0.5,
              maxZoom: 1.5,
            }}
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={2}
            defaultZoom={0.8}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnDrag={true}
            selectNodesOnDrag={false}
            zoomOnDoubleClick={false}
            preventScrolling={true}
            proOptions={{ hideAttribution: false }}
          >
            <Background
              color="#cbd5e1"
              gap={20}
              size={1}
              style={{ backgroundColor: '#f8fafc' }}
            />
            <Controls
              showZoom={true}
              showFitView={true}
              showInteractive={true}
              position="bottom-left"
              className="react-flow-controls"
            />
            <MiniMap
              nodeColor={(node) => {
                const originalNode = nodes.find(n => n.id === node.id)
                const category = originalNode?.category || 'concept'
                return categoryColors[category]?.border || categoryColors.concept.border
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              position="bottom-right"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              }}
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-2">No nodes to display</div>
              <div className="text-sm text-gray-500">The concept map appears to be empty</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Instructions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950/30">
        {/* Instructions */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
            <span className="text-blue-700 dark:text-blue-300 font-semibold">💡 Tip:</span>
            <span className="text-blue-600 dark:text-blue-400">Click any concept to expand and explore details</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Hierarchy</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
              <div className="w-8 h-0.5 bg-orange-500 border-t-2 border-dashed border-orange-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Cross-link</span>
            </div>
          </div>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-gray-600 dark:text-gray-400 font-semibold mr-1">Categories:</span>
          {Object.entries(categoryColors).map(([category, colors]) => (
            <div key={category} className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: colors.bg }}>
              <div
                className="w-3 h-3 rounded-sm"
                style={{ border: `2px solid ${colors.border}` }}
              />
              <span className="font-medium capitalize" style={{ color: colors.text }}>{category}</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Detail Panel */}
      <MindMapDetailPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        nodeLabel={selectedNode?.label || ''}
        nodeDescription={selectedNode?.description}
        nodeDetails={nodeDetails}
        isLoading={isLoadingDetails}
        selectedNodePosition={selectedNodePosition}
      />

      {/* Connection Line */}
      {isPanelOpen && selectedNodePosition && (
        <svg
          className="fixed inset-0 pointer-events-none z-45"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L0,6 L9,3 z"
                fill="rgb(var(--accent-primary))"
              />
            </marker>
          </defs>
          <path
            d={(() => {
              // Calculate Bézier curve from node to panel (default compact mode: 384px)
              const startX = selectedNodePosition.x
              const startY = selectedNodePosition.y
              // Mobile: full width, Tablet+: 384px compact panel width
              const panelWidth = window.innerWidth <= 768 ? window.innerWidth : 384
              const endX = window.innerWidth - panelWidth + 24 // 24px padding from edge
              const endY = 140 // Panel header area

              // Control point for smooth curve
              const controlX = startX + (endX - startX) * 0.65
              const controlY = startY

              return `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`
            })()}
            stroke="rgb(var(--accent-primary))"
            strokeWidth="2"
            fill="none"
            strokeDasharray="8 4"
            filter="url(#glow)"
            markerEnd="url(#arrowhead)"
            style={{
              animation: 'dashAnimation 20s linear infinite'
            }}
          />
        </svg>
      )}
    </div>
  )
}
