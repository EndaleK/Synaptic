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

  // Create edges with enhanced visibility
  mindMapEdges.forEach((edge) => {
    const sourceNode = mindMapNodes.find(n => n.id === edge.from);
    const targetNode = mindMapNodes.find(n => n.id === edge.to);
    const isCrossLink = sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      label: edge.relationship,
      animated: !isCrossLink,
      style: {
        stroke: isCrossLink ? '#9A7B64' : '#64748B', // Warm copper for cross-links, slate for hierarchy
        strokeWidth: isCrossLink ? 3 : 4,
        strokeDasharray: isCrossLink ? '8,4' : undefined,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: isCrossLink ? '#9A7B64' : '#64748B',
        width: 22,
        height: 22,
      },
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 700,
        fontSize: 14,
        padding: '4px 8px',
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.95,
        rx: 6,
        ry: 6,
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
          background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)', // Muted gray
          color: 'white',
          border: '3px solid #374151',
          borderRadius: '30px',
          padding: '18px 24px',
          minWidth: '220px',
          fontSize: '15px',
          fontWeight: '700',
          boxShadow: '0 6px 16px rgba(107, 114, 128, 0.3)',
        };
        break;
      case 'end':
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #A16E5E 0%, #8B5E51 100%)', // Muted terracotta
          color: 'white',
          border: '3px solid #7C4D40',
          borderRadius: '30px',
          padding: '18px 24px',
          minWidth: '220px',
          fontSize: '15px',
          fontWeight: '700',
          boxShadow: '0 6px 16px rgba(161, 110, 94, 0.3)',
        };
        break;
      case 'decision':
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #9A7B64 0%, #856B56 100%)', // Warm copper
          color: 'white',
          border: '3px solid #6D5A49',
          borderRadius: '8px',
          padding: '16px 20px',
          transform: 'rotate(-2deg)',
          boxShadow: '0 4px 12px rgba(154, 123, 100, 0.3)',
        };
        break;
      default:
        nodeStyle = {
          ...nodeStyle,
          background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', // Slate blue
          color: 'white',
          border: '2.5px solid #334155',
          borderRadius: '10px',
          padding: '14px 20px',
          boxShadow: '0 4px 12px rgba(100, 116, 139, 0.25)',
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

  // Create edges with enhanced styling and muted colors
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
        stroke: isCrossLink ? '#9A7B64' : '#64748B', // Warm copper for cross-links, slate for hierarchy
        strokeWidth: isCrossLink ? 3 : 4,
        strokeDasharray: isCrossLink ? '8,4' : undefined,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: isCrossLink ? '#9A7B64' : '#64748B',
        width: 22,
        height: 22,
      },
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 700,
        fontSize: 14,
        padding: '4px 8px',
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.95,
        rx: 6,
        ry: 6,
      },
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Timeline Layout - REDESIGNED
 * Modern single-track horizontal timeline with clear chronological progression
 * Based on industry best practices and user research
 */
