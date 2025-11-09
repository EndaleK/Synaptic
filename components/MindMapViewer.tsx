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
import { Download, Maximize2, RefreshCw } from 'lucide-react'
import html2canvas from 'html2canvas'
import type { MindMapNode, MindMapEdge, MindMapData } from '@/lib/mindmap-generator'
import type { TemplateType } from '@/lib/mindmap-templates'
import { layoutMindMap } from '@/lib/mindmap-layouts'
import { TEMPLATES, getAllTemplates } from '@/lib/mindmap-templates'
import MindMapDetailPanel from './MindMapDetailPanel'

interface MindMapViewerProps {
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  template?: TemplateType
  templateReason?: string
  documentText?: string
  onNodeClick?: (node: MindMapNode) => void
  onTemplateChange?: (template: TemplateType) => void
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

// Category color mapping with muted, professional palette for better readability
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: '#F1F5F9', border: '#64748B', text: '#334155' },       // Slate - Abstract ideas
  process: { bg: '#F3F4F6', border: '#6B7280', text: '#374151' },       // Gray - Procedures
  example: { bg: '#FAF5F0', border: '#78716C', text: '#44403C' },       // Stone - Illustrations
  definition: { bg: '#F5F3FF', border: '#8B7FB8', text: '#5B21B6' },    // Lavender - Terminology
  principle: { bg: '#FAF5FF', border: '#9F7AEA', text: '#6B21A8' },     // Soft Purple - Rules/Laws
  data: { bg: '#FEF6F5', border: '#A16E5E', text: '#7C2D12' },          // Terracotta - Statistics/Facts
  technique: { bg: '#F0F7FA', border: '#5B8A9F', text: '#164E63' },     // Ocean Blue - Skills/Tools
  outcome: { bg: '#FAF8F5', border: '#9A7B64', text: '#78350F' },       // Warm Copper - Results/Benefits
}

