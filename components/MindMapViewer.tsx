"use client"

import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeToolbar,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Handle } from '@xyflow/react'
import { Download, Maximize2, RefreshCw, ArrowLeft, BookmarkPlus, BookmarkCheck, Save, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { MindMapNode, MindMapEdge, MindMapData } from '@/lib/mindmap-generator'
import type { TemplateType } from '@/lib/mindmap-templates'
import { layoutMindMap } from '@/lib/mindmap-layouts'
import { TEMPLATES, getAllTemplates } from '@/lib/mindmap-templates'
import MindMapDetailPanel from './MindMapDetailPanel'
import { useToast } from '@/components/ToastContainer'

interface MindMapViewerProps {
  mindmapId?: string  // Database ID for saving edits
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  template?: TemplateType
  templateReason?: string
  documentText?: string
  documentId?: string  // NEW: Document ID for reloading document text
  mapType?: 'hierarchical' | 'radial' | 'concept'  // NEW: Mind map type for layout selection
  onNodeClick?: (node: MindMapNode) => void
  onTemplateChange?: (template: TemplateType) => void
  onReloadDocumentText?: () => Promise<void>  // NEW: Callback to reload document text
}

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

// PHASE 3.1: WCAG AA Compliant Category Colors (Research-Backed)
// Updated to match accessible node colors with proper contrast ratios
// Border colors match the new WCAG-compliant node backgrounds
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: '#EFF6FC', border: '#4A7BA7', text: '#1E3A52' },       // Accessible Blue - Abstract ideas (9.2:1)
  process: { bg: '#E8F8F2', border: '#3AAA7A', text: '#1A5A43' },       // Accessible Teal - Procedures (8.7:1)
  example: { bg: '#FCE8F3', border: '#C75B9B', text: '#6B1E52' },       // Accessible Rose - Illustrations (7.9:1)
  definition: { bg: '#F3ECFF', border: '#9370DB', text: '#4B2D80' },    // Accessible Lavender - Terminology (8.1:1)
  principle: { bg: '#EFE8FF', border: '#7C5BBF', text: '#3D2A66' },     // Accessible Purple - Rules/Laws (8.5:1)
  data: { bg: '#EBF3FC', border: '#5B8FCC', text: '#1E3D5C' },          // Accessible Sky Blue - Facts/Metrics (8.9:1)
  technique: { bg: '#FFF8E6', border: '#D4A017', text: '#5C4A0A' },     // Accessible Gold - Skills/Tools (9.6:1)
  outcome: { bg: '#FCF0EC', border: '#C8704F', text: '#6B3623' },       // Accessible Coral - Results/Benefits (8.3:1)
}