function layoutTimeline(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;
  const HORIZONTAL_SPACING = 350; // Increased for better clarity
  const CARD_Y_POSITION = 0; // Single horizontal track

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Helper: Extract date/year from text
  const extractDate = (text: string): { date: string; cleanLabel: string } => {
    const patterns = [
      /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/i,
      /(\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b)/i,
      /(\b\d{4}-\d{2}-\d{2}\b)/,
      /(\b\d{2}\/\d{2}\/\d{4}\b)/,
      /(\b\d{4}\s*[-–—]\s*\d{4}\b)/,
      /(\b\d{4}s?\s*[-–—]\s*\d{4}s?\b)/,
      /(\b(?:19|20)\d{2}\b)/,
      /(\b(?:19|20)\d{0}s\b)/,
      /(\b\d{1,2}(?:st|nd|rd|th)\s+[Cc]entury\b)/,
      /(\b\d+\s+(?:BCE|CE|BC|AD)\b)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const date = match[0].trim();
        const cleanLabel = text.replace(date, '').trim();
        const finalLabel = cleanLabel.replace(/^[:\-–—,.\s]+|[:\-–—,.\s]+$/g, '');
        return { date, cleanLabel: finalLabel || text };
      }
    }
    return { date: '', cleanLabel: text };
  };

  // Sort nodes by level (chronological order)
  const sortedNodes = [...mindMapNodes].sort((a, b) => a.level - b.level);
  const totalNodes = sortedNodes.length;

  // Synaptic brand color progression: Purple (#7B3FF2) → Pink (#E91E8C)
  const getSynapticGradientColors = (index: number, total: number) => {
    const ratio = index / Math.max(total - 1, 1);

    // Interpolate between purple and pink
    const startColor = { r: 123, g: 63, b: 242 }; // #7B3FF2
    const endColor = { r: 233, g: 30, b: 140 };   // #E91E8C

    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

    const mainColor = `rgb(${r}, ${g}, ${b})`;

    // Darker version for borders
    const borderR = Math.round(r * 0.8);
    const borderG = Math.round(g * 0.8);
    const borderB = Math.round(b * 0.8);
    const borderColor = `rgb(${borderR}, ${borderG}, ${borderB})`;

    return { mainColor, borderColor };
  };

  // Layout nodes on single horizontal track
  sortedNodes.forEach((node, index) => {
    const x = index * HORIZONTAL_SPACING;
    const { mainColor, borderColor } = getSynapticGradientColors(index, totalNodes);

    // Extract date and clean label
    const { date, cleanLabel } = extractDate(node.label);

    // Create prominent date badge above card
    if (date) {
      reactFlowNodes.push({
        id: `${node.id}_date`,
        type: 'default',
        position: { x: x + 25, y: -150 },
        data: { label: date },
        style: {
          background: `linear-gradient(135deg, ${mainColor} 0%, ${borderColor} 100%)`,
          color: 'white',
          border: `3px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: '800',
          textAlign: 'center',
          boxShadow: `0 8px 24px ${borderColor}80`,
          letterSpacing: '0.5px',
          minWidth: '150px',
        },
        draggable: false,
        selectable: false,
      });

      // Connection from date to card
      reactFlowEdges.push({
        id: `${node.id}_date_connector`,
        source: `${node.id}_date`,
        target: node.id,
        type: 'straight',
        animated: false,
        style: {
          stroke: borderColor,
          strokeWidth: 2,
          strokeDasharray: '5,5',
        },
      });
    }

    // Create main event card
    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x, y: CARD_Y_POSITION },
      data: {
        label: cleanLabel,
        description: node.description,
        level: node.level,
        category: node.category,
        date: date,
        eventNumber: index + 1,
      },
      style: {
        background: `linear-gradient(135deg, ${mainColor} 0%, ${borderColor} 100%)`,
        color: 'white',
        border: `4px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '24px 28px',
        minWidth: '280px',
        maxWidth: '320px',
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '1.6',
        boxShadow: `0 12px 32px ${borderColor}60, 0 4px 12px ${borderColor}40`,
        textAlign: 'left',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        transition: 'all 0.3s ease',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    // Create sequence number badge
    reactFlowNodes.push({
      id: `${node.id}_number`,
      type: 'default',
      position: { x: x - 30, y: CARD_Y_POSITION - 20 },
      data: { label: (index + 1).toString() },
      style: {
        background: borderColor,
        color: 'white',
        border: `3px solid ${mainColor}`,
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        fontSize: '18px',
        fontWeight: '900',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 6px 20px ${borderColor}70`,
        zIndex: 100,
      },
      draggable: false,
      selectable: false,
    });
  });

  // Create clean horizontal timeline axis with arrows
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const { borderColor: sourceColor } = getSynapticGradientColors(i, totalNodes);
    const { borderColor: targetColor } = getSynapticGradientColors(i + 1, totalNodes);

    reactFlowEdges.push({
      id: `timeline_axis_${i}`,
      source: sortedNodes[i].id,
      target: sortedNodes[i + 1].id,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: sourceColor,
        strokeWidth: 6,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: targetColor,
        width: 28,
        height: 28,
      },
    });
  }

  // Create relationship edges (if any)
  mindMapEdges.forEach((edge) => {
    if (edge.id.includes('_connector') || edge.id.includes('timeline_axis')) return;

    const sourceNode = sortedNodes.find(n => n.id === edge.from);
    const targetNode = sortedNodes.find(n => n.id === edge.to);

    if (sourceNode && targetNode) {
      reactFlowEdges.push({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        label: edge.relationship,
        animated: false,
        style: {
          stroke: '#FF6B35', // Orange accent for relationships
          strokeWidth: 3,
          strokeDasharray: '8,4',
        },
        markerEnd: {
          type: 'arrowclosed' as any,
          color: '#FF6B35',
          width: 20,
          height: 20,
        },
        labelStyle: {
          fill: '#1f2937',
          fontWeight: 700,
          fontSize: 13,
          padding: '4px 8px',
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.95,
          rx: 6,
          ry: 6,
        },
      });
    }
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Helper: Get color for node category (muted professional palette)
 */
function getColorForCategory(category: string, template: VisualizationTemplate): string {
  const colorMap: Record<string, string> = {
    concept: '#64748B',    // Slate
    process: '#6B7280',    // Gray
    example: '#78716C',    // Stone
    definition: '#8B7FB8', // Lavender
    principle: '#9F7AEA',  // Soft Purple
    data: '#A16E5E',       // Terracotta
    technique: '#5B8A9F',  // Ocean Blue
    outcome: '#9A7B64',    // Warm Copper
  };

  return colorMap[category] || template.style.nodeColors[0];
}

/**
 * Helper: Get border color based on level (muted palette)
 */
function getColorForLevel(level: number): string {
  const colors = ['#64748B', '#8B7FB8', '#9F7AEA', '#9A7B64', '#5B8A9F'];
  return colors[Math.min(level, colors.length - 1)];
}
