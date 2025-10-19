import OpenAI from "openai"
import { chunkDocument, getChunkingSummary, type ChunkOptions } from "./document-chunker"

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

/**
 * Generate mind map from large documents by chunking and merging
 * Merges sub-mind maps into a comprehensive hierarchical structure
 */
export async function generateMindMapChunked(
  options: GenerateMindMapOptions,
  chunkOptions: ChunkOptions = {},
  onProgress?: (current: number, total: number, message: string) => void
): Promise<MindMapData> {
  const { text, maxNodes = 25, maxDepth = 3 } = options

  console.log(`[Chunked Mind Map] Starting chunked generation for ${text.length} characters`)

  // Chunk the document
  const chunkingResult = chunkDocument(text, chunkOptions)
  console.log(`[Chunked Mind Map] ${getChunkingSummary(chunkingResult)}`)

  if (onProgress) {
    onProgress(0, chunkingResult.totalChunks, `Analyzing ${chunkingResult.totalChunks} sections`)
  }

  // Generate mind map for each chunk
  const chunkMindMaps: MindMapData[] = []
  const nodesPerChunk = Math.ceil(maxNodes / chunkingResult.totalChunks)

  for (let i = 0; i < chunkingResult.chunks.length; i++) {
    const chunk = chunkingResult.chunks[i]
    const progressMsg = `Processing section ${i + 1}/${chunkingResult.totalChunks}`

    console.log(`[Chunked Mind Map] ${progressMsg}`)

    if (onProgress) {
      onProgress(i + 1, chunkingResult.totalChunks, progressMsg)
    }

    try {
      const chunkMindMap = await generateMindMap({
        text: chunk.text,
        maxNodes: nodesPerChunk,
        maxDepth: maxDepth - 1 // Reserve one level for root
      })

      chunkMindMaps.push(chunkMindMap)

      console.log(`[Chunked Mind Map] Generated sub-map ${i + 1}: ${chunkMindMap.nodes.length} nodes`)
    } catch (error) {
      console.error(`[Chunked Mind Map] Error processing chunk ${i + 1}:`, error)
      // Continue with other chunks
    }
  }

  // Merge all mind maps into one hierarchical structure
  const mergedMindMap = mergeMindMaps(chunkMindMaps, text)

  console.log(`[Chunked Mind Map] Merged result: ${mergedMindMap.nodes.length} nodes, ${mergedMindMap.edges.length} edges`)

  if (onProgress) {
    onProgress(
      chunkingResult.totalChunks,
      chunkingResult.totalChunks,
      `Complete! Generated mind map with ${mergedMindMap.nodes.length} nodes`
    )
  }

  return mergedMindMap
}

/**
 * Merge multiple mind maps into a single comprehensive map
 */
function mergeMindMaps(mindMaps: MindMapData[], originalText: string): MindMapData {
  if (mindMaps.length === 0) {
    throw new Error("No mind maps to merge")
  }

  if (mindMaps.length === 1) {
    return mindMaps[0]
  }

  // Create a root node to connect all sub-maps
  const rootId = "root"
  const title = mindMaps[0].title || "Comprehensive Mind Map"

  const mergedNodes: MindMapNode[] = [
    {
      id: rootId,
      label: title,
      level: 0,
      description: `Overview of ${originalText.substring(0, 100)}...`,
      category: "concept"
    }
  ]

  const mergedEdges: MindMapEdge[] = []
  const allCategories = new Set<string>()

  // Add nodes and edges from each sub-map, incrementing levels
  mindMaps.forEach((map, index) => {
    const idPrefix = `chunk${index}_`

    // Add nodes with incremented levels and prefixed IDs
    map.nodes.forEach(node => {
      const newNode: MindMapNode = {
        ...node,
        id: node.level === 0 ? idPrefix + "root" : idPrefix + node.id,
        level: node.level + 1 // Increment by 1 to make room for root
      }

      mergedNodes.push(newNode)

      if (node.category) {
        allCategories.add(node.category)
      }

      // Connect chunk root to main root
      if (node.level === 0) {
        mergedEdges.push({
          id: `root_to_${idPrefix}`,
          from: rootId,
          to: newNode.id,
          relationship: "contains"
        })
      }
    })

    // Add edges with prefixed IDs
    map.edges.forEach(edge => {
      mergedEdges.push({
        ...edge,
        id: idPrefix + edge.id,
        from: edge.from === map.nodes[0].id ? idPrefix + "root" : idPrefix + edge.from,
        to: idPrefix + edge.to
      })
    })
  })

  const maxDepthFound = Math.max(...mergedNodes.map(n => n.level))

  return {
    title,
    nodes: mergedNodes,
    edges: mergedEdges,
    metadata: {
      totalNodes: mergedNodes.length,
      maxDepth: maxDepthFound,
      categories: Array.from(allCategories)
    }
  }
}
