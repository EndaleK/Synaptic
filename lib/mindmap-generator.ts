import { chunkDocument, getChunkingSummary, type ChunkOptions } from "./document-chunker"
import { getProviderForFeature, type AIProvider } from "./ai"
import { type TemplateType, getRecommendedTemplate, TEMPLATES } from "./mindmap-templates"

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
  template: TemplateType // Visualization template selected by AI or user
  templateReason?: string // Why this template was chosen
  metadata: {
    totalNodes: number
    maxDepth: number
    categories: string[]
  }
}

interface GenerateMindMapOptions {
  text: string
  maxNodes?: number // Maximum nodes to generate (default 36)
  maxDepth?: number // Maximum depth levels (default 4)
  provider?: AIProvider // Optional provider (defaults to configured provider for 'mindmap' feature)
  template?: TemplateType // Optional template override (AI auto-selects if not provided)
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
    maxNodes = 36,
    maxDepth = 4,
    provider: customProvider,
    template: userTemplate
  } = options

  // Get provider (use custom if provided, otherwise get configured provider)
  const provider = customProvider || getProviderForFeature('mindmap')

  if (!provider.isConfigured()) {
    throw new Error(`AI provider not configured. Please add the appropriate API key to your environment variables.`)
  }

  console.log(`[MindMap] Using ${provider.name} provider for generation`)

  // Determine visualization template
  let selectedTemplate: TemplateType = userTemplate || 'hierarchical' // Default to hierarchical if not specified
  let templateSelectionMode: 'user' | 'ai-auto' = userTemplate ? 'user' : 'ai-auto'

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

  const systemPrompt = `You are an expert at creating CONCEPT MAPS - hierarchical, networked knowledge structures with explicit labeled relationships.

CONCEPT MAP PRINCIPLES (NOT traditional mind maps):
1. **Hierarchical & Networked**: Top-down organization (most general → specific) with cross-links between branches
2. **Explicit Relationships**: Every connection MUST have a labeled linking phrase (e.g., "leads to", "is a type of", "requires")
3. **Propositional Structure**: Each edge forms a readable sentence: Concept1 + Linking Phrase + Concept2
4. **Cross-Links**: Connect related concepts across different branches to show knowledge integration

CORE DESIGN GOALS:
✓ Answer a focus question about the document's main topic
✓ Create clear visual-verbal mnemonics for deep understanding
✓ Show both hierarchy (top-down) AND network (cross-links)
✓ Enable verification of knowledge through complete propositions

HIERARCHICAL STRUCTURE:
- **Level 0** (Root): Most general, inclusive concept (answers "What is this about?")
- **Level 1** (Major Concepts): 4-7 primary concepts (broad categories)
- **Level 2** (Subconcepts): 3-5 subdivisions per major concept
- **Level 3** (Details): 2-4 specific points (examples, applications)
- **Level 4** (Optional): Granular supporting details

NODE LABELING (Critical for Readability & Cognitive Load Reduction):
- Root: Clear, inclusive concept (e.g., "Safety Protocol Implementation")
- Level 1: Broad categories (e.g., "Heat-Related Hazards", "Emergency Procedures")
- Levels 2-4: Specific terms/concepts (e.g., "Heat Exhaustion Symptoms", "Buddy System Protocol")
- Use NOUNS or NOUN PHRASES (not sentences)
- Keep VERY concise: Maximum 6 words per label (4 words ideal for deeper levels)
- Research shows: Brief keywords reduce cognitive load and improve comprehension
- Save detailed explanations for descriptions, not labels

DESCRIPTION GUIDELINES (Cognitive Load Management):
- Labels are BRIEF KEYWORDS - descriptions hold the rich detail
- Provide comprehensive context and explanations in descriptions
- Include specific examples, data, applications, and connections
- Help users understand WHY this concept matters and HOW it relates to others
- This separation (brief label + rich description) reduces visual clutter while preserving depth

CATEGORY ASSIGNMENT (for color coding):
- **concept**: Abstract ideas, theories, frameworks
- **principle**: Rules, laws, guidelines, best practices
- **process**: Procedures, methods, workflows
- **technique**: Specific skills, tools, applications
- **example**: Case studies, illustrations, scenarios
- **data**: Statistics, metrics, facts
- **definition**: Key terms, terminology
- **outcome**: Results, benefits, consequences

RELATIONSHIP TYPES (Critical - MUST be specific and meaningful):
**Hierarchical (parent → child):**
- "includes" / "contains" / "consists of"
- "is divided into"
- "has types"

**Causal & Sequential:**
- "leads to" / "causes" / "results in"
- "prevents" / "reduces"
- "follows" / "preceded by"

**Definitional & Classificatory:**
- "is a type of" / "is an example of"
- "is defined as"
- "characterized by"

**Functional & Dependency:**
- "requires" / "depends on" / "needs"
- "uses" / "employs"
- "produces" / "generates"

**Comparative & Associative:**
- "contrasts with" / "differs from"
- "similar to" / "related to"
- "supports" / "reinforces"

CROSS-LINKS (10-20% of total edges):
- Connect concepts from DIFFERENT branches
- Show knowledge integration and synthesis
- Use relationships like: "reinforces", "contrasts with", "applies to", "exemplifies"
- Example: "Heat Exhaustion" → "requires" → "Buddy System Protocol"

Target: ${maxNodes} nodes maximum, ${maxDepth} levels deep
Aim for: ~${Math.ceil(maxNodes * 0.20)} main branches (level 1), each with ${Math.floor((maxNodes - Math.ceil(maxNodes * 0.20)) / Math.ceil(maxNodes * 0.20))} sub-branches
CRITICAL: Include ${Math.ceil(maxNodes * 0.15)} cross-links connecting concepts from different branches!

Return ONLY a valid JSON object in this exact format:
{
  "title": "Main topic/title (the focus question answer)",
  "nodes": [
    {
      "id": "unique_snake_case_id",
      "label": "Concise Concept Label",
      "level": 0,
      "description": "Detailed explanation with context, examples, or significance",
      "category": "concept"
    }
  ],
  "edges": [
    {
      "id": "edge_unique_id",
      "from": "source_concept_id",
      "to": "target_concept_id",
      "relationship": "specific linking phrase (e.g., 'is a type of', 'leads to', 'requires')"
    }
  ]
}

EDGE REQUIREMENTS:
1. Every node (except root) MUST have at least one incoming hierarchical edge
2. Include cross-links (10-20% of edges) between concepts in different branches
3. Use SPECIFIC, MEANINGFUL relationship labels - avoid generic "contains" when possible
4. Ensure relationships form complete, readable propositions

EXAMPLE of good cross-link:
{
  "from": "heat_exhaustion",
  "to": "buddy_system",
  "relationship": "prevented by using"
}
This creates: "Heat Exhaustion" + "prevented by using" + "Buddy System" = complete knowledge proposition

DO NOT include any text outside the JSON object.`

  const userPrompt = `Extract a hierarchical mind map from this content:

<content>
${processedText}
</content>

Create a clear, well-structured mind map with ${maxNodes} nodes organized in ${maxDepth} levels.`

  try {
    const response = await provider.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        temperature: 0.5, // Balanced between creativity and structure
        maxTokens: 8000, // Increased to prevent JSON truncation
      }
    )

    let responseText = response.content || "{}"

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Log response length for debugging
    console.log(`[MindMap] Response length: ${responseText.length} chars, tokens used: ${response.usage?.totalTokens || 'unknown'}`)

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

      // Calculate metadata first
      const maxDepthFound = Math.max(...validatedNodes.map(n => n.level))
      const categories = Array.from(new Set(validatedNodes.map(n => n.category).filter(Boolean)))

      // Determine final template using content analysis
      let templateReason = '';

      if (templateSelectionMode === 'user') {
        // User explicitly selected template
        templateReason = 'User selected template';
      } else {
        // Auto-detect template based on content
        const contentAnalysis = getRecommendedTemplate({
          text: processedText,
          nodes: validatedNodes,
          edges: validatedEdges
        });

        selectedTemplate = contentAnalysis.template;
        templateReason = contentAnalysis.reason || `Auto-selected ${selectedTemplate} template based on content`;

        console.log(`[MindMap] Template auto-selected: ${selectedTemplate} (confidence: ${Math.round(contentAnalysis.confidence * 100)}%)`);
      }

      console.log(`[MindMap] Final template: ${selectedTemplate} - ${templateReason}`);

      const mindMapData: MindMapData = {
        title: parsed.title || "Mind Map",
        nodes: validatedNodes,
        edges: validatedEdges,
        template: selectedTemplate,
        templateReason,
        metadata: {
          totalNodes: validatedNodes.length,
          maxDepth: maxDepthFound,
          categories
        }
      }

      console.log(`Generated mind map: "${mindMapData.title}", ${validatedNodes.length} nodes, ${validatedEdges.length} edges, depth ${maxDepthFound}`)

      return mindMapData

    } catch (parseError) {
      console.error("Failed to parse mind map JSON. Response preview:", responseText.substring(0, 500))
      console.error("Response end (last 500 chars):", responseText.substring(Math.max(0, responseText.length - 500)))
      console.error("Parse error:", parseError)

      // Try to recover by fixing common JSON issues
      let fixedText = responseText;

      // If truncated mid-array, try closing it
      if (responseText.includes('"edges"') && !responseText.trim().endsWith('}')) {
        console.log("Attempting to fix truncated JSON...");
        fixedText = responseText.trim();

        // Close any open string
        const openQuotes = (fixedText.match(/"/g) || []).length;
        if (openQuotes % 2 !== 0) {
          fixedText += '"';
        }

        // Close the edges array if needed
        if (!fixedText.includes(']}')) {
          fixedText += ']}';
        }

        // Close the main object
        if (!fixedText.endsWith('}')) {
          fixedText += '}';
        }

        try {
          const recovered = JSON.parse(fixedText);
          console.log("Successfully recovered truncated JSON!");
          // Continue with recovered data but with reduced nodes
          if (recovered.nodes && recovered.edges) {
            // Re-run through validation
            responseText = JSON.stringify(recovered);
            throw new Error("RETRY_PARSE"); // Signal to retry parsing
          }
        } catch (retryError) {
          console.error("Recovery failed:", retryError);
        }
      }

      throw new Error(`Failed to parse mind map: ${parseError}`)
    }

  } catch (error: any) {
    console.error(`${provider.name} API error (mind map):`, error)
    if (error.response) {
      console.error("Response:", error.response.data)
      throw new Error(`${provider.name} API error: ${error.response.data?.error?.message || error.message}`)
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
  const { text, maxNodes = 25, maxDepth = 3, provider } = options

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
        maxDepth: maxDepth - 1, // Reserve one level for root
        provider // Pass through provider
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

  // Use the template from the first mind map (they should all be similar content)
  const mergedTemplate = mindMaps[0].template || 'hierarchical';

  return {
    title,
    nodes: mergedNodes,
    edges: mergedEdges,
    template: mergedTemplate,
    templateReason: `Merged from ${mindMaps.length} sections`,
    metadata: {
      totalNodes: mergedNodes.length,
      maxDepth: maxDepthFound,
      categories: Array.from(allCategories)
    }
  }
}
