/**
 * Template-Specific Layout Algorithms for Mind Maps
 *
 * Converts MindMapData (nodes + edges) into ReactFlow nodes with positions
 * based on the selected visualization template
 */

import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import type { MindMapNode, MindMapEdge, MindMapData } from './mindmap-generator';
import type { TemplateType, VisualizationTemplate } from './mindmap-templates';
import { getTemplate } from './mindmap-templates';

export interface ReactFlowMindMap {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Main layout function - routes to template-specific algorithm
 */
export function layoutMindMap(mindMapData: MindMapData): ReactFlowMindMap {
  const template = getTemplate(mindMapData.template);

  console.log(`[Layout] Applying ${mindMapData.template} layout to ${mindMapData.nodes.length} nodes`);

  switch (mindMapData.template) {
    case 'flowchart':
      return layoutFlowchart(mindMapData, template);
    case 'timeline':
      return layoutTimeline(mindMapData, template);
    case 'hierarchical':
    default:
      return layoutHierarchical(mindMapData, template);
  }
}

/**
 * Hierarchical Mind Map Layout (Default)
 * Radial/organic tree layout with color-coded levels
 */
function layoutHierarchical(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;
  const { nodeSpacing } = template.layout;

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Group nodes by level
  const nodesByLevel = new Map<number, MindMapNode[]>();
  mindMapNodes.forEach(node => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level)!.push(node);
  });

  // Layout nodes level by level
  mindMapNodes.forEach((node) => {
    const nodesAtLevel = nodesByLevel.get(node.level) || [];
    const indexAtLevel = nodesAtLevel.indexOf(node);
    const totalAtLevel = nodesAtLevel.length;

    // Calculate position
    const x = node.level * nodeSpacing.horizontal;
    const y = (indexAtLevel - (totalAtLevel - 1) / 2) * nodeSpacing.vertical;

    // Create ReactFlow node
    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x, y },
      data: {
        label: node.label,
        description: node.description,
        level: node.level,
        category: node.category,
      },
      style: {
        background: getColorForCategory(node.category || 'concept', template),
        color: 'white',
        border: `3px solid ${getColorForLevel(node.level)}`,
        borderRadius: node.level === 0 ? '24px' : '16px',
        padding: node.level === 0 ? '20px' : '16px',
        minWidth: node.level === 0 ? '250px' : '200px',
        fontSize: node.level === 0 ? '18px' : '14px',
        fontWeight: node.level === 0 ? 'bold' : 'normal',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create edges
  mindMapEdges.forEach((edge) => {
    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      label: edge.relationship,
      animated: true,
      style: {
        stroke: '#6366f1',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 600,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.9,
      },
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Flowchart Layout - IMPROVED
 * Professional process flow with step numbers, swim lanes, and visual hierarchy
 */
function layoutFlowchart(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;
  const { nodeSpacing } = template.layout;

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Find root node (level 0)
  const rootNode = mindMapNodes.find(n => n.level === 0);
  if (!rootNode) {
    throw new Error('No root node found');
  }

  // Build tree structure to determine flow order
  const nodeMap = new Map(mindMapNodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  mindMapEdges.forEach(edge => {
    if (!childrenMap.has(edge.from)) {
      childrenMap.set(edge.from, []);
    }
    childrenMap.get(edge.from)!.push(edge.to);
  });

  // Improved lane assignment using level-based layout
  const positionMap = new Map<string, { x: number; y: number; step: number }>();
  const laneMap = new Map<number, number>(); // Track nodes per level for better spacing

  // Calculate positions by level (step)
  mindMapNodes.forEach(node => {
    const currentLane = laneMap.get(node.level) || 0;
    laneMap.set(node.level, currentLane + 1);
  });

  // Layout nodes with improved swim lane algorithm
  const nodeCountByLevel = new Map<number, number>();
  mindMapNodes.forEach(node => {
    const nodesAtLevel = mindMapNodes.filter(n => n.level === node.level);
    const indexAtLevel = nodesAtLevel.indexOf(node);
    const totalAtLevel = nodesAtLevel.length;

    const x = node.level * nodeSpacing.horizontal;
    const y = (indexAtLevel - (totalAtLevel - 1) / 2) * nodeSpacing.vertical;

    positionMap.set(node.id, { x, y, step: node.level });
    nodeCountByLevel.set(node.level, totalAtLevel);
  });

  // Determine node type based on position and category
  const getNodeType = (node: MindMapNode, step: number, totalSteps: number) => {
    if (step === 0) return 'start'; // First node
    if (step === totalSteps - 1) return 'end'; // Last node
    if (node.category === 'process' || node.category === 'technique') return 'process';
    if (node.category === 'outcome') return 'decision';
    return 'process';
  };

  const maxStep = Math.max(...Array.from(positionMap.values()).map(p => p.step));

  // Create ReactFlow nodes with visual hierarchy
  mindMapNodes.forEach((node, index) => {
    const pos = positionMap.get(node.id) || { x: 0, y: 0, step: 0 };
    const nodeType = getNodeType(node, pos.step, maxStep + 1);
    const stepNumber = pos.step + 1;

    // Different styling based on node type
    let nodeStyle: any = {
      minWidth: '200px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
      transition: 'all 0.2s ease',
    };

    switch (nodeType) {
      case 'start':
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: '3px solid #047857',
          borderRadius: '30px',
          padding: '18px 24px',
          minWidth: '220px',
          fontSize: '15px',
          fontWeight: '700',
          boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3)',
        };
        break;
      case 'end':
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: '3px solid #b91c1c',
          borderRadius: '30px',
          padding: '18px 24px',
          minWidth: '220px',
          fontSize: '15px',
          fontWeight: '700',
          boxShadow: '0 6px 16px rgba(239, 68, 68, 0.3)',
        };
        break;
      case 'decision':
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: '3px solid #b45309',
          borderRadius: '8px',
          padding: '16px 20px',
          transform: 'rotate(-2deg)',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        };
        break;
      default:
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: '2.5px solid #1d4ed8',
          borderRadius: '10px',
          padding: '14px 20px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
        };
    }

    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x: pos.x, y: pos.y },
      data: {
        label: `STEP ${stepNumber}\n${node.label}`,
        description: node.description,
        level: node.level,
        category: node.category,
        stepNumber,
      },
      style: {
        ...nodeStyle,
        whiteSpace: 'pre-line',
        textAlign: 'center',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create edges with enhanced styling
  mindMapEdges.forEach((edge, index) => {
    const sourceNode = nodeMap.get(edge.from);
    const targetNode = nodeMap.get(edge.to);
    const isCrossLink = sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: isCrossLink ? 'smoothstep' : 'default',
      label: edge.relationship,
      animated: !isCrossLink,
      style: {
        stroke: isCrossLink ? '#f59e0b' : '#60a5fa',
        strokeWidth: isCrossLink ? 2.5 : 3,
        strokeDasharray: isCrossLink ? '5,5' : undefined,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: isCrossLink ? '#f59e0b' : '#60a5fa',
        width: 20,
        height: 20,
      },
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 600,
        fontSize: 11,
        backgroundColor: '#ffffff',
        padding: '2px 6px',
        borderRadius: '4px',
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.95,
        rx: 4,
        ry: 4,
      },
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Timeline Layout - IMPROVED
 * Clean professional timeline with extracted dates and polished formatting
 */
function layoutTimeline(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;
  const { timelineSpacing = 250 } = template.layout;

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Helper: Extract date/year from text
  const extractDate = (text: string): { date: string; cleanLabel: string } => {
    // Patterns for dates and years
    const patterns = [
      // Full dates: "January 1, 2020", "1 Jan 2020", "2020-01-01"
      /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/i,
      /(\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b)/i,
      /(\b\d{4}-\d{2}-\d{2}\b)/,
      /(\b\d{2}\/\d{2}\/\d{4}\b)/,
      // Year ranges: "1914-1918", "1960s-1970s"
      /(\b\d{4}\s*[-–—]\s*\d{4}\b)/,
      /(\b\d{4}s?\s*[-–—]\s*\d{4}s?\b)/,
      // Single years: "2020", "1945"
      /(\b(?:19|20)\d{2}\b)/,
      // Decades: "1960s", "1920's"
      /(\b(?:19|20)\d{0}s\b)/,
      // Centuries: "21st century", "19th Century"
      /(\b\d{1,2}(?:st|nd|rd|th)\s+[Cc]entury\b)/,
      // Eras: "2000 BCE", "500 AD"
      /(\b\d+\s+(?:BCE|CE|BC|AD)\b)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const date = match[0].trim();
        const cleanLabel = text.replace(date, '').trim();
        // Remove leading/trailing punctuation
        const finalLabel = cleanLabel.replace(/^[:\-–—,.\s]+|[:\-–—,.\s]+$/g, '');
        return { date, cleanLabel: finalLabel || text };
      }
    }

    return { date: '', cleanLabel: text };
  };

  // Sort nodes by level (chronological order)
  const sortedNodes = [...mindMapNodes].sort((a, b) => a.level - b.level);
  const totalNodes = sortedNodes.length;

  // Color gradient from purple to pink based on chronology
  const getTimelineColor = (index: number, total: number) => {
    const ratio = index / Math.max(total - 1, 1);
    // Gradient from purple -> violet -> pink
    if (ratio < 0.5) {
      return `hsl(${270 - ratio * 40}, 70%, ${55 + ratio * 10}%)`;
    } else {
      return `hsl(${250 - ratio * 40}, 65%, ${60 + (ratio - 0.5) * 15}%)`;
    }
  };

  const getBorderColor = (index: number, total: number) => {
    const ratio = index / Math.max(total - 1, 1);
    if (ratio < 0.5) {
      return `hsl(${270 - ratio * 40}, 70%, ${40 + ratio * 5}%)`;
    } else {
      return `hsl(${250 - ratio * 40}, 65%, ${45 + (ratio - 0.5) * 10}%)`;
    }
  };

  // Layout nodes with alternating top/bottom pattern
  sortedNodes.forEach((node, index) => {
    const x = index * timelineSpacing;
    const isAbove = index % 2 === 0;
    const y = isAbove ? -220 : 220; // Alternate above/below the timeline axis

    const bgColor = getTimelineColor(index, totalNodes);
    const borderColor = getBorderColor(index, totalNodes);

    // Extract date and clean label
    const { date, cleanLabel } = extractDate(node.label);

    // Format the label with date prominently displayed
    let displayLabel = '';
    if (date) {
      // Date found - show it prominently at top
      displayLabel = `━━━━━━━━━━━━\n${date}\n━━━━━━━━━━━━\n${cleanLabel}`;
    } else {
      // No date - just show the label
      displayLabel = cleanLabel;
    }

    // Create the main node (event)
    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x, y },
      data: {
        label: displayLabel,
        description: node.description,
        level: node.level,
        category: node.category,
        date: date,
        eventNumber: index + 1,
      },
      style: {
        background: `linear-gradient(135deg, ${bgColor} 0%, ${borderColor} 100%)`,
        color: 'white',
        border: `3px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '18px 22px',
        minWidth: '200px',
        maxWidth: '280px',
        fontSize: '12px',
        fontWeight: '500',
        lineHeight: '1.4',
        boxShadow: `0 8px 24px ${borderColor}50`,
        position: 'relative',
        whiteSpace: 'pre-line',
        textAlign: 'center',
      },
      sourcePosition: isAbove ? Position.Bottom : Position.Top,
      targetPosition: isAbove ? Position.Bottom : Position.Top,
    });

    // Create timeline axis marker with date label
    const markerLabel = date || (index + 1).toString();
    reactFlowNodes.push({
      id: `${node.id}_marker`,
      type: 'default',
      position: { x: x + 80, y: -35 }, // Centered on timeline axis
      data: {
        label: markerLabel,
      },
      style: {
        background: `linear-gradient(135deg, ${bgColor} 0%, ${borderColor} 100%)`,
        color: 'white',
        border: `3px solid ${borderColor}`,
        borderRadius: date ? '8px' : '50%', // Rounded box for dates, circle for numbers
        padding: date ? '6px 12px' : '8px',
        minWidth: date ? 'auto' : '40px',
        minHeight: date ? 'auto' : '40px',
        fontSize: date ? '11px' : '14px',
        fontWeight: '800',
        textAlign: 'center',
        boxShadow: `0 4px 16px ${borderColor}70`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        letterSpacing: '0.3px',
      },
      draggable: false,
      selectable: false,
    });

    // Create connector line from event to timeline marker
    reactFlowEdges.push({
      id: `${node.id}_connector`,
      source: node.id,
      target: `${node.id}_marker`,
      type: 'straight',
      animated: false,
      style: {
        stroke: borderColor,
        strokeWidth: 2.5,
        strokeDasharray: '4,4',
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: borderColor,
        width: 15,
        height: 15,
      },
    });
  });

  // Create horizontal timeline axis line (visual representation)
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const sourceColor = getBorderColor(i, totalNodes);
    const targetColor = getBorderColor(i + 1, totalNodes);

    reactFlowEdges.push({
      id: `timeline_axis_${i}`,
      source: `${sortedNodes[i].id}_marker`,
      target: `${sortedNodes[i + 1].id}_marker`,
      type: 'straight',
      animated: true,
      style: {
        stroke: sourceColor,
        strokeWidth: 5,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: targetColor,
        width: 20,
        height: 20,
      },
    });
  }

  // Create relationship edges between events (if any)
  mindMapEdges.forEach((edge) => {
    // Skip if it's a connector edge
    if (edge.id.includes('_connector') || edge.id.includes('timeline_axis')) return;

    const sourceNode = sortedNodes.find(n => n.id === edge.from);
    const targetNode = sortedNodes.find(n => n.id === edge.to);

    if (sourceNode && targetNode) {
      const sourceIndex = sortedNodes.indexOf(sourceNode);
      const targetIndex = sortedNodes.indexOf(targetNode);

      reactFlowEdges.push({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        label: edge.relationship,
        animated: false,
        style: {
          stroke: '#f472b6',
          strokeWidth: 2,
          strokeDasharray: '8,4',
        },
        markerEnd: {
          type: 'arrowclosed' as any,
          color: '#f472b6',
        },
        labelStyle: {
          fill: '#831843',
          fontWeight: 700,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: '#fce7f3',
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
        },
      });
    }
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Helper: Get color for node category
 */
function getColorForCategory(category: string, template: VisualizationTemplate): string {
  const colorMap: Record<string, string> = {
    concept: '#6366f1',
    process: '#10b981',
    example: '#f59e0b',
    definition: '#ec4899',
    principle: '#a855f7',
    data: '#ef4444',
    technique: '#14b8a6',
    outcome: '#f97316',
  };

  return colorMap[category] || template.style.nodeColors[0];
}

/**
 * Helper: Get border color based on level
 */
function getColorForLevel(level: number): string {
  const colors = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#059669'];
  return colors[Math.min(level, colors.length - 1)];
}
