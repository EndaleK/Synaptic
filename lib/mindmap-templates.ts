/**
 * Mind Map Visualization Templates
 *
 * Defines different visualization styles for presenting mind map data
 * AI can auto-select the best template based on content analysis
 */

import type { Node, Edge } from 'reactflow';
import type { MindMapNode, MindMapEdge } from './mindmap-generator';

export type TemplateType =
  | 'hierarchical'      // Radial/organic mind map (default, like NotebookLM)
  | 'flowchart'         // Sequential process diagram
  | 'timeline'          // Chronological linear layout
  | 'matrix'            // Comparison grid/table
  | 'network';          // Non-hierarchical concept map with cross-links

export interface TemplateMetadata {
  type: TemplateType;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  bestFor: string[]; // Use cases
  contentIndicators: {
    keywords: string[];        // Keywords that suggest this template
    relationshipTypes: string[]; // Relationship types that fit this template
    structurePatterns: string[];  // Document structure patterns
  };
}

export interface LayoutConfig {
  nodeSpacing: {
    horizontal: number;
    vertical: number;
  };
  orientation: 'horizontal' | 'vertical' | 'radial';
  rankDirection?: 'LR' | 'RL' | 'TB' | 'BT'; // Left-Right, Right-Left, Top-Bottom, Bottom-Top
  gridSize?: number; // For matrix layouts
  timelineSpacing?: number; // For timeline layouts
}

export interface TemplateStyle {
  nodeShape: 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'hexagon';
  nodeColors: string[]; // Color palette
  edgeStyle: 'solid' | 'dashed' | 'dotted' | 'arrow';
  edgeCurvature: 'straight' | 'smooth' | 'step' | 'bezier';
  showLabels: boolean;
  showDescriptions: boolean;
}

export interface VisualizationTemplate {
  metadata: TemplateMetadata;
  layout: LayoutConfig;
  style: TemplateStyle;
  renderHints: {
    emphasizeRoot?: boolean;
    groupByCategory?: boolean;
    showConnections?: boolean;
    highlightCrossLinks?: boolean;
  };
}

/**
 * Template Definitions
 */

export const HIERARCHICAL_TEMPLATE: VisualizationTemplate = {
  metadata: {
    type: 'hierarchical',
    name: 'Hierarchical Mind Map',
    description: 'Radial organic layout perfect for exploring broad topics and concept relationships',
    icon: '🌳',
    bestFor: [
      'General knowledge exploration',
      'Topic overviews',
      'Concept hierarchies',
      'Textbook chapters',
      'Research papers'
    ],
    contentIndicators: {
      keywords: ['concept', 'category', 'type', 'kind', 'includes', 'contains', 'part of'],
      relationshipTypes: ['contains', 'includes', 'has', 'consists of', 'is a type of'],
      structurePatterns: ['deep hierarchy', 'multiple branches', 'general to specific']
    }
  },
  layout: {
    nodeSpacing: {
      horizontal: 300,
      vertical: 150
    },
    orientation: 'radial'
  },
  style: {
    nodeShape: 'rounded',
    nodeColors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
    edgeStyle: 'solid',
    edgeCurvature: 'smooth',
    showLabels: true,
    showDescriptions: true
  },
  renderHints: {
    emphasizeRoot: true,
    groupByCategory: true,
    showConnections: true,
    highlightCrossLinks: true
  }
};

export const FLOWCHART_TEMPLATE: VisualizationTemplate = {
  metadata: {
    type: 'flowchart',
    name: 'Process Flowchart',
    description: 'Step-by-step flow diagram for procedures, algorithms, and sequential processes',
    icon: '➡️',
    bestFor: [
      'How-to guides',
      'Step-by-step instructions',
      'Algorithms and workflows',
      'Decision trees',
      'Research methodologies'
    ],
    contentIndicators: {
      keywords: ['step', 'then', 'next', 'after', 'before', 'first', 'finally', 'process', 'procedure', 'method'],
      relationshipTypes: ['leads to', 'followed by', 'then', 'next', 'results in', 'causes'],
      structurePatterns: ['sequential steps', 'numbered list', 'procedural flow', 'if-then logic']
    }
  },
  layout: {
    nodeSpacing: {
      horizontal: 280,
      vertical: 160
    },
    orientation: 'horizontal',
    rankDirection: 'LR'
  },
  style: {
    nodeShape: 'rectangle',
    nodeColors: ['#3b82f6', '#60a5fa', '#93c5fd'],
    edgeStyle: 'arrow',
    edgeCurvature: 'straight',
    showLabels: true,
    showDescriptions: false
  },
  renderHints: {
    emphasizeRoot: false,
    groupByCategory: false,
    showConnections: true,
    highlightCrossLinks: false
  }
};

