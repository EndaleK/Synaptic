import OpenAI from "openai"

export interface MindMapNode {
  id: string
  label: string
  level: number // 0 = root, 1 = main topics, 2 = subtopics, etc.
  description: string
  category?: string // For color coding
}

export interface MindMapEdge {
  id: string
  from: string // source node id
  to: string // target node id
  relationship: string // "contains", "relates to", "depends on", etc.
}

export interface MindMapData {
  title: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  metadata: {
    totalNodes: number
    maxDepth: number
    categories: string[]
  }
}

interface GenerateMindMapOptions {
  text: string
  maxNodes?: number // Maximum nodes to generate (default 25)
  maxDepth?: number // Maximum depth levels (default 3)
}

/**
 * Generate a hierarchical mind map from document text
 * Mimics NotebookLM's Mind Map feature
 */
export async function generateMindMap(
  options: GenerateMindMapOptions
): Promise<MindMapData> {
  const {
    text,
    maxNodes = 25,
    maxDepth = 3
  } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Truncate if necessary
  const maxChars = 48000
  let processedText = text
  if (text.length > maxChars) {
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`Mind map: Text truncated from ${text.length} to ${processedText.length} characters`)
  }

  const systemPrompt = `You are an expert at extracting hierarchical knowledge structures from text. Create a comprehensive mind map that visualizes the main concepts and their relationships.

Guidelines:
1. Identify the main topic (root node - level 0)
2. Extract key themes and concepts (level 1 nodes - typically 3-6 main branches)
3. Break down each theme into subtopics (level 2 nodes)
4. Add detailed concepts if relevant (level 3 nodes)
5. Ensure nodes are concise (3-8 words ideal)
6. Create meaningful relationships between nodes
7. Assign categories for color coding (e.g., "concept", "process", "example", "definition")

Target: ${maxNodes} nodes maximum, ${maxDepth} levels deep

Return ONLY a valid JSON object in this exact format:
{
  "title": "Main topic/title of the document",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Node label (concise)",
      "level": 0,
      "description": "Brief explanation of this concept",
      "category": "concept" | "process" | "example" | "definition" | "principle"
    }
  ],
  "edges": [
    {
      "id": "edge_unique_id",
      "from": "parent_node_id",
      "to": "child_node_id",
      "relationship": "contains" | "leads to" | "example of" | "related to"
    }
  ]
}

DO NOT include any text outside the JSON object.`

  const userPrompt = `Extract a hierarchical mind map from this content:

<content>
${processedText}
</content>

Create a clear, well-structured mind map with ${maxNodes} nodes organized in ${maxDepth} levels.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5, // Balanced between creativity and structure
      max_tokens: 4000,
    })

    let responseText = completion.choices[0]?.message?.content || "{}"

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    try {
      const parsed = JSON.parse(responseText)

      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error("Invalid mind map format: missing nodes array")
      }

      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        throw new Error("Invalid mind map format: missing edges array")
      }

      // Validate and normalize nodes
      const validatedNodes: MindMapNode[] = parsed.nodes.map((node: any, index: number) => {
        if (!node.id || !node.label) {
          throw new Error(`Invalid node ${index}: missing id or label`)
        }

        return {
          id: node.id,
          label: node.label.trim(),
          level: typeof node.level === 'number' ? node.level : 0,
          description: node.description || '',
          category: node.category || 'concept'
        }
      })

      // Validate and normalize edges
      const validatedEdges: MindMapEdge[] = parsed.edges.map((edge: any, index: number) => {
        if (!edge.from || !edge.to) {
          throw new Error(`Invalid edge ${index}: missing from or to`)
        }

        // Verify nodes exist
        const fromExists = validatedNodes.some(n => n.id === edge.from)
        const toExists = validatedNodes.some(n => n.id === edge.to)

        if (!fromExists || !toExists) {
          console.warn(`Edge ${index} references non-existent nodes: ${edge.from} -> ${edge.to}`)
        }

        return {
          id: edge.id || `edge_${index}`,
          from: edge.from,
          to: edge.to,
          relationship: edge.relationship || 'contains'
        }
      })

      // Calculate metadata
      const maxDepthFound = Math.max(...validatedNodes.map(n => n.level))
      const categories = Array.from(new Set(validatedNodes.map(n => n.category).filter(Boolean)))

      const mindMapData: MindMapData = {
        title: parsed.title || "Mind Map",
        nodes: validatedNodes,
        edges: validatedEdges,
        metadata: {
          totalNodes: validatedNodes.length,
          maxDepth: maxDepthFound,
          categories
        }
      }

      console.log(`Generated mind map: "${mindMapData.title}", ${validatedNodes.length} nodes, ${validatedEdges.length} edges, depth ${maxDepthFound}`)

      return mindMapData

    } catch (parseError) {
      console.error("Failed to parse mind map:", responseText)
      throw new Error(`Failed to parse mind map: ${parseError}`)
    }

  } catch (error: any) {
    console.error("OpenAI API error (mind map):", error)
    if (error.response) {
      console.error("Response:", error.response.data)
      throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`)
    }
    throw new Error(`Failed to generate mind map: ${error.message}`)
  }
}

/**
 * Validate mind map data structure
 */
export function validateMindMap(data: MindMapData): boolean {
  // Check for root node
  const hasRoot = data.nodes.some(n => n.level === 0)
  if (!hasRoot) {
    console.error("Mind map validation failed: No root node found")
    return false
  }

  // Check for orphaned nodes (nodes with no incoming or outgoing edges)
  const nodeIds = new Set(data.nodes.map(n => n.id))
  const connectedNodes = new Set<string>()

  data.edges.forEach(edge => {
    connectedNodes.add(edge.from)
    connectedNodes.add(edge.to)
  })

  const orphanedCount = data.nodes.length - connectedNodes.size
  if (orphanedCount > 1) { // Allow root to have no incoming edge
    console.warn(`Mind map has ${orphanedCount} orphaned nodes`)
  }

  return true
}
