/**
 * AI Structure Analyzer
 *
 * Uses AI to analyze extracted book structures (TOC, Index, Bookmarks, Headings)
 * and determine which structure is best to use for navigation
 */

import type { BookStructure, StructureAnalysis, StructureType } from '@/lib/types'
import { getProviderForFeature } from '@/lib/ai'

/**
 * Score a book structure based on quality metrics
 */
function scoreStructure(
  structure: BookStructure
): { toc: number; index: number; bookmarks: number; headings: number } {
  const scores = {
    toc: 0,
    index: 0,
    bookmarks: 0,
    headings: 0
  }

  // Score TOC (0-100)
  if (structure.toc?.detected) {
    const chapters = structure.toc.chapters.length

    // Base score for detection
    scores.toc += 20

    // Points for number of chapters (more = better, up to 30 points)
    scores.toc += Math.min(chapters * 2, 30)

    // Points for hierarchical depth (nested sections)
    const hasNesting = structure.toc.chapters.some(ch => ch.sections && ch.sections.length > 0)
    if (hasNesting) scores.toc += 20

    // Points for total pages coverage
    if (structure.toc.totalPages && structure.toc.totalPages > 50) {
      scores.toc += 15
    }

    // Points for detection method (text parsing is more reliable than heading analysis)
    if (structure.toc.detectionMethod === 'text-parsing') {
      scores.toc += 15
    } else if (structure.toc.detectionMethod === 'pdf-bookmarks') {
      scores.toc += 10
    }
  }

  // Score Index (0-100)
  if (structure.index?.detected) {
    const entries = structure.index.entries.length

    // Base score
    scores.index += 15

    // Points for number of entries (more = better)
    scores.index += Math.min(Math.floor(entries / 10), 35)

    // Points for having sub-entries (shows detail)
    const hasSubEntries = structure.index.entries.some(e => e.subEntries && e.subEntries.length > 0)
    if (hasSubEntries) scores.index += 20

    // Points for cross-references
    const hasCrossRefs = structure.index.entries.some(e => e.seeAlso && e.seeAlso.length > 0)
    if (hasCrossRefs) scores.index += 15

    // Points for alphabetical organization
    if (structure.index.alphabeticalSections && structure.index.alphabeticalSections.length >= 20) {
      scores.index += 15
    }
  }

  // Score Bookmarks (0-100)
  if (structure.bookmarks?.detected) {
    const bookmarks = structure.bookmarks.outline.length

    // Base score
    scores.bookmarks += 20

    // Points for number of bookmarks
    scores.bookmarks += Math.min(bookmarks * 3, 30)

    // Points for nested structure
    const hasNesting = structure.bookmarks.outline.some(b => b.items.length > 0)
    if (hasNesting) scores.bookmarks += 25

    // Points for depth (deeply nested = better structure)
    const maxDepth = getBookmarkDepth(structure.bookmarks.outline)
    scores.bookmarks += Math.min(maxDepth * 5, 25)
  }

  // Score Headings (0-100)
  if (structure.headings?.detected) {
    const headings = structure.headings.hierarchy.length

    // Base score
    scores.headings += 10

    // Points for number of headings
    scores.headings += Math.min(Math.floor(headings / 2), 25)

    // Points for detection confidence
    if (structure.headings.detectionConfidence) {
      scores.headings += Math.floor(structure.headings.detectionConfidence * 40)
    }

    // Points for hierarchy levels
    const levels = new Set(structure.headings.hierarchy.map(h => h.level)).size
    scores.headings += Math.min(levels * 5, 25)
  }

  return scores
}

/**
 * Get maximum depth of bookmark tree
 */
function getBookmarkDepth(bookmarks: any[], depth = 1): number {
  if (bookmarks.length === 0) return depth

  let maxDepth = depth
  for (const bookmark of bookmarks) {
    if (bookmark.items && bookmark.items.length > 0) {
      const childDepth = getBookmarkDepth(bookmark.items, depth + 1)
      maxDepth = Math.max(maxDepth, childDepth)
    }
  }

  return maxDepth
}

/**
 * Use AI to analyze structure quality and provide reasoning
 */