// Custom node component to ensure labels display correctly with proper styling
function CustomNode({ data, style }: NodeProps) {
  console.log('[CustomNode] Rendering:', { label: data.label, style });

  return (
    <div style={{
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      minWidth: '100px',  // EMERGENCY: Force minimum dimensions
      minHeight: '40px',  // EMERGENCY: Force minimum dimensions
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ whiteSpace: style?.whiteSpace || 'normal', wordWrap: 'break-word', width: '100%' }}>
        {data.label || 'NO LABEL'}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = {
  default: CustomNode,
}

export default function MindMapViewer({
  mindmapId,
  title,
  nodes = [],
  edges = [],
  template: initialTemplate = 'hierarchical',
  templateReason,
  documentText,
  documentId, // NEW: Document ID for reloading
  mapType, // NEW: Mind map type for layout selection
  onNodeClick,
  onTemplateChange,
  onReloadDocumentText // NEW: Reload callback
}: MindMapViewerProps) {
  // Next.js router for navigation
  const router = useRouter()
  const toast = useToast()

  // State for template switching
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>(initialTemplate);

  // State to track if mind map has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaved, setIsSaved] = useState(true) // Mind maps are auto-saved during generation

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

  // PHASE 2.4: State for edge tooltips
  const [edgeTooltip, setEdgeTooltip] = useState<{ text: string; x: number; y: number; isCrossLink: boolean } | null>(null)

  // PHASE 3.4: State for export legend visibility
  const [showExportLegend, setShowExportLegend] = useState(false)

  // PHASE 4.1: State for collapsed nodes (progressive disclosure)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  // PHASE 4.2: State for focus mode (highlight branch + cross-links)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  // State for compact legend visibility (hidden by default to maximize viewing space)
  const [showLegend, setShowLegend] = useState(false)

  // State for saving
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Handle template change
  const handleTemplateChange = (newTemplate: TemplateType) => {
    setCurrentTemplate(newTemplate);
    setHasUnsavedChanges(true);
    setIsSaved(false);
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

    // Apply template-specific layout with mapType priority
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutMindMap(mindMapData, mapType);

    console.log('[MindMapViewer] Layout complete:', {
      nodesCount: layoutedNodes.length,
      edgesCount: layoutedEdges.length
    });

    return { flowNodes: layoutedNodes, flowEdges: layoutedEdges }
  }, [nodes, edges, currentTemplate, title, templateReason])

  const [reactFlowNodes, setNodes, onNodesChangeBase] = useNodesState(flowNodes)
  const [reactFlowEdges, setEdges, onEdgesChangeBase] = useEdgesState(flowEdges)

  // Wrap node and edge change handlers to track unsaved changes
  const onNodesChange = useCallback((changes: any) => {
    onNodesChangeBase(changes)
    // Only mark as unsaved for actual changes (not just selection changes)
    const hasActualChanges = changes.some((change: any) =>
      change.type !== 'select' && change.type !== 'reset'
    )
    if (hasActualChanges) {
      setHasUnsavedChanges(true)
      setIsSaved(false)
    }
  }, [onNodesChangeBase])

  const onEdgesChange = useCallback((changes: any) => {
    onEdgesChangeBase(changes)
    // Only mark as unsaved for actual changes (not just selection changes)
    const hasActualChanges = changes.some((change: any) =>
      change.type !== 'select' && change.type !== 'reset'
    )
    if (hasActualChanges) {
      setHasUnsavedChanges(true)
      setIsSaved(false)
    }
  }, [onEdgesChangeBase])

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

    // PHASE 4.2: Toggle focus mode (if same node clicked again, clear focus; otherwise set focus)
    if (focusedNodeId === node.id) {
      setFocusedNodeId(null) // Clear focus
    } else {
      setFocusedNodeId(node.id) // Set focus
    }

    // Call the optional callback if provided
    if (onNodeClick) {
      onNodeClick(originalNode)
    }

    // BUG FIX: If no document text is available, show a helpful message instead of trying to expand
    if (!documentText || documentText.trim().length === 0) {
      console.log('[MindMapViewer] No document text available - skipping node expansion')
      setSelectedNode(originalNode)
      setIsPanelOpen(true)
      setIsLoadingDetails(false)
      setNodeDetails({
        expandedExplanation: `## ⚠️ Detailed Explanation Unavailable

The document text for this mind map is not currently loaded. This could happen if:
- The mind map was saved without document text
- The original document was deleted or moved
- There was an error loading the document

## What You're Missing

When document text is available, clicking a node provides:

• **Deeper Explanations**: AI-generated elaboration on the concept with additional context
• **Source Quotes**: Direct excerpts from your document that support this concept
• **Concrete Examples**: Real-world applications or scenarios from your material
• **Citation Context**: Surrounding text that shows how the concept fits into the broader narrative

## How to Fix This

${documentId && onReloadDocumentText ?
`**Try reloading the document text**: Click the "Reload Document Text" button in the panel to attempt loading the text from your documents library.

If that doesn't work:` : ''}

1. **Generate Fresh**: Create a new mind map directly from the document (this loads the full text into memory)
2. **Keep Tab Open**: When initially generating a mind map, keep the generation tab open to explore nodes immediately

${!documentId || !onReloadDocumentText ? '**Note**: Open the browser console (F12) to see detailed error logs that may help diagnose the issue.' : ''}`,
        quotes: [],
        examples: [],
        hasDocumentText: false,
        canReload: !!(documentId && onReloadDocumentText)
      })
      return
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
          documentText: documentText
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
  }, [nodes, documentText, onNodeClick, focusedNodeId])

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setSelectedNode(null)
    setNodeDetails(null)
    setSelectedNodePosition(null)
  }, [])

  // PHASE 4.1: Toggle collapse state for a node
  const toggleNodeCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // PHASE 4.1: Get all descendant node IDs (children, grandchildren, etc.)
  const getDescendants = useCallback((nodeId: string): Set<string> => {
    const descendants = new Set<string>()
    const queue = [nodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      edges.forEach(edge => {
        if (edge.from === current && !descendants.has(edge.to)) {
          descendants.add(edge.to)
          queue.push(edge.to)
        }
      })
    }

    return descendants
  }, [edges])

  // PHASE 4.2: Get all ancestor node IDs (parent, grandparent, etc.)
  const getAncestors = useCallback((nodeId: string): Set<string> => {
    const ancestors = new Set<string>()
    let current = nodeId

    while (current) {
      const parentEdge = edges.find(edge => edge.to === current)
      if (parentEdge) {
        ancestors.add(parentEdge.from)
        current = parentEdge.from
      } else {
        break
      }
    }

    return ancestors
  }, [edges])

  // PHASE 4.2: Get entire focused branch (node + ancestors + descendants)
  const getFocusedBranch = useCallback((nodeId: string): Set<string> => {
    const branch = new Set<string>()
    branch.add(nodeId) // Add the focused node itself

    // Add all ancestors
    const ancestors = getAncestors(nodeId)
    ancestors.forEach(id => branch.add(id))

    // Add all descendants
    const descendants = getDescendants(nodeId)
    descendants.forEach(id => branch.add(id))

    return branch
  }, [getAncestors, getDescendants])

  // PHASE 4.2: Get nodes connected via cross-links to the focused branch
  const getCrossLinkConnectedNodes = useCallback((branchNodes: Set<string>): Set<string> => {
    const connected = new Set<string>()

    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.from)
      const targetNode = nodes.find(n => n.id === edge.to)

      // Check if it's a cross-link (levels differ by more than 1)
      if (sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1) {
        // If either end is in the branch, add the other end
        if (branchNodes.has(edge.from) && !branchNodes.has(edge.to)) {
          connected.add(edge.to)
        }
        if (branchNodes.has(edge.to) && !branchNodes.has(edge.from)) {
          connected.add(edge.from)
        }
      }
    })

    return connected
  }, [edges, nodes])

  // PHASE 4.1: Filter nodes and edges based on collapsed state
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (collapsedNodes.size === 0) {
      return { visibleNodes: reactFlowNodes, visibleEdges: reactFlowEdges }
    }

    // Find all hidden node IDs (descendants of collapsed nodes)
    const hiddenNodeIds = new Set<string>()
    collapsedNodes.forEach(collapsedNodeId => {
      const descendants = getDescendants(collapsedNodeId)
      descendants.forEach(id => hiddenNodeIds.add(id))
    })

    // Filter nodes
    const filteredNodes = reactFlowNodes.filter(node => !hiddenNodeIds.has(node.id))

    // Filter edges (hide edges to/from hidden nodes)
    const filteredEdges = reactFlowEdges.filter(edge =>
      !hiddenNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.target)
    )

    return { visibleNodes: filteredNodes, visibleEdges: filteredEdges }
  }, [reactFlowNodes, reactFlowEdges, collapsedNodes, getDescendants])

  // PHASE 4.2: Calculate focused nodes and edges for focus mode
  const { focusedNodeIds, focusedEdgeIds } = useMemo(() => {
    if (!focusedNodeId) {
      return { focusedNodeIds: null, focusedEdgeIds: null }
    }

    // Get the main branch (node + ancestors + descendants)
    const branch = getFocusedBranch(focusedNodeId)

    // Get cross-link connected nodes
    const crossLinkNodes = getCrossLinkConnectedNodes(branch)

    // Combine all focused nodes
    const allFocusedNodes = new Set([...branch, ...crossLinkNodes])

    // Get focused edges (edges connected to focused nodes)
    const focusedEdges = new Set<string>()
    edges.forEach(edge => {
      // Include edge if either end is in focused nodes
      if (allFocusedNodes.has(edge.from) || allFocusedNodes.has(edge.to)) {
        const edgeId = `${edge.from}-${edge.to}`
        focusedEdges.add(edgeId)
      }
    })

    return { focusedNodeIds: allFocusedNodes, focusedEdgeIds: focusedEdges }
  }, [focusedNodeId, getFocusedBranch, getCrossLinkConnectedNodes, edges])

  // PHASE 4.2: Apply focus styling to nodes
  const styledNodes = useMemo(() => {
    if (!focusedNodeIds) {
      return visibleNodes // No focus mode active
    }

    return visibleNodes.map(node => {
      const isFocused = focusedNodeIds.has(node.id)
      const isMainFocus = node.id === focusedNodeId

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isFocused ? 1 : 0.2,
          filter: isMainFocus ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))' : isFocused ? 'none' : 'grayscale(0.5)',
          transition: 'all 0.3s ease',
        },
        className: node.className + (isMainFocus ? ' ring-4 ring-blue-500 ring-opacity-50' : ''),
      }
    })
  }, [visibleNodes, focusedNodeIds, focusedNodeId])

  // PHASE 4.2: Apply focus styling to edges
  const styledEdges = useMemo(() => {
    if (!focusedEdgeIds) {
      return visibleEdges // No focus mode active
    }

    return visibleEdges.map(edge => {
      const edgeId = `${edge.source}-${edge.target}`
      const isFocused = focusedEdgeIds.has(edgeId)

      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isFocused ? 1 : 0.15,
          transition: 'all 0.3s ease',
        },
        animated: isFocused && edge.animated, // Only animate focused edges
      }
    })
  }, [visibleEdges, focusedEdgeIds])

  // PHASE 2.4: Edge tooltip handlers
  const handleEdgeMouseEnter = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (edge.data?.tooltip) {
      const edgeElement = document.querySelector(`[data-id="${edge.id}"]`) as HTMLElement
      if (edgeElement) {
        const rect = edgeElement.getBoundingClientRect()
        setEdgeTooltip({
          text: edge.data.tooltip,
          x: rect.left + rect.width / 2,
          y: rect.top,
          isCrossLink: edge.data.isCrossLink || false,
        })
      }
    }
  }, [])

  const handleEdgeMouseLeave = useCallback(() => {
    setEdgeTooltip(null)
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
      toast.error('Failed to export mind map as PNG')
    }
  }, [title, toast])

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

  // PHASE 3.4: Export as PDF with embedded legend
  const handleExportPDF = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      // Show legend for export
      setShowExportLegend(true)

      // Wait for legend to render
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await html2canvas(flowElement, {
        backgroundColor: '#ffffff',
        scale: 2
      })

      // Hide legend after capture
      setShowExportLegend(false)

      // Create PDF with landscape orientation for better fit
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

      // Download PDF
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '_')}_mindmap.pdf`)
    } catch (error) {
      setShowExportLegend(false)
      console.error('Failed to export mind map as PDF:', error)
      toast.error('Failed to export mind map as PDF')
    }
  }, [title, toast])

  // PHASE 3.4: Export as SVG with embedded legend
  // Handle save mind map
  const handleSave = useCallback(async () => {
    if (!mindmapId) {
      console.warn('Cannot save: no mindmap ID provided')
      setSaveMessage('Mind map is already saved')
      setTimeout(() => setSaveMessage(null), 2000)
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Save current mind map state to database
      const response = await fetch(`/api/mindmaps/${mindmapId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          nodes: flowNodes.map(node => ({
            id: node.id,
            label: node.data.label,
            description: node.data.description || '',
            type: node.data.type || 'concept',
            level: node.data.level || 0
          })),
          edges: flowEdges.map(edge => ({
            source: edge.source,
            target: edge.target,
            relationship: edge.data?.relationship || '',
            isCrossLink: edge.data?.isCrossLink || false
          })),
          layout_data: {
            template: currentTemplate
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save mind map')
      }

      setIsSaved(true)
      setHasUnsavedChanges(false)
      setSaveMessage('Mind map saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Error saving mind map:', error)
      setSaveMessage('Failed to save mind map')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }, [mindmapId, title, flowNodes, flowEdges, currentTemplate])

  const handleExportSVG = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      // Show legend for export
      setShowExportLegend(true)

      // Wait for legend to render
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clone the element
      const clonedElement = flowElement.cloneNode(true) as HTMLElement

      // Create SVG wrapper
      const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const bbox = flowElement.getBoundingClientRect()
      svgWrapper.setAttribute('width', bbox.width.toString())
      svgWrapper.setAttribute('height', bbox.height.toString())
      svgWrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

      // Convert HTML to SVG foreign object
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
      foreignObject.setAttribute('width', '100%')
      foreignObject.setAttribute('height', '100%')
      foreignObject.appendChild(clonedElement)
      svgWrapper.appendChild(foreignObject)

      // Serialize SVG
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgWrapper)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      // Download SVG
      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_mindmap.svg`
      link.href = url
      link.click()

      // Clean up
      URL.revokeObjectURL(url)
      setShowExportLegend(false)
    } catch (error) {
      setShowExportLegend(false)
      console.error('Failed to export mind map as SVG:', error)
      toast.error('Failed to export mind map as SVG')
    }
  }, [title, toast])

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

        /* PHASE 2.4: Educational Edge Tooltips (Research-Backed) */
        /* Tooltips reinforce complete propositions for better learning */
        .react-flow__edge {
          position: relative;
        }

        /* Tooltip container appears on edge hover */
        .react-flow__edge:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 12px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          white-space: normal;
          max-width: 280px;
          text-align: center;
          line-height: 1.4;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 8px;
          animation: tooltipFadeIn 0.2s ease-out;
        }

        /* Tooltip arrow */
        .react-flow__edge:hover::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #1f2937;
          pointer-events: none;
          z-index: 1001;
          margin-bottom: 2px;
          animation: tooltipFadeIn 0.2s ease-out;
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        /* Special styling for cross-link tooltips */
        .react-flow__edge[data-cross-link="true"]:hover::after {
          background: linear-gradient(135deg, #EA580C 0%, #FB923C 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .react-flow__edge[data-cross-link="true"]:hover::before {
          border-top-color: #EA580C;
        }
      `}</style>
      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col">
        {/* Compact Header */}
      <div className="px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
        <div className="flex items-center justify-between gap-3">
          {/* Back Button + Title and Stats */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Back to Mind Map Home Button */}
            <button
              onClick={() => router.push('/dashboard?mode=mindmap')}
              className="flex items-center gap-1 px-1.5 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow"
              title="Back to mind map home"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-black dark:text-white truncate leading-tight">{title}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap leading-tight">
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

          {/* PHASE 4.2: Focus Mode Indicator and Clear Button */}
          {focusedNodeId && (
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-500 dark:border-blue-600 rounded text-xs font-medium text-blue-700 dark:text-blue-300">
              <span className="font-bold">🎯 Focus Mode</span>
              <button
                onClick={() => setFocusedNodeId(null)}
                className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 rounded text-blue-800 dark:text-blue-200 font-semibold transition-colors"
                title="Clear focus and show all nodes"
              >
                Clear
              </button>
            </div>
          )}

          {/* Save and Export Buttons */}
          <div className="flex gap-1.5">
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1 px-2 py-1 border-0 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSaved && !hasUnsavedChanges
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
              }`}
              title={isSaved && !hasUnsavedChanges ? "Mind map saved to library" : "Save mind map to library"}
            >
              {isSaved && !hasUnsavedChanges ? (
                <BookmarkCheck className="w-3 h-3" />
              ) : (
                <BookmarkPlus className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? 'Saving...' : isSaved && !hasUnsavedChanges ? 'Saved' : 'Save'}
              </span>
            </button>

            {/* Divider */}
            <div className="w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* Legend Toggle */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`flex items-center gap-1 px-2 py-1 border rounded text-xs font-medium transition-colors ${
                showLegend
                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={showLegend ? 'Hide legend' : 'Show legend'}
            >
              <Info className="w-3 h-3" />
              <span className="hidden sm:inline">Legend</span>
            </button>

            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as PNG image"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as PDF document with legend"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleExportSVG}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as scalable SVG vector"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export raw data as JSON"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        {(reactFlowNodes?.length ?? 0) > 0 ? (
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeMouseEnter={handleEdgeMouseEnter}
            onEdgeMouseLeave={handleEdgeMouseLeave}
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

            {/* PHASE 4.1: Collapse/Expand Buttons using NodeToolbar */}
            {visibleNodes.map(node => {
              // Check if node has children
              const hasChildren = edges.some(edge => edge.from === node.id)
              if (!hasChildren) return null

              const isCollapsed = collapsedNodes.has(node.id)
              const descendantCount = getDescendants(node.id).size

              return (
                <NodeToolbar
                  key={`toolbar-${node.id}`}
                  nodeId={node.id}
                  position={Position.Right}
                  offset={8}
                  isVisible={true}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleNodeCollapse(node.id)
                    }}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg flex items-center justify-center text-white font-bold text-base transition-all hover:scale-110 border-2 border-white dark:border-gray-700"
                    title={isCollapsed
                      ? `Expand to show ${descendantCount} hidden node${descendantCount !== 1 ? 's' : ''}`
                      : `Collapse to hide ${descendantCount} child node${descendantCount !== 1 ? 's' : ''}`
                    }
                  >
                    {isCollapsed ? '+' : '−'}
                  </button>
                </NodeToolbar>
              )
            })}
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

      {/* PHASE 3.4: Export Legend (shown only during export) */}
      {showExportLegend && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 max-w-md z-50">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
            Mind Map Legend
          </h3>

          {/* Relationship Icons */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Relationship Types:</h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">→</span>
                <span className="text-gray-600 dark:text-gray-400">Causal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-purple-600 dark:text-purple-400">⊃</span>
                <span className="text-gray-600 dark:text-gray-400">Hierarchical</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-green-600 dark:text-green-400">↔</span>
                <span className="text-gray-600 dark:text-gray-400">Bidirectional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-orange-600 dark:text-orange-400">≠</span>
                <span className="text-gray-600 dark:text-gray-400">Comparative</span>
              </div>
            </div>
          </div>

          {/* Edge Types */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Connection Types:</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-slate-600" />
                <span className="text-gray-600 dark:text-gray-400">Hierarchical relationship</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-orange-600" />
                <span className="text-gray-600 dark:text-gray-400">Cross-link (knowledge integration)</span>
              </div>
            </div>
          </div>

          {/* Category Colors */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Node Categories:</h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {Object.entries(categoryColors).map(([category, colors]) => (
                <div key={category} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{ borderColor: colors.border, backgroundColor: colors.bg }}
                  />
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PHASE 4.3: Source Fidelity Indicators */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Source Fidelity:</h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded-full text-white font-semibold text-xs" style={{ backgroundColor: '#10B981' }}>
                  ★★★
                </div>
                <span className="text-gray-600 dark:text-gray-400">Strong (85-100)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded-full text-white font-semibold text-xs" style={{ backgroundColor: '#3B82F6' }}>
                  ★★
                </div>
                <span className="text-gray-600 dark:text-gray-400">Moderate (70-84)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded-full text-white font-semibold text-xs" style={{ backgroundColor: '#F59E0B' }}>
                  ★
                </div>
                <span className="text-gray-600 dark:text-gray-400">Weak (50-69)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded-full text-white font-semibold text-xs" style={{ backgroundColor: '#9CA3AF' }}>
                  ○
                </div>
                <span className="text-gray-600 dark:text-gray-400">Minimal (0-49)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Legend - Toggleable */}
      {showLegend && (
        <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950/30">
          <div className="flex items-center justify-between gap-3 text-xs">
          {/* Tip - PHASE 4.2: Updated to include focus mode */}
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="font-semibold">💡</span>
            <span className="hidden md:inline">{focusedNodeId ? 'Click focused node to exit focus mode' : 'Click nodes to explore + focus branch'}</span>
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
      )}
      </div>

      {/* Save Message Toast */}
      {saveMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            saveMessage.includes('Failed')
              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600'
              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600'
          }`}>
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">{saveMessage}</span>
          </div>
        </div>
      )}

      {/* PHASE 2.4: Edge Tooltip */}
      {edgeTooltip && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: `${edgeTooltip.x}px`,
            top: `${edgeTooltip.y - 60}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className={`px-3 py-2 rounded-lg shadow-xl border text-white text-sm font-medium max-w-xs text-center animate-in fade-in duration-200 ${
              edgeTooltip.isCrossLink
                ? 'bg-gradient-to-br from-orange-600 to-orange-500 border-orange-400/30'
                : 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600/30'
            }`}
            style={{
              lineHeight: '1.4',
              animation: 'tooltipFadeIn 0.2s ease-out',
            }}
          >
            {edgeTooltip.text}
          </div>
          {/* Tooltip arrow */}
          <div
            className={`w-0 h-0 mx-auto mt-0 ${
              edgeTooltip.isCrossLink
                ? 'border-t-orange-600'
                : 'border-t-gray-800'
            }`}
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${edgeTooltip.isCrossLink ? '#ea580c' : '#1f2937'}`,
            }}
          />
        </div>
      )}

      {/* Detail Panel */}
      <MindMapDetailPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        nodeLabel={selectedNode?.label || ''}
        nodeDescription={selectedNode?.description}
        nodeDetails={nodeDetails}
        isLoading={isLoadingDetails}
        selectedNodePosition={selectedNodePosition}
        onReloadDocumentText={onReloadDocumentText}
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
