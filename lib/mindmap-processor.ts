import type { Node, Edge } from 'reactflow';

/**
 * Represents a hierarchical concept in the mind map
 */
export interface Concept {
  id: string;
  label: string;
  description?: string;
  children?: Concept[];
}

/**
 * Mind map data structure from AI
 */
export interface MindMapData {
  title: string;
  rootConcept: Concept;
}

/**
 * ReactFlow node with custom data
 */
export interface MindMapNode extends Node {
  data: {
    label: string;
    description?: string;
    level: number;
  };
}

/**
 * Layout configuration
 */
interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  nodeWidth: number;
  nodeHeight: number;
}

const defaultLayout: LayoutConfig = {
  horizontalSpacing: 250,
  verticalSpacing: 100,
  nodeWidth: 180,
  nodeHeight: 80,
};

/**
 * Convert hierarchical concepts to ReactFlow nodes and edges
 */
export function conceptsToReactFlow(
  mindMapData: MindMapData,
  layoutConfig: LayoutConfig = defaultLayout
): { nodes: MindMapNode[]; edges: Edge[] } {
  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];

  // Calculate positions using a tree layout algorithm
  const { horizontalSpacing, verticalSpacing } = layoutConfig;

  function processNode(
    concept: Concept,
    level: number,
    x: number,
    y: number,
    parentId?: string
  ): number {
    // Create node
    const node: MindMapNode = {
      id: concept.id,
      type: level === 0 ? 'input' : 'default',
      data: {
        label: concept.label,
        description: concept.description,
        level,
      },
      position: { x, y },
      style: {
        background: getNodeColor(level),
        color: 'white',
        border: '2px solid #222',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: level === 0 ? 'bold' : 'normal',
        padding: '10px',
        width: layoutConfig.nodeWidth,
        minHeight: layoutConfig.nodeHeight,
      },
    };
    nodes.push(node);

    // Create edge from parent
    if (parentId) {
      edges.push({
        id: `${parentId}-${concept.id}`,
        source: parentId,
        target: concept.id,
        type: 'smoothstep',
        animated: level === 1,
        style: { stroke: '#555', strokeWidth: 2 },
      });
    }

    // Process children
    if (concept.children && concept.children.length > 0) {
      const childrenCount = concept.children.length;
      const totalChildWidth = childrenCount * horizontalSpacing;
      let currentX = x - totalChildWidth / 2 + horizontalSpacing / 2;

      concept.children.forEach((child) => {
        const childY = y + verticalSpacing;
        currentX = processNode(child, level + 1, currentX, childY, concept.id);
        currentX += horizontalSpacing;
      });
    }

    return x;
  }

  // Start processing from root
  const rootX = 0;
  const rootY = 0;
  processNode(mindMapData.rootConcept, 0, rootX, rootY);

  // Center the entire graph
  const centerX = 400; // Center horizontally
  const centerY = 50; // Small top margin
  nodes.forEach((node) => {
    node.position.x += centerX;
    node.position.y += centerY;
  });

  return { nodes, edges };
}

/**
 * Get color based on hierarchy level
 */
function getNodeColor(level: number): string {
  const colors = [
    '#6366f1', // Indigo - Root
    '#8b5cf6', // Purple - Level 1
    '#ec4899', // Pink - Level 2
    '#f59e0b', // Amber - Level 3
    '#10b981', // Green - Level 4+
  ];

  return colors[Math.min(level, colors.length - 1)];
}

/**
 * Parse AI response into MindMapData
 * Handles various formats and validates structure
 */
export function parseAIMindMap(aiResponse: string): MindMapData {
  try {
    // Remove markdown code blocks if present
    const cleanResponse = aiResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleanResponse);

    // Validate structure
    if (!parsed.title || !parsed.rootConcept) {
      throw new Error('Invalid mind map structure: missing title or rootConcept');
    }

    if (!parsed.rootConcept.id || !parsed.rootConcept.label) {
      throw new Error('Invalid root concept: missing id or label');
    }

    // Ensure all concepts have unique IDs
    const ids = new Set<string>();
    function validateAndGenerateIds(concept: Concept, parentPrefix = ''): void {
      if (!concept.id || ids.has(concept.id)) {
        concept.id = `${parentPrefix}_${concept.label.toLowerCase().replace(/\s+/g, '_')}`;
      }
      ids.add(concept.id);

      if (concept.children) {
        concept.children.forEach((child, index) => {
          validateAndGenerateIds(child, `${concept.id}_${index}`);
        });
      }
    }

    validateAndGenerateIds(parsed.rootConcept);

    return parsed as MindMapData;
  } catch (error) {
    console.error('Failed to parse AI mind map response:', error);
    throw new Error('Failed to parse mind map data: ' + (error as Error).message);
  }
}

/**
 * Generate a simple example mind map (for testing/fallback)
 */
export function generateExampleMindMap(documentTitle: string): MindMapData {
  return {
    title: documentTitle || 'Document Concepts',
    rootConcept: {
      id: 'root',
      label: 'Main Topic',
      description: 'Central concept from the document',
      children: [
        {
          id: 'concept_1',
          label: 'Key Concept 1',
          description: 'Important idea from the text',
          children: [
            {
              id: 'concept_1_1',
              label: 'Sub-concept 1.1',
            },
            {
              id: 'concept_1_2',
              label: 'Sub-concept 1.2',
            },
          ],
        },
        {
          id: 'concept_2',
          label: 'Key Concept 2',
          description: 'Another important idea',
          children: [
            {
              id: 'concept_2_1',
              label: 'Sub-concept 2.1',
            },
          ],
        },
        {
          id: 'concept_3',
          label: 'Key Concept 3',
        },
      ],
    },
  };
}
