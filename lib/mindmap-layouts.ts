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
 * PHASE 4.3: Calculate Source Fidelity Score (Research-Backed)
 * Estimates how well a node is supported by source material
 * Returns a score from 0-100 with categorization:
 * - 85-100: Strong (comprehensive description, detailed context)
 * - 70-84: Moderate (good description, reasonable context)
 * - 50-69: Weak (basic description, limited context)
 * - 0-49: Minimal (sparse description, shallow context)
 */
function calculateFidelity(node: MindMapNode): number {
  // If fidelity is already set, use it
  if (node.fidelity !== undefined) {
    return node.fidelity
  }

  let score = 0

  // Factor 1: Description completeness (0-40 points)
  // Longer, more detailed descriptions indicate stronger source support
  const descLength = node.description?.length || 0
  if (descLength > 200) score += 40
  else if (descLength > 150) score += 35
  else if (descLength > 100) score += 30
  else if (descLength > 50) score += 20
  else if (descLength > 20) score += 10
  else score += 5

  // Factor 2: Level proximity to root (0-30 points)
  // Root and main topics tend to be more explicitly stated in source material
  if (node.level === 0) score += 30 // Root
  else if (node.level === 1) score += 25 // Main topics
  else if (node.level === 2) score += 20 // Subtopics
  else if (node.level === 3) score += 15 // Details
  else score += 10 // Deep nesting

  // Factor 3: Category assignment (0-15 points)
  // Having a category suggests clear semantic classification from source
  if (node.category) score += 15

  // Factor 4: Label clarity (0-15 points)
  // Descriptive labels indicate explicit source references
  const labelLength = node.label?.length || 0
  if (labelLength > 40) score += 15 // Detailed label
  else if (labelLength > 20) score += 12 // Moderate label
  else if (labelLength > 10) score += 8 // Short label
  else score += 3 // Very short

  return Math.min(100, Math.max(0, score))
}

/**
 * PHASE 4.3: Get Fidelity Badge Properties
 * Returns icon and color based on fidelity score
 */
function getFidelityBadge(fidelity: number): { icon: string; color: string; label: string } {
  if (fidelity >= 85) {
    return { icon: '★★★', color: '#10B981', label: 'Strong Support' } // Green
  } else if (fidelity >= 70) {
    return { icon: '★★', color: '#3B82F6', label: 'Moderate Support' } // Blue
  } else if (fidelity >= 50) {
    return { icon: '★', color: '#F59E0B', label: 'Weak Support' } // Amber
  } else {
    return { icon: '○', color: '#9CA3AF', label: 'Minimal Support' } // Gray
  }
}

/**
 * PHASE 2.2: Relationship Type Icons (Research-Backed)
 * Maps relationship strings to visual icons for instant recognition
 * Reduces cognitive load by making relationship types immediately recognizable
 *
 * Icons:
 * → Causal (leads to, causes, produces)
 * ⊃ Hierarchical (contains, includes, has)
 * ↔ Bidirectional (interacts with, relates to)
 * ≠ Comparative (differs from, contrasts with)
 */
function getRelationshipIcon(relationship: string): string {
  const rel = relationship.toLowerCase();

  // Causal relationships → (leads to, causes, produces)
  if (
    rel.includes('leads to') ||
    rel.includes('causes') ||
    rel.includes('results in') ||
    rel.includes('produces') ||
    rel.includes('creates') ||
    rel.includes('generates') ||
    rel.includes('triggers') ||
    rel.includes('enables') ||
    rel.includes('affects') ||
    rel.includes('influences')
  ) {
    return '→ ';
  }

  // Hierarchical relationships ⊃ (contains, includes, has)
  if (
    rel.includes('contains') ||
    rel.includes('includes') ||
    rel.includes('has') ||
    rel.includes('consists of') ||
    rel.includes('comprises') ||
    rel.includes('part of') ||
    rel.includes('belongs to') ||
    rel.includes('subdivided into') ||
    rel.includes('composed of')
  ) {
    return '⊃ ';
  }

  // Bidirectional/interactive relationships ↔ (interacts with, relates to)
  if (
    rel.includes('interacts with') ||
    rel.includes('relates to') ||
    rel.includes('corresponds to') ||
    rel.includes('connected to') ||
    rel.includes('associated with') ||
    rel.includes('linked to') ||
    rel.includes('correlated with') ||
    rel.includes('depends on')
  ) {
    return '↔ ';
  }

  // Comparative/contrastive relationships ≠ (differs from, contrasts with)
  if (
    rel.includes('differs from') ||
    rel.includes('contrasts with') ||
    rel.includes('versus') ||
    rel.includes('vs') ||
    rel.includes('compared to') ||
    rel.includes('opposite of') ||
    rel.includes('unlike')
  ) {
    return '≠ ';
  }

  // Default: no icon for unrecognized patterns
  return '';
}

