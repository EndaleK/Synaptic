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

// Category color mapping
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },
  process: { bg: '#F0FDF4', border: '#10B981', text: '#065F46' },
  example: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  definition: { bg: '#FCE7F3', border: '#EC4899', text: '#9F1239' },
  principle: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
}

export default function MindMapViewer({ title, nodes, edges, documentText, onNodeClick }: MindMapViewerProps) {
  // State for detail panel
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [nodeDetails, setNodeDetails] = useState<NodeDetail | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)

  // Convert our node format to React Flow format
  const flowNodes: Node[] = useMemo(() => {
    return nodes.map((node, index) => {
      const colors = categoryColors[node.category || 'concept'] || categoryColors.concept

      // Calculate position based on level (hierarchical layout)
      const levelSpacing = 300
      const nodeSpacing = 150
      const nodesAtLevel = nodes.filter(n => n.level === node.level).length
      const indexAtLevel = nodes.filter(n => n.level === node.level).indexOf(node)

      return {
        id: node.id,
        type: 'default',
        position: {
          x: node.level * levelSpacing,
          y: (indexAtLevel - nodesAtLevel / 2) * nodeSpacing + 400
        },
        data: {
          label: (
            <div className="text-center px-3 py-2">
              <div className="font-semibold text-sm" style={{ color: colors.text }}>
                {node.label}
              </div>
              {node.description && (
                <div className="text-xs text-gray-600 mt-1 max-w-xs">
                  {node.description.substring(0, 60)}
                  {node.description.length > 60 ? '...' : ''}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: node.level === 0 ? '20px' : '12px',
          padding: '10px',
          minWidth: node.level === 0 ? '200px' : '150px',
          fontSize: node.level === 0 ? '16px' : '14px',
          boxShadow: node.level === 0 ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })
  }, [nodes])

  // Convert our edge format to React Flow format
  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'rgb(var(--accent-primary))', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgb(var(--accent-primary))',
      },
      label: edge.relationship !== 'contains' ? edge.relationship : '',
      labelStyle: { fill: '#666', fontSize: 10 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    }))
  }, [edges])

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

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
      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {nodes.length} concepts • {edges.length} connections
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

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const originalNode = nodes.find(n => n.id === node.id)
              const category = originalNode?.category || 'concept'
              return categoryColors[category]?.border || categoryColors.concept.border
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-gray-600 dark:text-gray-400 font-semibold">Categories:</span>
          {Object.entries(categoryColors).map(([category, colors]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
              />
              <span className="text-gray-700 dark:text-gray-300 capitalize">{category}</span>
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