async function analyzeWithAI(
  structure: BookStructure,
  scores: { toc: number; index: number; bookmarks: number; headings: number }
): Promise<{ recommended: StructureType; reasoning: string }> {
  try {
    const provider = getProviderForFeature('structure_analysis')

    // Prepare structure summary for AI
    const structureSummary = {
      toc: structure.toc?.detected ? {
        chapters: structure.toc.chapters.length,
        hasNesting: structure.toc.chapters.some(ch => ch.sections && ch.sections.length > 0),
        totalPages: structure.toc.totalPages,
        method: structure.toc.detectionMethod
      } : null,
      index: structure.index?.detected ? {
        entries: structure.index.entries.length,
        hasSubEntries: structure.index.entries.some(e => e.subEntries && e.subEntries.length > 0),
        hasCrossRefs: structure.index.entries.some(e => e.seeAlso && e.seeAlso.length > 0)
      } : null,
      bookmarks: structure.bookmarks?.detected ? {
        count: structure.bookmarks.outline.length,
        depth: getBookmarkDepth(structure.bookmarks.outline)
      } : null,
      headings: structure.headings?.detected ? {
        count: structure.headings.hierarchy.length,
        confidence: structure.headings.detectionConfidence
      } : null
    }

    const prompt = `You are analyzing a textbook's structure to determine the best navigation method.

Detected structures and their quality scores (0-100):
${JSON.stringify({ structures: structureSummary, scores }, null, 2)}

Task: Determine which structure is best for student navigation and content generation.

Consider:
1. Completeness: Does it cover the whole book?
2. Organization: Is it well-structured and hierarchical?
3. Usability: Easy for students to find specific topics?
4. Accuracy: Are page numbers and references reliable?

Respond with JSON:
{
  "recommended": "toc" | "index" | "bookmarks" | "headings",
  "reasoning": "2-3 sentence explanation of why this structure is best"
}`

    const response = await provider.complete([
      { role: 'system', content: 'You are an expert at analyzing document structures for educational materials.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 500
    })

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0])
      return {
        recommended: analysis.recommended as StructureType,
        reasoning: analysis.reasoning
      }
    }

    // Fallback to highest score
    throw new Error('Could not parse AI response')

  } catch (error) {
    console.error('AI analysis failed, using score-based fallback:', error)

    // Fallback: Use highest score
    const sortedScores = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])

    if (sortedScores.length === 0) {
      return {
        recommended: 'headings',
        reasoning: 'No reliable structures detected. Using heading-based fallback.'
      }
    }

    const [recommended, score] = sortedScores[0]

    const reasoningMap: Record<string, string> = {
      toc: 'Table of Contents provides comprehensive chapter organization with clear page references.',
      index: 'Alphabetical index offers detailed topic coverage with extensive cross-references.',
      bookmarks: 'PDF bookmarks provide structured navigation with good hierarchical depth.',
      headings: 'Font-based heading detection provides basic structural navigation.'
    }

    return {
      recommended: recommended as StructureType,
      reasoning: reasoningMap[recommended] || 'This structure has the highest quality score.'
    }
  }
}

/**
 * Main function: Analyze book structure and determine best navigation method
 */
export async function analyzeBookStructure(
  structure: BookStructure
): Promise<StructureAnalysis> {
  console.log('Analyzing book structure...')

  // Calculate scores for each structure type
  const scores = scoreStructure(structure)

  // Determine which methods successfully detected structure
  const detectedMethods: StructureType[] = []
  if (structure.toc?.detected) detectedMethods.push('toc')
  if (structure.index?.detected) detectedMethods.push('index')
  if (structure.bookmarks?.detected) detectedMethods.push('bookmarks')
  if (structure.headings?.detected) detectedMethods.push('headings')

  // Check if we fell back to AI topics (none of the structure methods worked)
  const fallbackUsed = detectedMethods.length === 0 ||
    (detectedMethods.length === 1 && detectedMethods[0] === 'headings' && scores.headings < 30)

  // Use AI to make final recommendation
  const aiAnalysis = await analyzeWithAI(structure, scores)

  return {
    recommended: aiAnalysis.recommended,
    scores,
    reasoning: aiAnalysis.reasoning,
    detectedMethods,
    fallbackUsed,
    analyzedAt: new Date().toISOString()
  }
}

/**
 * Quick analysis without AI (for fast operations)
 */
export function quickAnalyzeStructure(structure: BookStructure): StructureAnalysis {
  const scores = scoreStructure(structure)

  const detectedMethods: StructureType[] = []
  if (structure.toc?.detected) detectedMethods.push('toc')
  if (structure.index?.detected) detectedMethods.push('index')
  if (structure.bookmarks?.detected) detectedMethods.push('bookmarks')
  if (structure.headings?.detected) detectedMethods.push('headings')

  // Simple rule: Use highest score
  const sortedScores = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])

  const recommended = sortedScores.length > 0
    ? sortedScores[0][0] as StructureType
    : 'headings'

  const fallbackUsed = detectedMethods.length === 0

  return {
    recommended,
    scores,
    reasoning: `Selected based on quality score of ${scores[recommended as keyof typeof scores] || 0}/100`,
    detectedMethods,
    fallbackUsed,
    analyzedAt: new Date().toISOString()
  }
}
