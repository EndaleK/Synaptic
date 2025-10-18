"use client"

import { useCallback, useMemo } from 'react'
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

interface MindMapViewerProps {
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  onNodeClick?: (node: MindMapNode) => void
}

// Category color mapping
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },
  process: { bg: '#F0FDF4', border: '#10B981', text: '#065F46' },
  example: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  definition: { bg: '#FCE7F3', border: '#EC4899', text: '#9F1239' },
  principle: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
}

export default function MindMapViewer({ title, nodes, edges, onNodeClick }: MindMapViewerProps) {
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

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const originalNode = nodes.find(n => n.id === node.id)
    if (originalNode && onNodeClick) {
      onNodeClick(originalNode)
    }
  }, [nodes, onNodeClick])

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
  )
}