export const TIMELINE_TEMPLATE: VisualizationTemplate = {
  metadata: {
    type: 'timeline',
    name: 'Timeline',
    description: 'Chronological visualization for historical events, project phases, or developmental stages',
    icon: '📅',
    bestFor: [
      'Historical events',
      'Project timelines',
      'Biographical content',
      'Evolution and development',
      'Chronological processes'
    ],
    contentIndicators: {
      keywords: ['year', 'date', 'century', 'era', 'period', 'age', 'when', 'timeline', 'history', 'chronology'],
      relationshipTypes: ['preceded by', 'followed by', 'occurred before', 'occurred after', 'during'],
      structurePatterns: ['dates present', 'temporal sequence', 'chronological order', 'time-based']
    }
  },
  layout: {
    nodeSpacing: {
      horizontal: 250,
      vertical: 140
    },
    orientation: 'horizontal',
    rankDirection: 'LR',
    timelineSpacing: 250
  },
  style: {
    nodeShape: 'circle',
    nodeColors: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    edgeStyle: 'solid',
    edgeCurvature: 'straight',
    showLabels: true,
    showDescriptions: true
  },
  renderHints: {
    emphasizeRoot: false,
    groupByCategory: false,
    showConnections: false,
    highlightCrossLinks: false
  }
};

export const MATRIX_TEMPLATE: VisualizationTemplate = {
  metadata: {
    type: 'matrix',
    name: 'Comparison Matrix',
    description: 'Grid layout for comparing concepts, features, or analyzing multiple dimensions',
    icon: '📊',
    bestFor: [
      'Feature comparisons',
      'Pros and cons analysis',
      'Multi-dimensional analysis',
      'Product comparisons',
      'Theoretical frameworks'
    ],
    contentIndicators: {
      keywords: ['compare', 'contrast', 'versus', 'vs', 'difference', 'similarity', 'advantage', 'disadvantage', 'pro', 'con'],
      relationshipTypes: ['differs from', 'similar to', 'contrasts with', 'better than', 'worse than'],
      structurePatterns: ['comparison', 'parallel structure', 'symmetric categories', 'balanced analysis']
    }
  },
  layout: {
    nodeSpacing: {
      horizontal: 220,
      vertical: 140
    },
    orientation: 'vertical',
    rankDirection: 'TB',
    gridSize: 3
  },
  style: {
    nodeShape: 'rectangle',
    nodeColors: ['#ec4899', '#f472b6', '#f9a8d4'],
    edgeStyle: 'dashed',
    edgeCurvature: 'straight',
    showLabels: true,
    showDescriptions: true
  },
  renderHints: {
    emphasizeRoot: false,
    groupByCategory: true,
    showConnections: false,
    highlightCrossLinks: false
  }
};

export const NETWORK_TEMPLATE: VisualizationTemplate = {
  metadata: {
    type: 'network',
    name: 'Network Concept Map',
    description: 'Non-hierarchical web showing complex interconnections and cross-relationships',
    icon: '🕸️',
    bestFor: [
      'Complex systems',
      'Interconnected theories',
      'Scientific concepts',
      'Knowledge synthesis',
      'Systems thinking'
    ],
    contentIndicators: {
      keywords: ['relationship', 'connection', 'network', 'system', 'interrelated', 'depends on', 'influences', 'affects'],
      relationshipTypes: ['depends on', 'influences', 'affects', 'interacts with', 'reinforces', 'inhibits'],
      structurePatterns: ['many cross-links', 'circular dependencies', 'bidirectional', 'complex relationships']
    }
  },
  layout: {
    nodeSpacing: {
      horizontal: 200,
      vertical: 120
    },
    orientation: 'radial'
  },
  style: {
    nodeShape: 'hexagon',
    nodeColors: ['#10b981', '#34d399', '#6ee7b7'],
    edgeStyle: 'solid',
    edgeCurvature: 'bezier',
    showLabels: true,
    showDescriptions: true
  },
  renderHints: {
    emphasizeRoot: false,
    groupByCategory: false,
    showConnections: true,
    highlightCrossLinks: true
  }
};

