/**
 * AI Content Suggestion Engine
 *
 * Analyzes book sections and recommends which are best for:
 * - Flashcard generation (concept-dense sections)
 * - Podcast generation (narrative sections)
 * - Mind map generation (hierarchical, interconnected sections)
 */

import type {
  TOCSection,
  ContentSuggestion,
  AISuggestions,
  ContentType
} from '@/lib/types'
import { getProviderForFeature } from '@/lib/ai'

interface SectionSample {
  id: string
  title: string
  pageRange: { start: number; end: number }
  textSample?: string // First 500 chars of section text
  level: number
}

/**
 * Heuristic scoring for flashcard suitability
 */
function scoreForFlashcards(section: SectionSample, textSample?: string): {
  score: number
  metadata: { conceptDensity: number; estimatedCards: number }
} {
  let score = 0.5 // Base score
  let conceptDensity = 0.5

  // Prefer mid-level sections (not too broad, not too specific)
  if (section.level === 2 || section.level === 3) {
    score += 0.2
  }

  // Page count: 5-20 pages is ideal
  const pageCount = section.pageRange.end - section.pageRange.start + 1
  if (pageCount >= 5 && pageCount <= 20) {
    score += 0.2
  } else if (pageCount < 5) {
    score -= 0.1
  } else if (pageCount > 30) {
    score -= 0.2
  }

  if (textSample) {
    // Look for definition indicators
    const hasDefinitions = /\b(defined as|refers to|is a|means|definition)\b/i.test(textSample)
    if (hasDefinitions) {
      score += 0.15
      conceptDensity += 0.2
    }

    // Look for key terms
    const hasKeyTerms = /\b(important|key concept|fundamental|essential|note that)\b/i.test(textSample)
    if (hasKeyTerms) {
      score += 0.1
      conceptDensity += 0.1
    }

    // Look for lists/bullet points
    const hasLists = /[•\-\*]\s|\d+\.\s/g.test(textSample)
    if (hasLists) {
      score += 0.1
    }

    // Penalize narrative/conversational text
    const isNarrative = /\b(we will|let's|imagine|consider|story|example)\b/i.test(textSample)
    if (isNarrative) {
      score -= 0.1
    }
  }

  // Title indicators
  const title = section.title.toLowerCase()
  if (/(definition|terminology|glossary|key terms)/i.test(title)) {
    score += 0.2
    conceptDensity += 0.2
  }

  // Estimate number of cards (roughly 1 card per page for good sections)
  const estimatedCards = Math.min(Math.floor(pageCount * 0.8), 25)

  return {
    score: Math.min(score, 1.0),
    metadata: {
      conceptDensity: Math.min(conceptDensity, 1.0),
      estimatedCards
    }
  }
}

/**
 * Heuristic scoring for podcast suitability
 */
function scoreForPodcast(section: SectionSample, textSample?: string): {
  score: number
  metadata: { narrativeFlow: number; estimatedDuration: string }
} {
  let score = 0.5
  let narrativeFlow = 0.5

  // Prefer higher-level sections (chapters, introductions)
  if (section.level === 1) {
    score += 0.3
    narrativeFlow += 0.2
  }

  // Page count: 10-30 pages is ideal for podcast
  const pageCount = section.pageRange.end - section.pageRange.start + 1
  if (pageCount >= 10 && pageCount <= 30) {
    score += 0.2
  } else if (pageCount < 10) {
    score += 0.1 // Short podcasts OK
  } else if (pageCount > 40) {
    score -= 0.2 // Too long
  }

  if (textSample) {
    // Look for narrative indicators
    const isNarrative = /\b(story|example|case study|imagine|consider|let's explore)\b/i.test(textSample)
    if (isNarrative) {
      score += 0.2
      narrativeFlow += 0.3
    }

    // Look for explanatory text
    const isExplanatory = /\b(because|therefore|thus|however|in other words|for instance)\b/i.test(textSample)
    if (isExplanatory) {
      score += 0.15
      narrativeFlow += 0.2
    }

    // Penalize heavy technical/formula content
    const isTechnical = /[∫∑∏√∂∆≈≠±×÷]/g.test(textSample) || /\b(theorem|proof|equation|formula)\b/i.test(textSample)
    if (isTechnical) {
      score -= 0.15
      narrativeFlow -= 0.2
    }

    // Look for conversational tone
    const isConversational = /\b(we|you|your|let's|question|ask)\b/i.test(textSample)
    if (isConversational) {
      score += 0.1
      narrativeFlow += 0.1
    }
  }

  // Title indicators
  const title = section.title.toLowerCase()
  if (/(introduction|overview|background|history|case study)/i.test(title)) {
    score += 0.2
    narrativeFlow += 0.2
  }

  // Estimate duration (roughly 2 minutes per page at 150 words/min)
  const estimatedMinutes = Math.round(pageCount * 2)
  const estimatedDuration = `${estimatedMinutes} minutes`

  return {
    score: Math.min(score, 1.0),
    metadata: {
      narrativeFlow: Math.min(narrativeFlow, 1.0),
      estimatedDuration
    }
  }
}

/**
 * Heuristic scoring for mind map suitability
 */
function scoreForMindMap(section: SectionSample, textSample?: string): {
  score: number
  metadata: { complexityScore: number; estimatedNodes: number }
} {
  let score = 0.5
  let complexityScore = 50 // 0-100

  // Prefer mid-to-high level sections with subsections
  if (section.level === 1 || section.level === 2) {
    score += 0.2
    complexityScore += 15
  }

  // Page count: 15-40 pages ideal for complex concepts
  const pageCount = section.pageRange.end - section.pageRange.start + 1
  if (pageCount >= 15 && pageCount <= 40) {
    score += 0.2
    complexityScore += 10
  }

  if (textSample) {
    // Look for relationship indicators
    const hasRelationships = /\b(related to|connects to|leads to|causes|results in|depends on|influences)\b/i.test(textSample)
    if (hasRelationships) {
      score += 0.2
      complexityScore += 15
    }

    // Look for hierarchical structure
    const hasHierarchy = /\b(consists of|composed of|includes|contains|types of|categories)\b/i.test(textSample)
    if (hasHierarchy) {
      score += 0.15
      complexityScore += 10
    }

    // Look for process/system descriptions
    const hasProcesses = /\b(process|system|cycle|pathway|mechanism|flow)\b/i.test(textSample)
    if (hasProcesses) {
      score += 0.15
      complexityScore += 10
    }

    // Look for multiple concepts
    const hasMultipleConcepts = /\b(first|second|third|another|also|additionally|furthermore)\b/i.test(textSample)
    if (hasMultipleConcepts) {
      score += 0.1
      complexityScore += 5
    }
  }

  // Title indicators
  const title = section.title.toLowerCase()
  if (/(system|process|cycle|model|framework|structure|organization)/i.test(title)) {
    score += 0.2
    complexityScore += 15
  }

  // Estimate nodes (roughly 2-3 nodes per page)
  const estimatedNodes = Math.min(Math.floor(pageCount * 2.5), 50)

  return {
    score: Math.min(score, 1.0),
    metadata: {
      complexityScore: Math.min(complexityScore, 100),
      estimatedNodes
    }
  }
}

/**
 * Use AI to generate refined suggestions
 */
async function generateAISuggestions(
  sections: SectionSample[],
  contentType: ContentType
): Promise<ContentSuggestion[]> {
  try {
    const provider = getProviderForFeature('content_suggestions')

    const sectionsSummary = sections.slice(0, 20).map(s => ({ // Limit to 20 for token budget
      id: s.id,
      title: s.title,
      level: s.level,
      pages: s.pageRange.end - s.pageRange.start + 1
    }))

    const typeDescriptions = {
      flashcards: 'concept-dense sections with definitions, key terms, and factual information',
      podcasts: 'narrative sections with explanations, case studies, and conversational content',
      mindmaps: 'sections with interconnected concepts, hierarchical relationships, and complex systems'
    }

    const prompt = `You are analyzing a textbook to recommend sections for ${contentType} generation.

Sections:
${JSON.stringify(sectionsSummary, null, 2)}

Task: Select the top 3-5 sections that are best suited for ${contentType}.

Ideal sections for ${contentType} are: ${typeDescriptions[contentType]}

For each recommendation, provide:
1. Section ID
2. Confidence (0-1)
3. Brief reason why it's suitable

Respond with JSON array:
[
  {
    "sectionId": "section-1",
    "confidence": 0.95,
    "reason": "Chapter introduction with clear explanations and narrative flow"
  }
]`

    const response = await provider.complete([
      { role: 'system', content: 'You are an expert at analyzing educational content for different learning modalities.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 1000
    })

    // Parse JSON response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const aiSuggestions = JSON.parse(jsonMatch[0])
      return aiSuggestions.map((s: any) => {
        const section = sections.find(sec => sec.id === s.sectionId)
        if (!section) return null

        return {
          sectionId: section.id,
          title: section.title,
          confidence: s.confidence,
          reason: s.reason,
          pageRange: section.pageRange,
          estimatedOutput: {},
          metadata: {}
        }
      }).filter(Boolean) as ContentSuggestion[]
    }

    throw new Error('Could not parse AI response')

  } catch (error) {
    console.error(`AI suggestion failed for ${contentType}:`, error)
    return []
  }
}

/**
 * Generate content suggestions for all types
 */
export async function generateContentSuggestions(
  sections: TOCSection[],
  documentText?: string
): Promise<AISuggestions> {
  console.log(`Generating content suggestions for ${sections.length} sections...`)

  // Flatten nested sections
  const flattenSections = (secs: TOCSection[]): SectionSample[] => {
    const flat: SectionSample[] = []
    for (const sec of secs) {
      flat.push({
        id: sec.id,
        title: sec.title,
        pageRange: sec.pageRange,
        level: sec.level
      })
      if (sec.sections) {
        flat.push(...flattenSections(sec.sections))
      }
    }
    return flat
  }

  const flatSections = flattenSections(sections)

  // Score each section for each content type
  const flashcardScores = flatSections.map(s => ({
    section: s,
    ...scoreForFlashcards(s)
  }))

  const podcastScores = flatSections.map(s => ({
    section: s,
    ...scoreForPodcast(s)
  }))

  const mindmapScores = flatSections.map(s => ({
    section: s,
    ...scoreForMindMap(s)
  }))

  // Sort by score and take top 5 for each
  const topFlashcards = flashcardScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(f => ({
      sectionId: f.section.id,
      title: f.section.title,
      confidence: f.score,
      reason: `High concept density section ideal for flashcard generation`,
      pageRange: f.section.pageRange,
      estimatedOutput: { cards: f.metadata.estimatedCards },
      metadata: { conceptDensity: f.metadata.conceptDensity }
    }))

  const topPodcasts = podcastScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(p => ({
      sectionId: p.section.id,
      title: p.section.title,
      confidence: p.score,
      reason: `Narrative section well-suited for audio podcast format`,
      pageRange: p.section.pageRange,
      estimatedOutput: { duration: p.metadata.estimatedDuration },
      metadata: { narrativeFlow: p.metadata.narrativeFlow }
    }))

  const topMindmaps = mindmapScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(m => ({
      sectionId: m.section.id,
      title: m.section.title,
      confidence: m.score,
      reason: `Complex interconnected concepts ideal for mind map visualization`,
      pageRange: m.section.pageRange,
      estimatedOutput: { nodes: m.metadata.estimatedNodes },
      metadata: { complexityScore: m.metadata.complexityScore }
    }))

  return {
    flashcards: topFlashcards,
    podcasts: topPodcasts,
    mindmaps: topMindmaps,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Quick suggestions without AI (faster, less accurate)
 */
export function quickGenerateSuggestions(sections: TOCSection[]): AISuggestions {
  const flattenSections = (secs: TOCSection[]): SectionSample[] => {
    const flat: SectionSample[] = []
    for (const sec of secs) {
      flat.push({
        id: sec.id,
        title: sec.title,
        pageRange: sec.pageRange,
        level: sec.level
      })
      if (sec.sections) {
        flat.push(...flattenSections(sec.sections))
      }
    }
    return flat
  }

  const flatSections = flattenSections(sections)

  // Use heuristic scoring only
  const flashcards = flatSections
    .map(s => ({ s, ...scoreForFlashcards(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(f => ({
      sectionId: f.s.id,
      title: f.s.title,
      confidence: f.score,
      reason: 'Heuristic analysis suggests high concept density',
      pageRange: f.s.pageRange,
      estimatedOutput: { cards: f.metadata.estimatedCards },
      metadata: { conceptDensity: f.metadata.conceptDensity }
    }))

  const podcasts = flatSections
    .map(s => ({ s, ...scoreForPodcast(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(p => ({
      sectionId: p.s.id,
      title: p.s.title,
      confidence: p.score,
      reason: 'Section length and level suitable for podcast',
      pageRange: p.s.pageRange,
      estimatedOutput: { duration: p.metadata.estimatedDuration },
      metadata: { narrativeFlow: p.metadata.narrativeFlow }
    }))

  const mindmaps = flatSections
    .map(s => ({ s, ...scoreForMindMap(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(m => ({
      sectionId: m.s.id,
      title: m.s.title,
      confidence: m.score,
      reason: 'Hierarchical structure suitable for mind mapping',
      pageRange: m.s.pageRange,
      estimatedOutput: { nodes: m.metadata.estimatedNodes },
      metadata: { complexityScore: m.metadata.complexityScore }
    }))

  return {
    flashcards,
    podcasts,
    mindmaps,
    generatedAt: new Date().toISOString()
  }
}