/**
 * Main layout function - routes to template-specific algorithm
 * Now also supports mapType-based layouts (radial, concept)
 */
export function layoutMindMap(mindMapData: MindMapData, mapType?: 'hierarchical' | 'radial' | 'concept'): ReactFlowMindMap {
  const template = getTemplate(mindMapData.template);

  // Prioritize mapType over template for layout selection
  const layoutType = mapType || mindMapData.template;

  // VISUAL DEBUG: Log layout selection with emoji for easy identification
  const layoutEmoji = {
    'hierarchical': '🌿',
    'radial': '⭕',
    'concept': '🌐',
    'flowchart': '📊',
    'timeline': '⏳'
  }[layoutType] || '❓';

  console.log(`\n🎨 ========== MIND MAP LAYOUT ==========`);
  console.log(`${layoutEmoji} Layout Type: ${layoutType.toUpperCase()}`);
  console.log(`📊 Nodes: ${mindMapData.nodes.length}, Edges: ${mindMapData.edges.length}`);
  console.log(`🎯 Template: ${mindMapData.template}`);
  console.log(`⚙️ MapType Override: ${mapType || 'none (using template default)'}`);
  console.log(`========================================\n`);

  switch (layoutType) {
    case 'radial':
      return layoutRadial(mindMapData, template);
    case 'concept':
      return layoutConcept(mindMapData, template);
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
  console.log(`🌿 HIERARCHICAL LAYOUT: Traditional tree structure with color-coded levels`);

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

  // PHASE 1.1: Build branch assignment map (trace each node to its level-1 ancestor)
  const branchMap = new Map<string, number>();
  const level1Nodes = nodesByLevel.get(1) || [];

  level1Nodes.forEach((level1Node, index) => {
    branchMap.set(level1Node.id, index); // Level 1 nodes define branches
  });

  // For level 2+ nodes, find their level-1 ancestor
  mindMapNodes.forEach(node => {
    if (node.level > 1) {
      let currentNode = node;
      let parent = mindMapEdges.find(e => e.to === currentNode.id);

      while (parent) {
        const parentNode = mindMapNodes.find(n => n.id === parent.from);
        if (parentNode) {
          if (parentNode.level === 1) {
            branchMap.set(node.id, branchMap.get(parentNode.id) || 0);
            break;
          }
          currentNode = parentNode;
          parent = mindMapEdges.find(e => e.to === currentNode.id);
        } else {
          break;
        }
      }
    }
  });

  // Layout nodes level by level with depth-based styling
  mindMapNodes.forEach((node) => {
    const nodesAtLevel = nodesByLevel.get(node.level) || [];
    const indexAtLevel = nodesAtLevel.indexOf(node);
    const totalAtLevel = nodesAtLevel.length;
    const branchIndex = branchMap.get(node.id) || indexAtLevel;

    // Calculate position
    const x = node.level * nodeSpacing.horizontal;
    const y = (indexAtLevel - (totalAtLevel - 1) / 2) * nodeSpacing.vertical;

    // PHASE 1: Enhanced Hierarchical Depth Styling (Research-Backed)
    // Aggressive scale ratios for clear visual hierarchy (Nielsen Norman: 58% better digestibility)

    // Font size scaling: INCREASED for better readability - 28→22→18→16→14px
    const fontSizeByLevel = [28, 22, 18, 16, 14]; // Was: [22, 16, 13, 11, 10]
    const fontSize = node.level < fontSizeByLevel.length
      ? fontSizeByLevel[node.level]
      : fontSizeByLevel[fontSizeByLevel.length - 1];

    // Padding scaling: 24→18→14→12→10px (8px-based system)
    const paddingByLevel = [24, 18, 14, 12, 10];
    const padding = node.level < paddingByLevel.length
      ? paddingByLevel[node.level]
      : paddingByLevel[paddingByLevel.length - 1];

    // Min-width scaling: 300→240→200→180→160px
    const minWidthByLevel = [300, 240, 200, 180, 160];
    const minWidth = node.level < minWidthByLevel.length
      ? minWidthByLevel[node.level]
      : minWidthByLevel[minWidthByLevel.length - 1];

    // Border radius scaling: 24→18→12→8→8px (more dramatic)
    const borderRadiusByLevel = [24, 18, 12, 8, 8];
    const borderRadius = node.level < borderRadiusByLevel.length
      ? borderRadiusByLevel[node.level]
      : borderRadiusByLevel[borderRadiusByLevel.length - 1];

    // Progressive border thickness: 4→3→2→2→1px
    const borderWidthByLevel = [4, 3, 2, 2, 1];
    const borderWidth = node.level < borderWidthByLevel.length
      ? borderWidthByLevel[node.level]
      : borderWidthByLevel[borderWidthByLevel.length - 1];

    // Line height for readability: 1.15-1.2x (optimal for comprehension)
    const lineHeight = node.level === 0 ? 1.2 : 1.15;

    // Letter spacing for hierarchy clarity
    const letterSpacing = node.level === 0 ? '0.5px' : node.level === 1 ? '0.3px' : '0px';

    // PHASE 3.1: WCAG AA text color (dark text for light backgrounds like 'technique')
    const textColor = node.category === 'technique' ? '#1F2937' : 'white';

    // PHASE 4.3: Calculate fidelity score and get badge properties
    const fidelity = calculateFidelity(node)
    const fidelityBadge = getFidelityBadge(fidelity)

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
        fidelity: fidelity,
        fidelityBadge: fidelityBadge,
      },
      label: node.label, // ReactFlow default nodes use top-level label property
      style: {
        background: getColorForCategory(node.category || 'concept', template, node.id, node.level, branchIndex),
        color: textColor,
        border: `${borderWidth}px solid ${getColorForLevel(node.level)}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        minWidth: `${minWidth}px`,
        fontSize: `${fontSize}px`,
        fontWeight: node.level === 0 ? '700' : node.level === 1 ? '600' : node.level === 2 ? '500' : '400',
        lineHeight: lineHeight,
        letterSpacing: letterSpacing,
        // Depth shadows: Subtle elevation for hierarchy (Material Design principle)
        boxShadow: node.level === 0
          ? '0 8px 24px rgba(0,0,0,0.15)'
          : node.level === 1
          ? '0 6px 16px rgba(0,0,0,0.12)'
          : '0 4px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create edges with enhanced visibility and depth-based styling
  mindMapEdges.forEach((edge) => {
    const sourceNode = mindMapNodes.find(n => n.id === edge.from);
    const targetNode = mindMapNodes.find(n => n.id === edge.to);
    const isCrossLink = sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;

    // PHASE 2.3: Enhanced Cross-Link Emphasis (Research-Backed)
    // Cross-links show knowledge integration and synthesis - critical for advanced learning
    const sourceLevel = sourceNode?.level || 0;
    const strokeWidth = isCrossLink
      ? 4  // Thicker for cross-links (was: 3) - makes them visually prominent
      : Math.max(2, 5 - sourceLevel * 0.5); // Hierarchical: 5px → 4.5px → 4px → 3.5px → 3px → 2.5px → 2px

    // PHASE 2.4: Educational Tooltips (Research-Backed)
    // Tooltips explain complete propositions to reinforce learning
    const tooltipText = isCrossLink
      ? `Cross-link: This connection shows knowledge integration between "${sourceNode?.label}" and "${targetNode?.label}" across different branches. Cross-links indicate deeper understanding and synthesis.`
      : `"${sourceNode?.label}" ${edge.relationship} "${targetNode?.label}"`;

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'default',  // PHASE 1.3: Use bezier curves for organic feel (was 'smoothstep')
      pathOptions: { curvature: 0.5 },  // Gentle curve
      label: getRelationshipIcon(edge.relationship) + edge.relationship,  // PHASE 2.2: Add icon prefix
      animated: !isCrossLink,
      data: {
        // PHASE 2.4: Tooltip data for educational hover experience
        tooltip: tooltipText,
        isCrossLink: isCrossLink,
        sourceLabel: sourceNode?.label,
        targetLabel: targetNode?.label,
      },
      style: {
        stroke: isCrossLink ? '#FF6B35' : '#64748B', // Method 3: Orange accent for cross-links (improved contrast)
        strokeWidth: strokeWidth,
        strokeDasharray: isCrossLink ? '8,4' : undefined,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: isCrossLink ? '#FF6B35' : '#64748B',
        width: 20,
        height: 20,
      },
      // PHASE 2.1: Prominent Relationship Labels (Research-Backed)
      // Labeled relationships are THE KEY differentiator for concept maps over mind maps
      // This is what makes them educational (forms complete propositions: Node A + Relationship + Node B)
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 800,              // Was: 700 (bolder for prominence)
        fontSize: 15,                 // Was: 13 (larger for readability)
        padding: '6px 10px',          // Was: 4px 8px (more breathing room)
        letterSpacing: '0.3px',       // NEW: Better readability
      },
      labelBgStyle: {
        fill: isCrossLink ? '#FEF3C7' : '#FFFBEA',  // Warm yellow highlight (was: white)
        fillOpacity: 1,               // Was: 0.95 (full opacity for clarity)
        stroke: isCrossLink ? '#F59E0B' : '#FDE68A',  // NEW: Amber border for definition
        strokeWidth: 1,               // NEW: Border for visual separation
        rx: 8,                        // Was: 6 (slightly more rounded)
        ry: 8,
      },
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Radial Mind Map Layout
 * Circular layout with central concept and radiating branches
 * All level-1 nodes arranged in a circle around the root
 */
function layoutRadial(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  console.log(`⭕ RADIAL LAYOUT: Circular sunburst with radius 400px per level`);

  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;

  // DEBUG: Log all node levels
  console.log('[RADIAL DEBUG] Node levels:', mindMapNodes.map(n => `"${n.label.substring(0, 25)}": L${n.level}`).join(', '));

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Find root node (level 0)
  const rootNode = mindMapNodes.find(n => n.level === 0);
  if (!rootNode) {
    console.error('[RADIAL ERROR] No root node (level 0) found! All nodes:', mindMapNodes.map(n => `"${n.label}"(L${n.level})`));
    throw new Error('No root node found for radial layout');
  }

  console.log(`[RADIAL DEBUG] Root node: "${rootNode.label}" (ID: ${rootNode.id})`);

  // Group nodes by level
  const nodesByLevel = new Map<number, MindMapNode[]>();
  mindMapNodes.forEach(node => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level)!.push(node);
  });

  // DEBUG: Log nodes per level
  nodesByLevel.forEach((nodes, level) => {
    console.log(`[RADIAL DEBUG] Level ${level}: ${nodes.length} nodes - ${nodes.map(n => `"${n.label.substring(0, 20)}"`).join(', ')}`);
  });

  // Build parent-child relationships for branch assignment
  const childrenMap = new Map<string, string[]>();
  mindMapEdges.forEach(edge => {
    if (!childrenMap.has(edge.from)) {
      childrenMap.set(edge.from, []);
    }
    childrenMap.get(edge.from)!.push(edge.to);
  });

  // Calculate radial positions
  mindMapNodes.forEach((node, nodeIndex) => {
    let x = 0;
    let y = 0;

    if (node.level === 0) {
      // Root at center
      x = 0;
      y = 0;
      console.log(`[RADIAL DEBUG] Root "${node.label}" positioned at center (0, 0)`);
    } else {
      // Check if we have level-1 nodes for branch-based layout
      const level1Nodes = nodesByLevel.get(1) || [];

      if (level1Nodes.length === 0) {
        // FALLBACK: No level-1 nodes, use simple circular layout based on node index
        console.warn(`[RADIAL WARNING] No level-1 nodes found! Using simple circular fallback for "${node.label}"`);

        const radiusPerLevel = 400;
        const radius = node.level * radiusPerLevel;

        // Distribute all non-root nodes evenly in a circle
        const nonRootNodes = mindMapNodes.filter(n => n.level > 0);
        const nodeIndexInCircle = nonRootNodes.indexOf(node);
        const totalInCircle = nonRootNodes.length;

        const angleStep = (2 * Math.PI) / totalInCircle;
        const angle = nodeIndexInCircle * angleStep - Math.PI / 2; // Start from top

        x = radius * Math.cos(angle);
        y = radius * Math.sin(angle);

        console.log(`[RADIAL DEBUG] Node "${node.label}" (L${node.level}) positioned at (${x.toFixed(0)}, ${y.toFixed(0)}) - simple circle`);
      } else {
        // NORMAL: Branch-based layout
        // Find which level-1 branch this node belongs to
        let currentNode = node;
        let parent = mindMapEdges.find(e => e.to === currentNode.id);
        let branchRoot = node;

        // Traverse up to find the level-1 ancestor
        while (parent) {
          const parentNode = mindMapNodes.find(n => n.id === parent.from);
          if (parentNode) {
            if (parentNode.level === 1) {
              branchRoot = parentNode;
              break;
            }
            currentNode = parentNode;
            parent = mindMapEdges.find(e => e.to === currentNode.id);
          } else {
            break;
          }
        }

        // Calculate angle based on branch root position
        const branchIndex = level1Nodes.indexOf(branchRoot);
        const totalBranches = level1Nodes.length;

        // Distribute branches evenly around circle
        const angleStep = (2 * Math.PI) / totalBranches;
        const baseAngle = branchIndex * angleStep - Math.PI / 2; // Start from top

        // Radial distance based on level - PROGRESSIVE SCALING to prevent outer ring overlap
        // Exponential growth gives outer rings proportionally more space since circumference grows
        // Formula: radius = baseRadius * level^1.5
        // Level 1: 400px, Level 2: 900px (2.25x), Level 3: 1600px (4x), Level 4: 2500px (6.25x)
        const radius = node.level === 0 ? 0 : 400 * Math.pow(node.level, 1.5);

        // For nodes in the same branch, add slight angular offset
        const nodesInBranch = mindMapNodes.filter(n => {
          let curr = n;
          let par = mindMapEdges.find(e => e.to === curr.id);
          while (par) {
            const parNode = mindMapNodes.find(pn => pn.id === par.from);
            if (parNode) {
              if (parNode.level === 1 && parNode.id === branchRoot.id) {
                return true;
              }
              curr = parNode;
              par = mindMapEdges.find(e => e.to === curr.id);
            } else {
              break;
            }
          }
          return false;
        });

        const nodeIndexInBranch = nodesInBranch.indexOf(node);

        // DYNAMIC ANGULAR SPREAD - Calculate based on node width and radius to prevent overlap
        // Each node needs arc length = nodeWidth * 1.3 (30% spacing)
        // Convert to radians: angle = arcLength / radius
        const nodeWidthByLevel = [340, 280, 240, 200]; // Match minWidthByLevel
        const nodeWidth = node.level < nodeWidthByLevel.length ? nodeWidthByLevel[node.level] : 180;
        const arcLengthPerNode = nodeWidth * 1.3; // Add 30% spacing between nodes
        const totalArcNeeded = arcLengthPerNode * nodesInBranch.length;
        const angularSpreadCalculated = radius > 0 ? totalArcNeeded / radius : 0.4;

        // Clamp to reasonable bounds: min 0.175 rad (10°), max 1.57 rad (90°)
        const angularSpread = Math.max(0.175, Math.min(angularSpreadCalculated, 1.57));

        const angleOffset = (nodeIndexInBranch - (nodesInBranch.length - 1) / 2) * (angularSpread / Math.max(nodesInBranch.length, 1));

        const finalAngle = baseAngle + angleOffset;
        x = radius * Math.cos(finalAngle);
        y = radius * Math.sin(finalAngle);

        console.log(`[RADIAL DEBUG] Node "${node.label}" (L${node.level}) positioned at (${x.toFixed(0)}, ${y.toFixed(0)}) - branch ${branchIndex}/${totalBranches}`);
      }
    }

    // Styling optimized for clarity and visual hierarchy - Enhanced spacing
    const fontSizeByLevel = [32, 26, 22, 19]; // Increased from [30, 24, 20, 18] for better readability
    const fontSize = node.level < fontSizeByLevel.length ? fontSizeByLevel[node.level] : 17;

    // Increased padding by 25% for more breathing room and better touch targets
    const paddingByLevel = [35, 25, 20, 15]; // Was [28, 20, 16, 12]
    const padding = node.level < paddingByLevel.length ? paddingByLevel[node.level] : 12;

    const minWidthByLevel = [340, 280, 240, 200]; // Slightly wider for comfort
    const minWidth = node.level < minWidthByLevel.length ? minWidthByLevel[node.level] : 180;

    const borderRadiusByLevel = [999, 28, 22, 16]; // Increased roundness for modern feel
    const borderRadius = node.level < borderRadiusByLevel.length ? borderRadiusByLevel[node.level] : 10;

    const borderWidthByLevel = [5, 4, 3, 2]; // Thicker borders for definition
    const borderWidth = node.level < borderWidthByLevel.length ? borderWidthByLevel[node.level] : 2;

    // All gradients use white text for consistency and accessibility (WCAG AA 4.5:1+)
    const textColor = 'white';
    const fidelity = calculateFidelity(node);
    const fidelityBadge = getFidelityBadge(fidelity);

    // PHASE 1.1: Determine branch index for radial layout
    let branchIndex = 0;
    if (node.level === 1) {
      branchIndex = level1Nodes.indexOf(node);
    } else if (node.level > 1) {
      // Find level-1 ancestor
      let currentNode = node;
      let parent = mindMapEdges.find(e => e.to === currentNode.id);

      while (parent) {
        const parentNode = mindMapNodes.find(n => n.id === parent.from);
        if (parentNode) {
          if (parentNode.level === 1) {
            branchIndex = level1Nodes.indexOf(parentNode);
            break;
          }
          currentNode = parentNode;
          parent = mindMapEdges.find(e => e.to === currentNode.id);
        } else {
          break;
        }
      }
    }

    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x, y },
      data: {
        label: node.label,
        description: node.description,
        level: node.level,
        category: node.category,
        fidelity: fidelity,
        fidelityBadge: fidelityBadge,
      },
      label: node.label,
      style: {
        background: getColorForCategory(node.category || 'concept', template, node.id, node.level, branchIndex),
        color: textColor,
        border: `${borderWidth}px solid ${getColorForLevel(node.level)}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        minWidth: `${minWidth}px`,
        fontSize: `${fontSize}px`,
        fontWeight: node.level === 0 ? '800' : node.level === 1 ? '700' : '600', // Bolder for hierarchy
        // Enhanced shadows for depth and modern feel (layered shadows for richness)
        boxShadow: node.level === 0
          ? '0 20px 50px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)' // Root: dramatic depth
          : node.level === 1
          ? '0 12px 30px rgba(0,0,0,0.2), 0 5px 12px rgba(0,0,0,0.1)' // Level 1: strong presence
          : '0 6px 20px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.08)', // Others: subtle elevation
        transition: 'all 0.2s ease',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create edges - radial connections
  mindMapEdges.forEach((edge) => {
    const sourceNode = mindMapNodes.find(n => n.id === edge.from);
    const targetNode = mindMapNodes.find(n => n.id === edge.to);

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'default',  // PHASE 1.3: Bezier curves for organic radial connections
      pathOptions: { curvature: 0.6 },  // Slightly more curve for radial layout
      label: getRelationshipIcon(edge.relationship) + edge.relationship,
      animated: true,
      data: {
        tooltip: `"${sourceNode?.label}" ${edge.relationship} "${targetNode?.label}"`,
        isCrossLink: false,
        sourceLabel: sourceNode?.label,
        targetLabel: targetNode?.label,
      },
      style: {
        stroke: '#8B5CF6', // Purple for radial branches
        strokeWidth: Math.max(2, 4 - (sourceNode?.level || 0) * 0.5),
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: '#8B5CF6',
        width: 18,
        height: 18,
      },
      labelStyle: {
        fill: '#1f2937',
        fontWeight: 700,
        fontSize: 14,
        padding: '5px 10px',
      },
      labelBgStyle: {
        fill: '#F3E8FF',
        fillOpacity: 1,
        stroke: '#C4B5FD',
        strokeWidth: 1,
        rx: 8,
        ry: 8,
      },
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Concept Map Layout
 * Hierarchical structure with prominent cross-links showing knowledge integration
 * Similar to hierarchical but with enhanced cross-link visualization
 */
function layoutConcept(
  mindMapData: MindMapData,
  template: VisualizationTemplate
): ReactFlowMindMap {
  console.log(`🌐 CONCEPT MAP: Network with ULTRA-prominent cross-links (7px, bright orange)`);

  const { nodes: mindMapNodes, edges: mindMapEdges } = mindMapData;
  const { nodeSpacing } = template.layout;

  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Group nodes by level (same as hierarchical)
  const nodesByLevel = new Map<number, MindMapNode[]>();
  mindMapNodes.forEach(node => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level)!.push(node);
  });

  // PHASE 1.1: Build branch assignment map (same as hierarchical)
  const branchMap = new Map<string, number>();
  const level1Nodes = nodesByLevel.get(1) || [];

  level1Nodes.forEach((level1Node, index) => {
    branchMap.set(level1Node.id, index);
  });

  mindMapNodes.forEach(node => {
    if (node.level > 1) {
      let currentNode = node;
      let parent = mindMapEdges.find(e => e.to === currentNode.id);

      while (parent) {
        const parentNode = mindMapNodes.find(n => n.id === parent.from);
        if (parentNode) {
          if (parentNode.level === 1) {
            branchMap.set(node.id, branchMap.get(parentNode.id) || 0);
            break;
          }
          currentNode = parentNode;
          parent = mindMapEdges.find(e => e.to === currentNode.id);
        } else {
          break;
        }
      }
    }
  });

  // Layout nodes (same positioning as hierarchical)
  mindMapNodes.forEach((node) => {
    const nodesAtLevel = nodesByLevel.get(node.level) || [];
    const indexAtLevel = nodesAtLevel.indexOf(node);
    const totalAtLevel = nodesAtLevel.length;
    const branchIndex = branchMap.get(node.id) || indexAtLevel;

    const x = node.level * nodeSpacing.horizontal;
    const y = (indexAtLevel - (totalAtLevel - 1) / 2) * nodeSpacing.vertical;

    const fontSizeByLevel = [28, 22, 18, 16, 14]; // INCREASED: Was [22, 16, 13, 11, 10]
    const fontSize = node.level < fontSizeByLevel.length ? fontSizeByLevel[node.level] : 14; // Was: 10

    const paddingByLevel = [24, 18, 14, 12, 10];
    const padding = node.level < paddingByLevel.length ? paddingByLevel[node.level] : 10;

    const minWidthByLevel = [300, 240, 200, 180, 160];
    const minWidth = node.level < minWidthByLevel.length ? minWidthByLevel[node.level] : 160;

    const borderRadiusByLevel = [24, 18, 12, 8, 8];
    const borderRadius = node.level < borderRadiusByLevel.length ? borderRadiusByLevel[node.level] : 8;

    const borderWidthByLevel = [4, 3, 2, 2, 1];
    const borderWidth = node.level < borderWidthByLevel.length ? borderWidthByLevel[node.level] : 1;

    const textColor = node.category === 'technique' ? '#1F2937' : 'white';
    const fidelity = calculateFidelity(node);
    const fidelityBadge = getFidelityBadge(fidelity);

    reactFlowNodes.push({
      id: node.id,
      type: 'default',
      position: { x, y },
      data: {
        label: node.label,
        description: node.description,
        level: node.level,
        category: node.category,
        fidelity: fidelity,
        fidelityBadge: fidelityBadge,
      },
      label: node.label,
      style: {
        background: getColorForCategory(node.category || 'concept', template, node.id, node.level, branchIndex),
        color: textColor,
        border: `${borderWidth}px solid ${getColorForLevel(node.level)}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        minWidth: `${minWidth}px`,
        fontSize: `${fontSize}px`,
        fontWeight: node.level === 0 ? '700' : node.level === 1 ? '600' : '500',
        boxShadow: node.level === 0
          ? '0 8px 24px rgba(0,0,0,0.15)'
          : node.level === 1
          ? '0 6px 16px rgba(0,0,0,0.12)'
          : '0 4px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create edges with EXTRA emphasis on cross-links
  mindMapEdges.forEach((edge) => {
    const sourceNode = mindMapNodes.find(n => n.id === edge.from);
    const targetNode = mindMapNodes.find(n => n.id === edge.to);

    // Detect cross-links (connections that skip levels or go across branches)
    const isCrossLink = sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;

    const tooltipText = isCrossLink
      ? `🔗 CROSS-LINK: "${sourceNode?.label}" ${edge.relationship} "${targetNode?.label}" - This connection shows knowledge integration across different concepts!`
      : `"${sourceNode?.label}" ${edge.relationship} "${targetNode?.label}"`;

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'default',  // PHASE 1.3: Bezier curves for natural connection flow
      pathOptions: { curvature: 0.5 },  // Gentle curve
      label: (isCrossLink ? '🔗 ' : '') + getRelationshipIcon(edge.relationship) + edge.relationship,
      animated: !isCrossLink, // Cross-links are static and bold
      data: {
        tooltip: tooltipText,
        isCrossLink: isCrossLink,
        sourceLabel: sourceNode?.label,
        targetLabel: targetNode?.label,
      },
      style: {
        stroke: isCrossLink ? '#FF5722' : '#64748B', // ULTRA bright orange for cross-links, gray for hierarchy
        strokeWidth: isCrossLink ? 7 : 3, // ULTRA THICKER cross-links (increased from 5 to 7)
        strokeDasharray: isCrossLink ? '14,8' : undefined, // ULTRA prominent dashes (longer dashes)
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: isCrossLink ? '#FF5722' : '#64748B',
        width: isCrossLink ? 30 : 18, // MUCH larger arrows for cross-links
        height: isCrossLink ? 30 : 18,
      },
      labelStyle: {
        fill: isCrossLink ? '#D32F2F' : '#1f2937', // ULTRA bright red text for cross-links
        fontWeight: isCrossLink ? 900 : 700,
        fontSize: isCrossLink ? 18 : 14, // Bigger text for cross-links
        padding: '6px 12px',
        letterSpacing: isCrossLink ? '0.8px' : '0.3px', // More spacing for emphasis
      },
      labelBgStyle: {
        fill: isCrossLink ? '#FFEBEE' : '#FFFBEA', // ULTRA bright red bg for cross-links
        fillOpacity: 1,
        stroke: isCrossLink ? '#EF5350' : '#FDE68A', // Brighter stroke
        strokeWidth: isCrossLink ? 3 : 1, // Thicker border
        rx: 8,
        ry: 8,
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

    // PHASE 4.3: Calculate fidelity score and get badge properties
    const fidelity = calculateFidelity(node)
    const fidelityBadge = getFidelityBadge(fidelity)

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
        fidelity: fidelity,
        fidelityBadge: fidelityBadge,
      },
      label: `STEP ${stepNumber}\n${node.label}`, // ReactFlow default nodes use top-level label property
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

    // PHASE 2.4: Educational Tooltips
    const tooltipText = isCrossLink
      ? `Cross-link: This connection shows knowledge integration between "${sourceNode?.label}" and "${targetNode?.label}" across different branches. Cross-links indicate deeper understanding and synthesis.`
      : `"${sourceNode?.label}" ${edge.relationship} "${targetNode?.label}"`;

    reactFlowEdges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: isCrossLink ? 'smoothstep' : 'default',
      label: getRelationshipIcon(edge.relationship) + edge.relationship,  // PHASE 2.2: Add icon prefix
      animated: !isCrossLink,
      data: {
        tooltip: tooltipText,
        isCrossLink: isCrossLink,
        sourceLabel: sourceNode?.label,
        targetLabel: targetNode?.label,
      },
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
        label: date, // ReactFlow default nodes use top-level label property
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

    // PHASE 4.3: Calculate fidelity score and get badge properties
    const fidelity = calculateFidelity(node)
    const fidelityBadge = getFidelityBadge(fidelity)

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
        fidelity: fidelity,
        fidelityBadge: fidelityBadge,
      },
      label: cleanLabel, // ReactFlow default nodes use top-level label property
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
      label: (index + 1).toString(), // ReactFlow default nodes use top-level label property
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
      // PHASE 2.4: Educational Tooltips
      const tooltipText = `"${sourceNode.label}" ${edge.relationship} "${targetNode.label}"`;

      reactFlowEdges.push({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        label: getRelationshipIcon(edge.relationship) + edge.relationship,  // PHASE 2.2: Add icon prefix
        animated: false,
        data: {
          tooltip: tooltipText,
          isCrossLink: false,
          sourceLabel: sourceNode.label,
          targetLabel: targetNode.label,
        },
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
 * PHASE 1.1: Simplified Branch-Based Color Scheme (Tony Buzan Principle)
 * Reduced from 25 gradients to 3-4 main branch colors for clearer visual grouping
 * Each main branch gets a distinct color, sub-branches inherit with tints
 * Based on screenshot reference and radiant thinking principles
 */
const COLOR_SCHEME = {
  // Root node: Maroon/Brown (warm, grounding central concept)
  root: {
    bg: 'linear-gradient(135deg, #8B4513 0%, #6B3410 100%)', // Saddle brown
    text: '#FFFFFF',
    border: '#5C2D0F'
  },

  // Level 1: Main branches (3 distinct colors for visual differentiation)
  level1: [
    { bg: 'linear-gradient(135deg, #2E86AB 0%, #1A5F7A 100%)', text: '#FFFFFF', border: '#145266' }, // Teal
    { bg: 'linear-gradient(135deg, #5B4B8A 0%, #453567 100%)', text: '#FFFFFF', border: '#342651' }, // Purple
    { bg: 'linear-gradient(135deg, #3D5A80 0%, #2A4059 100%)', text: '#FFFFFF', border: '#1F2E42' }, // Blue
  ],

  // Level 2: Sub-branches (lighter tints of main colors)
  level2: [
    { bg: 'linear-gradient(135deg, #4AA5C8 0%, #2E86AB 100%)', text: '#FFFFFF', border: '#1A5F7A' }, // Light teal
    { bg: 'linear-gradient(135deg, #7B68A6 0%, #5B4B8A 100%)', text: '#FFFFFF', border: '#453567' }, // Light purple
    { bg: 'linear-gradient(135deg, #5577AA 0%, #3D5A80 100%)', text: '#FFFFFF', border: '#2A4059' }, // Light blue
  ],

  // Level 3+: Details (even lighter tints)
  level3: [
    { bg: 'linear-gradient(135deg, #66BFDB 0%, #4AA5C8 100%)', text: '#FFFFFF', border: '#2E86AB' }, // Very light teal
    { bg: 'linear-gradient(135deg, #9B85C2 0%, #7B68A6 100%)', text: '#FFFFFF', border: '#5B4B8A' }, // Very light purple
    { bg: 'linear-gradient(135deg, #7794CC 0%, #5577AA 100%)', text: '#FFFFFF', border: '#3D5A80' }, // Very light blue
  ]
};

/**
 * Get color based on node level and branch index
 * Implements branch-based coloring for clear visual hierarchy
 */
function getBranchColor(level: number, branchIndex: number = 0): { bg: string; text: string; border: string } {
  if (level === 0) {
    return COLOR_SCHEME.root;
  } else if (level === 1) {
    const colors = COLOR_SCHEME.level1;
    return colors[branchIndex % colors.length];
  } else if (level === 2) {
    const colors = COLOR_SCHEME.level2;
    return colors[branchIndex % colors.length];
  } else {
    const colors = COLOR_SCHEME.level3;
    return colors[branchIndex % colors.length];
  }
}

/**
 * Helper: Get background color for node using branch-based scheme
 * Simplified from 25-color palette to 3-4 main branch colors
 * All colors meet 4.5:1+ contrast ratio with white text (WCAG AA compliant)
 */
function getColorForCategory(category: string, template: VisualizationTemplate, nodeId?: string, level?: number, branchIndex?: number): string {
  // NEW: Use branch-based coloring for clear visual hierarchy
  const levelToUse = level !== undefined ? level : 1;
  const branchToUse = branchIndex !== undefined ? branchIndex : 0;

  const colors = getBranchColor(levelToUse, branchToUse);
  return colors.bg;
}

/**
 * Helper: Get border color based on level (vibrant borders with depth)
 * Progressive depth with energetic, modern colors
 */
function getColorForLevel(level: number): string {
  // Darker, more saturated borders for better contrast and depth
  const colors = [
    '#4F46E5', // Level 0 (Root): Deep Indigo 600
    '#7C3AED', // Level 1: Deep Purple 600
    '#DB2777', // Level 2: Deep Pink 600
    '#D97706', // Level 3: Deep Amber 600
    '#059669', // Level 4+: Deep Emerald 600
  ];
  return colors[Math.min(level, colors.length - 1)];
}