export default function MindMapViewer({
  title,
  nodes = [],
  edges = [],
  template: initialTemplate = 'hierarchical',
  templateReason,
  documentText,
  onNodeClick,
  onTemplateChange
}: MindMapViewerProps) {
  // State for template switching
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>(initialTemplate);

  // Debug logging
  React.useEffect(() => {
    console.log('[MindMapViewer] Initialized with:', {
      title,
      nodeCount: nodes?.length || 0,
      edgeCount: edges?.length || 0,
      template: currentTemplate,
      templateReason,
    })
  }, [title, nodes, edges, currentTemplate, templateReason])

  // State for detail panel
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [nodeDetails, setNodeDetails] = useState<NodeDetail | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)

  // Handle template change
  const handleTemplateChange = (newTemplate: TemplateType) => {
    setCurrentTemplate(newTemplate);
    if (onTemplateChange) {
      onTemplateChange(newTemplate);
    }
  };

  // PHASE 2.3: Calculate cross-link count for knowledge integration display
  const crossLinkCount = useMemo(() => {
    if (!edges || edges.length === 0) return 0;

    return edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.from);
      const targetNode = nodes.find(n => n.id === edge.to);
      // Cross-link = levels differ by more than 1
      return sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;
    }).length;
  }, [edges, nodes]);

  // Convert to ReactFlow nodes and edges using template-specific layout
  const { flowNodes, flowEdges } = useMemo(() => {
    console.log('[MindMapViewer] Applying layout with template:', currentTemplate)

    // Guard clause: return empty if no nodes
    if (!nodes || nodes.length === 0) {
      console.log('[MindMapViewer] No nodes to layout')
      return { flowNodes: [], flowEdges: [] }
    }

    // Create MindMapData structure for layout function
    const mindMapData: MindMapData = {
      title,
      nodes,
      edges,
      template: currentTemplate,
      templateReason,
      metadata: {
        totalNodes: nodes.length,
        maxDepth: Math.max(...nodes.map(n => n.level)),
        categories: Array.from(new Set(nodes.map(n => n.category).filter(Boolean) as string[]))
      }
    };

    // Apply template-specific layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutMindMap(mindMapData);

    console.log('[MindMapViewer] Layout complete:', {
      nodesCount: layoutedNodes.length,
      edgesCount: layoutedEdges.length
    });

    return { flowNodes: layoutedNodes, flowEdges: layoutedEdges }
  }, [nodes, edges, currentTemplate, title, templateReason])

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  // Update React Flow nodes/edges when layout changes
  React.useEffect(() => {
    console.log('[MindMapViewer] Updating nodes and edges', {
      flowNodesLength: flowNodes.length,
      flowEdgesLength: flowEdges.length
    })
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

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

        /* PHASE 2.3: Cross-Link Pulse Animation (Research-Backed Enhancement) */
        /* Cross-links show knowledge integration - make them visually prominent */
        @keyframes crossLinkPulse {
          0%, 100% {
            stroke-width: 4px;
            opacity: 1;
          }
          50% {
            stroke-width: 5px;
            opacity: 0.8;
          }
        }

        /* Apply subtle pulse to cross-link edges (dashed orange edges) */
        .react-flow__edge-path[stroke-dasharray]:not([stroke-dasharray=""]) {
          animation: crossLinkPulse 2s ease-in-out infinite;
        }

        /* Enhanced pulse on hover */
        .react-flow__edge:hover .react-flow__edge-path[stroke-dasharray]:not([stroke-dasharray=""]) {
          animation: crossLinkPulse 0.8s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.6));
        }

        /* Dim other edges when hovering a cross-link */
        .react-flow__edge:hover ~ .react-flow__edge:not(:hover) .react-flow__edge-path:not([stroke-dasharray]) {
          opacity: 0.3;
          transition: opacity 0.3s ease;
        }
      `}</style>
      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col">
        {/* Compact Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
        <div className="flex items-center justify-between gap-3">
          {/* Title and Stats */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-black dark:text-white truncate">{title}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                <span>{nodes?.length || 0} concepts • {edges?.length || 0} connections</span>
                {/* PHASE 2.3: Cross-Link Count Badge (Knowledge Integration Indicator) */}
                {crossLinkCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-600"
                    title="Cross-links show knowledge integration across different branches - a key indicator of deeper understanding"
                  >
                    <span className="text-orange-600 dark:text-orange-400">⚡</span>
                    {crossLinkCount} cross-link{crossLinkCount !== 1 ? 's' : ''}
                  </span>
                )}
                {templateReason && (
                  <span className="ml-1 italic text-gray-500">
                    {TEMPLATES[currentTemplate]?.metadata.icon} {templateReason}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Export Buttons - Compact */}
          <div className="flex gap-1.5">
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as PNG"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as JSON"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Template Switcher - Compact */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {['hierarchical', 'flowchart', 'timeline'].map((templateType) => {
              const template = TEMPLATES[templateType as TemplateType];
              const isActive = currentTemplate === templateType;
              return (
                <button
                  key={templateType}
                  onClick={() => handleTemplateChange(templateType as TemplateType)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={template.metadata.description}
                >
                  <span className="text-sm">{template.metadata.icon}</span>
                  <span className="hidden sm:inline">{template.metadata.name}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block truncate">
            {TEMPLATES[currentTemplate]?.metadata.description}
          </div>
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
              padding: 0.15,
              includeHiddenNodes: false,
              minZoom: 0.6,
              maxZoom: 1.2,
              duration: 200,
            }}
            attributionPosition="bottom-right"
            minZoom={0.2}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
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
            nodeOrigin={[0.5, 0.5]}
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

      {/* Compact Legend */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950/30">
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* Tip */}
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="font-semibold">💡</span>
            <span className="hidden md:inline">Click nodes to explore details</span>
          </div>

          {/* Edge Types - PHASE 2.3: Enhanced Cross-Link Visibility */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-6 h-1 rounded" style={{ backgroundColor: '#64748B' }}></div>
              <span className="text-gray-700 dark:text-gray-300 hidden sm:inline">Hierarchy</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700" title="Cross-links show knowledge integration across branches">
              <div className="w-6 h-0.5 border-t-2 border-dashed rounded" style={{ borderColor: '#FF6B35' }}></div>
              <span className="text-orange-700 dark:text-orange-300 font-medium hidden sm:inline">Cross-link ⚡</span>
            </div>
          </div>

          {/* Category Legend - Compact */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-600 dark:text-gray-400 font-semibold hidden lg:inline">Categories:</span>
            {Object.entries(categoryColors).slice(0, 4).map(([category, colors]) => (
              <div key={category} className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bg }}>
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ border: `1.5px solid ${colors.border}` }}
                />
                <span className="font-medium capitalize text-xs hidden xl:inline" style={{ color: colors.text }}>{category}</span>
              </div>
            ))}
          </div>
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