/**
 * Template Registry
 */
export const TEMPLATES: Record<TemplateType, VisualizationTemplate> = {
  hierarchical: HIERARCHICAL_TEMPLATE,
  flowchart: FLOWCHART_TEMPLATE,
  timeline: TIMELINE_TEMPLATE,
  matrix: MATRIX_TEMPLATE,
  network: NETWORK_TEMPLATE
};

/**
 * Get template by type
 */
export function getTemplate(type: TemplateType): VisualizationTemplate {
  return TEMPLATES[type];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): VisualizationTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Analyze content to recommend best template
 * Returns scored recommendations
 */
export function analyzeContentForTemplate(content: {
  text: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}): Array<{ template: TemplateType; score: number; reason: string }> {
  const scores: Array<{ template: TemplateType; score: number; reason: string }> = [];
  const textLower = content.text.toLowerCase();
  const relationships = content.edges.map(e => e.relationship.toLowerCase());

  // Analyze each template
  Object.entries(TEMPLATES).forEach(([type, template]) => {
    let score = 0;
    const reasons: string[] = [];

    // Check keywords in content
    const keywordMatches = template.metadata.contentIndicators.keywords.filter(
      keyword => textLower.includes(keyword)
    );
    if (keywordMatches.length > 0) {
      const keywordScore = Math.min(keywordMatches.length * 10, 40);
      score += keywordScore;
      reasons.push(`${keywordMatches.length} keyword matches`);
    }

    // Check relationship types
    const relationshipMatches = template.metadata.contentIndicators.relationshipTypes.filter(
      relType => relationships.some(r => r.includes(relType.toLowerCase()))
    );
    if (relationshipMatches.length > 0) {
      const relScore = Math.min(relationshipMatches.length * 15, 40);
      score += relScore;
      reasons.push(`${relationshipMatches.length} relationship type matches`);
    }

    // Structure-based scoring
    const crossLinkCount = content.edges.filter(edge => {
      const sourceNode = content.nodes.find(n => n.id === edge.from);
      const targetNode = content.nodes.find(n => n.id === edge.to);
      return sourceNode && targetNode && Math.abs(sourceNode.level - targetNode.level) > 1;
    }).length;

    if (type === 'network' && crossLinkCount > content.edges.length * 0.15) {
      score += 30;
      reasons.push('High number of cross-links detected');
    }

    if (type === 'flowchart' && content.nodes.length < 15) {
      score += 20;
      reasons.push('Sequential structure detected');
    }

    if (type === 'timeline' && /\d{4}|\b(year|century|era)\b/i.test(content.text)) {
      score += 35;
      reasons.push('Temporal references detected');
    }

    if (type === 'matrix' && /(compar|contrast|vs|versus|differ)/i.test(content.text)) {
      score += 30;
      reasons.push('Comparison language detected');
    }

    // Default to hierarchical if nothing else scores well
    if (type === 'hierarchical') {
      score += 10; // Base score for default
    }

    scores.push({
      template: type as TemplateType,
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'No specific indicators'
    });
  });

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Get recommended template based on content analysis
 */
export function getRecommendedTemplate(content: {
  text: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}): { template: TemplateType; confidence: number; reason: string } {
  const analysis = analyzeContentForTemplate(content);
  const best = analysis[0];

  return {
    template: best.template,
    confidence: Math.min(best.score / 100, 1), // Normalize to 0-1
    reason: best.reason
  };
}
