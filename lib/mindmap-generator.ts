import { chunkDocument, getChunkingSummary, type ChunkOptions } from "./document-chunker"
import { getProviderForFeature, type AIProvider } from "./ai"
import { type TemplateType, getRecommendedTemplate, TEMPLATES } from "./mindmap-templates"
import { type MindMapType } from "./supabase/types"

export interface MindMapNode {
  id: string
  label: string
  level: number // 0 = root, 1 = main topics, 2 = subtopics, etc.
  description: string
  category?: string // For color coding
  fidelity?: number // 0-100 score indicating how well this concept is supported by source material
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
  mapType?: MindMapType // Type of mind map: hierarchical, radial, or concept (default: hierarchical)
}

/**
 * Generate type-specific system prompt for mind map generation
 */
function getSystemPromptForMapType(mapType: MindMapType, maxNodes: number, maxDepth: number): string {
  const baseSourceFidelity = `
TONY BUZAN'S RADIANT THINKING PRINCIPLES (PHASE 4.1 - CRITICAL):
⚠️ Mind maps mirror natural brain function - think in RADIATING patterns:

1. **Central Image/Concept**: Start from ONE central idea and radiate outward
2. **Natural Association**: Each branch triggers the next association (like neurons firing)
3. **Hierarchy of Importance**: Main branches = most important, sub-branches = supporting details
4. **Sensory-Rich Descriptions**: Use vivid, concrete language that evokes mental imagery
   - Instead of: "Process step" → Use: "Rapid cooling procedure" or "Gradual warming method"
   - Add sensory details: colors, textures, sounds, feelings when relevant to text
5. **Personal Connections**: When text includes examples or analogies, highlight them
6. **Dimension & Emphasis**: More important concepts deserve richer descriptions
7. **Organic Flow**: Branches should flow naturally from parent concepts

SOURCE FIDELITY REQUIREMENTS (CRITICAL - MUST FOLLOW):
⚠️ These rules override all other instructions when conflicts arise:
1. **Content Restriction**: Create nodes and relationships ONLY from concepts explicitly mentioned in the provided document content
2. **No External Knowledge**: Do NOT add nodes, descriptions, or relationships based on your general knowledge of the topic
3. **Text-Based Relationships**: Relationships must be supported by the TEXT, not by what you know about the topic in general
4. **Description Fidelity**: Node descriptions must derive directly from the text - NO external elaboration or context
5. **Incomplete Information Handling**: If the text doesn't provide enough information for a complete mind map structure, create a smaller/simpler map rather than adding external knowledge
6. **Cross-Link Limitation**: Only create cross-links between concepts that are actually related IN THE TEXT, not in general knowledge
7. **No Assumptions**: Do not assume relationships, examples, or details that aren't stated in the source text
8. **Quote Priority**: When in doubt, use direct quotes from the text rather than paraphrasing with external context
9. **Sensory Language**: When text uses vivid/sensory language, PRESERVE it in descriptions

If following these rules results in fewer nodes than the target, that is acceptable - accuracy and source fidelity are more important than hitting the target node count.`

  const baseLabelingGuidelines = `
NODE LABELING - TONY BUZAN'S "ONE KEYWORD PER BRANCH" RULE (CRITICAL):
⚠️ This is the CORE principle of effective mind mapping - STRICTLY ENFORCE:

- **Root (Level 0)**: 2-3 words maximum for central concept (e.g., "Safety Protocols", "Heat Management")
- **ALL OTHER LEVELS (1-4)**: SINGLE KEYWORD ONLY
  - Level 1: Single noun (e.g., "Hazards", "Prevention", "Response")
  - Level 2: Single keyword (e.g., "Exhaustion", "Hydration", "Training")
  - Level 3: Single term (e.g., "Symptoms", "Schedule", "Equipment")
  - Level 4: Single word (e.g., "Dizziness", "Frequency", "Buddy")

WHY SINGLE KEYWORDS MATTER (Research-Backed):
1. **Cognitive Load**: Single words process 300% faster than phrases
2. **Memory Recall**: Keywords trigger associations better than sentences
3. **Visual Clarity**: Creates clean, scannable hierarchies
4. **Creative Thinking**: Forces distillation to essence of concept

STRICT ENFORCEMENT:
- DO NOT use phrases like "Heat Exhaustion Symptoms" → Use "Symptoms" (put "heat exhaustion" in description)
- DO NOT use sentences or multiple words → ONE keyword ONLY
- Use NOUNS predominantly (action words only when noun doesn't work)
- Compound words are acceptable if commonly used as single unit (e.g., "Heatstroke", "Teamwork")

DESCRIPTION GUIDELINES (Where Details Belong):
- Labels are SINGLE KEYWORDS - descriptions hold ALL the rich detail
- Put multi-word concepts, context, and explanations in descriptions
- Include specific examples, data, applications, and connections in descriptions
- Example: Label "Symptoms" → Description "Heat exhaustion warning signs include dizziness, nausea, excessive sweating"
- This separation (single keyword + rich description) is the KEY to effective mind maps`

  const categoryAssignment = `
CATEGORY ASSIGNMENT - BUZAN'S IMAGE ASSOCIATION (PHASE 4.1):
⚠️ Categories trigger emoji icons for powerful visual memory anchors:

- **concept** 💡: Abstract ideas, theories, frameworks (lightbulb = "aha!" moment)
- **principle** 📏: Rules, laws, guidelines, best practices (ruler = measurement/standards)
- **process** ⚙️: Procedures, methods, workflows (gear = machinery in motion)
- **technique** 🛠️: Specific skills, tools, applications (toolbox = practical doing)
- **example** 📝: Case studies, illustrations, scenarios (notepad = real-world instances)
- **data** 📊: Statistics, metrics, facts (chart = quantifiable information)
- **definition** 📖: Key terms, terminology (book = authoritative source)
- **outcome** 🎯: Results, benefits, consequences (target = goals achieved)
- **person** 👤: Individuals, roles, stakeholders (person = human element)
- **question** ❓: Inquiries, uncertainties, investigations (question mark = curiosity)
- **solution** ✓: Answers, fixes, resolutions (checkmark = problem solved)
- **warning** ⚠️: Risks, dangers, cautions (warning sign = attention needed)

SELECTION STRATEGY:
- Choose categories that create STRONGEST visual association for the concept
- More important nodes → pick categories with distinctive icons (e.g., 🎯 for key outcomes)
- When in doubt, use **concept** 💡 as default (universal "idea" symbol)`

  if (mapType === 'hierarchical') {
    return `You are an expert at creating HIERARCHICAL MIND MAPS - tree-structured knowledge representations optimized for top-down learning.

HIERARCHICAL MIND MAP PRINCIPLES:
1. **Strict Tree Structure**: Every node has exactly one parent (except root), creating clear hierarchical relationships
2. **Top-Down Organization**: Most general concepts at top → specific details at bottom
3. **Clear Levels**: Distinct depth levels with consistent categorization
4. **No Cross-Links**: Pure tree structure - no connections between branches (this distinguishes it from concept maps)

HIERARCHICAL STRUCTURE:
- **Level 0** (Root): Single most general, inclusive concept (answers "What is this about?")
- **Level 1** (Major Branches): 4-7 primary topics (broad categories)
- **Level 2** (Subconcepts): 3-5 subdivisions per major branch
- **Level 3** (Details): 2-4 specific points (examples, applications)
- **Level 4** (Optional): Granular supporting details

${baseLabelingGuidelines}

${categoryAssignment}

RELATIONSHIP TYPES (Hierarchical only - parent → child):
- "includes" / "contains" / "consists of"
- "is divided into"
- "has types" / "has subtypes"
- "comprises"

Target: ${maxNodes} nodes maximum, ${maxDepth} levels deep
Aim for: ~${Math.ceil(maxNodes * 0.20)} main branches (level 1), each with ~${Math.floor((maxNodes - Math.ceil(maxNodes * 0.20)) / Math.ceil(maxNodes * 0.20))} sub-branches

${baseSourceFidelity}

Return ONLY a valid JSON object in this exact format:
{
  "title": "Main topic/title",
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
      "relationship": "contains"
    }
  ]
}

EDGE REQUIREMENTS:
1. Every node (except root) MUST have exactly ONE incoming edge (strict tree structure)
2. Use hierarchical relationship labels only
3. NO cross-links between branches

DO NOT include any text outside the JSON object.`
  }

  if (mapType === 'radial') {
    return `You are an expert at creating RADIAL MIND MAPS - circular layouts with a central concept and radiating branches, optimized for visual balance and equal importance.

RADIAL MIND MAP PRINCIPLES:
1. **Central Focus**: Single central concept with all main branches radiating outward
2. **Equal Importance**: All level-1 branches have equal visual weight (circular arrangement)
3. **Balanced Distribution**: Aim for even distribution of nodes across all radiating branches
4. **Clear Radial Levels**: Distance from center indicates hierarchy depth

RADIAL STRUCTURE:
- **Level 0** (Center): Single core concept or theme
- **Level 1** (Primary Radials): 5-8 main branches radiating from center (equally spaced)
- **Level 2** (Secondary Radials): 2-4 sub-branches per main branch
- **Level 3** (Details): 1-3 specific points extending outward

${baseLabelingGuidelines}

${categoryAssignment}

RELATIONSHIP TYPES (Radial - center → outward):
- "radiates to" / "branches into"
- "extends to"
- "includes"
- "comprises"

Target: ${maxNodes} nodes maximum, ${maxDepth} levels deep
Aim for: ~${Math.ceil(maxNodes * 0.25)} primary radials (level 1), balanced distribution of ${Math.floor((maxNodes - Math.ceil(maxNodes * 0.25)) / Math.ceil(maxNodes * 0.25))} nodes per branch

VISUAL BALANCE REQUIREMENTS:
- Distribute nodes evenly across all primary branches
- Avoid heavily weighted branches on one side
- Keep branch depths similar for visual harmony

${baseSourceFidelity}

Return ONLY a valid JSON object (same format as hierarchical).

EDGE REQUIREMENTS:
1. All level-1 nodes MUST connect directly to the central node
2. Each branch forms its own hierarchy radiating outward
3. NO cross-links between radial branches

DO NOT include any text outside the JSON object.`
  }

  // mapType === 'concept'
  return `You are an expert at creating CONCEPT MAPS - networked knowledge structures with explicit labeled relationships showing knowledge integration.

CONCEPT MAP PRINCIPLES:
1. **Hierarchical & Networked**: Top-down organization WITH cross-links between branches
2. **Explicit Relationships**: Every connection MUST have a labeled linking phrase (e.g., "leads to", "is a type of", "requires")
3. **Propositional Structure**: Each edge forms a readable sentence: Concept1 + Linking Phrase + Concept2
4. **Cross-Links**: Connect related concepts across different branches to show knowledge integration (KEY DIFFERENCE from hierarchical)

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

${baseLabelingGuidelines}

${categoryAssignment}

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

CROSS-LINKS (10-20% of total edges - REQUIRED):
- Connect concepts from DIFFERENT branches
- Show knowledge integration and synthesis
- Use relationships like: "reinforces", "contrasts with", "applies to", "exemplifies"
- Example: "Heat Exhaustion" → "prevented by using" → "Buddy System Protocol"

Target: ${maxNodes} nodes maximum, ${maxDepth} levels deep
Aim for: ~${Math.ceil(maxNodes * 0.20)} main branches (level 1), each with ${Math.floor((maxNodes - Math.ceil(maxNodes * 0.20)) / Math.ceil(maxNodes * 0.20))} sub-branches
CRITICAL: Include ${Math.ceil(maxNodes * 0.15)} cross-links connecting concepts from different branches!

${baseSourceFidelity}

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
}

/**
 * Generate a mind map from document text
 * Supports hierarchical, radial, and concept map types
 */
export async function generateMindMap(
  options: GenerateMindMapOptions
): Promise<MindMapData> {
  const {
    text,
    maxNodes = 20,
    maxDepth = 4,
    provider: customProvider,
    template: userTemplate,
    mapType = 'hierarchical' // Default to hierarchical for backward compatibility
  } = options

  // Get provider (use custom if provided, otherwise get configured provider)
  const provider = customProvider || getProviderForFeature('mindmap')

  if (!provider.isConfigured()) {
    throw new Error(`AI provider not configured. Please add the appropriate API key to your environment variables.`)
  }

  console.log(`[MindMap] Using ${provider.name} provider for generation`)
  console.log(`[MindMap] Generating ${mapType} mind map`)

  // Determine visualization template
  let selectedTemplate: TemplateType = userTemplate || 'hierarchical' // Default to hierarchical if not specified
  let templateSelectionMode: 'user' | 'ai-auto' = userTemplate ? 'user' : 'ai-auto'

  // Truncate if necessary (reduced for faster processing)
  const maxChars = 24000
  let processedText = text
  if (text.length > maxChars) {
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`Mind map: Text truncated from ${text.length} to ${processedText.length} characters`)
  }

  // Generate type-specific system prompt
  const systemPrompt = getSystemPromptForMapType(mapType, maxNodes, maxDepth)

  // Generate type-aware user prompt
  const mapTypeDescriptions = {
    hierarchical: 'a hierarchical tree-structured',
    radial: 'a radial/circular',
    concept: 'a concept map with cross-links'
  }

  const userPrompt = `Extract ${mapTypeDescriptions[mapType]} mind map from this content:

<content>
${processedText}
</content>

Create a clear, well-structured ${mapType} mind map with ${maxNodes} nodes organized in ${maxDepth} levels.

IMPORTANT: Your response must be ONLY a JSON object with "title", "nodes" (array), and "edges" (array) fields. Do NOT use nested tree format with "children". Use the flat nodes/edges format specified in the system prompt.`

  try {
    const response = await provider.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        temperature: 0.5, // Balanced between creativity and structure
        maxTokens: 3000, // Optimized for faster generation while maintaining quality
      }
    )

    let responseText = response.content || "{}"

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Try to extract JSON if there's extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      responseText = jsonMatch[0]
    }

    // Log response length for debugging
    console.log(`[MindMap] Response length: ${responseText.length} chars, tokens used: ${response.usage?.totalTokens || 'unknown'}`)

    try {
      const parsed = JSON.parse(responseText)

      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        console.error('[MindMap] Invalid response - missing nodes array. Response preview:', responseText.substring(0, 500))
        throw new Error("Invalid mind map format: missing nodes array")
      }

      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        console.error('[MindMap] Invalid response - missing edges array. Response preview:', responseText.substring(0, 500))
        throw new Error("Invalid mind map format: missing edges array")
      }

      // Validate and normalize nodes
      const validatedNodes: MindMapNode[] = parsed.nodes.map((node: any, index: number) => {
        // Check for missing id or label (handle both undefined/null and empty strings)
        // Note: node.id can be 0 (falsy but valid), so check for null/undefined explicitly
        if (node.id === null || node.id === undefined || !node.label) {
          console.error(`[MindMap] Invalid node at index ${index}:`, JSON.stringify(node, null, 2))
          console.error(`[MindMap] All nodes preview:`, JSON.stringify(parsed.nodes.slice(0, 3), null, 2))
          throw new Error(`Invalid node ${index}: missing id or label. Node data: ${JSON.stringify(node)}`)
        }

        // PHASE 2.1: ENFORCE "ONE KEYWORD PER BRANCH" RULE (Tony Buzan)
        const trimmedLabel = node.label.trim();
        const words = trimmedLabel.split(/\s+/);
        const level = typeof node.level === 'number' ? node.level : 0;

        let finalLabel = trimmedLabel;
        let wasAutoTruncated = false;

        // Root (level 0): Allow 2-3 words
        if (level === 0) {
          if (words.length > 3) {
            finalLabel = words.slice(0, 3).join(' ');
            wasAutoTruncated = true;
            console.warn(
              `[Keyword Enforcement] Root node truncated from "${trimmedLabel}" → "${finalLabel}" (max 3 words for root)`
            );
          }
        }
        // All other levels: SINGLE KEYWORD ONLY
        else {
          if (words.length > 1) {
            // Take first word unless it's a common article/preposition
            const firstWord = words[0];
            const skipWords = ['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];

            if (skipWords.includes(firstWord.toLowerCase()) && words.length > 1) {
              finalLabel = words[1]; // Use second word if first is article
            } else {
              finalLabel = firstWord;
            }

            wasAutoTruncated = true;
            console.warn(
              `[Keyword Enforcement] Level ${level} node truncated: "${trimmedLabel}" → "${finalLabel}"\n` +
              `  Full context moved to description. This enforces Tony Buzan's "one keyword per branch" rule.`
            );
          }
        }

        // If we truncated, prepend original label to description for context preservation
        let finalDescription = node.description || '';
        if (wasAutoTruncated && finalLabel !== trimmedLabel) {
          const originalContext = `[Original: "${trimmedLabel}"] `;
          finalDescription = originalContext + (finalDescription || '');
        }

        return {
          id: String(node.id), // Normalize to string (AI might return numbers)
          label: finalLabel,
          level,
          description: finalDescription,
          category: node.category || 'concept'
        }
      })

      // Validate and normalize edges - filter out invalid ones instead of throwing
      const validatedEdges: MindMapEdge[] = parsed.edges
        .filter((edge: any, index: number) => {
          // Support both "from/to" and "source/target" field names (different AI providers use different conventions)
          const fromField = edge.from ?? edge.source
          const toField = edge.to ?? edge.target

          if (fromField === null || fromField === undefined || toField === null || toField === undefined) {
            console.warn(`Skipping invalid edge ${index}: missing from/source or to/target fields`)
            return false
          }

          // Verify nodes exist (normalize to strings for comparison)
          const fromExists = validatedNodes.some(n => n.id === String(fromField))
          const toExists = validatedNodes.some(n => n.id === String(toField))

          if (!fromExists || !toExists) {
            console.warn(`Skipping edge ${index}: references non-existent nodes (${fromField} -> ${toField})`)
            return false
          }

          return true
        })
        .map((edge: any, index: number) => {
          // Normalize to "from/to" format and convert IDs to strings
          const fromField = String(edge.from ?? edge.source)
          const toField = String(edge.to ?? edge.target)

          return {
            id: edge.id ? String(edge.id) : `edge_${index}`,
            from: fromField,
            to: toField,
            relationship: edge.relationship || 'contains'
          }
        })

      // CRITICAL: Validate that we have edges (mind maps are useless without connections!)
      if (validatedEdges.length === 0 && validatedNodes.length > 1) {
        console.error(`[MindMap] ❌ AI generated ${validatedNodes.length} nodes but 0 edges! Mind map will be disconnected.`)
        console.error(`[MindMap] Provider: ${provider.name}`)
        throw new Error('ZERO_EDGES_ERROR: AI failed to generate any edges. Mind map would be disconnected.')
      }

      console.log(`[MindMap] ✅ Validated ${validatedNodes.length} nodes and ${validatedEdges.length} edges`)

      // Fix missing levels: If all nodes are level 0, calculate levels based on edge hierarchy
      const allLevel0 = validatedNodes.every(n => n.level === 0)
      if (allLevel0 && validatedNodes.length > 1) {
        console.warn('[MindMap] All nodes at level 0 - calculating levels from edge hierarchy')

        // Build adjacency map
        const childToParent = new Map<string, string>()
        validatedEdges.forEach(edge => {
          childToParent.set(edge.to, edge.from)
        })

        // Calculate level for each node by traversing up to root
        validatedNodes.forEach(node => {
          let level = 0
          let currentId = node.id
          const visited = new Set<string>()

          while (childToParent.has(currentId) && !visited.has(currentId)) {
            visited.add(currentId)
            currentId = childToParent.get(currentId)!
            level++
          }

          node.level = level
        })

        console.log('[MindMap] Recalculated levels:', validatedNodes.map(n => `${n.label} (L${n.level})`).join(', '))
      }

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

  } catch (error: unknown) {
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
