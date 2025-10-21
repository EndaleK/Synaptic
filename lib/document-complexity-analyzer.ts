/**
 * Analyzes document complexity to determine optimal mind map parameters
 * Based on content length, structure, vocabulary richness, and topic diversity
 */

export interface ComplexityAnalysis {
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  recommendedNodes: number
  recommendedDepth: number
  score: number // 0-100
  factors: {
    length: number // Document length factor
    vocabulary: number // Unique words / total words ratio
    structure: number // Paragraph/section diversity
    technical: number // Technical term density
  }
  reasoning: string
}

/**
 * Analyze document text to determine optimal mind map parameters
 */
export function analyzeDocumentComplexity(text: string): ComplexityAnalysis {
  const length = text.length
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  // Factor 1: Document Length (0-30 points)
  const lengthScore = Math.min(30, (length / 1000) * 3) // Up to ~10k chars for max points

  // Factor 2: Vocabulary Richness (0-25 points)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const vocabularyRatio = uniqueWords.size / Math.max(1, wordCount)
  const vocabularyScore = vocabularyRatio * 50 // Higher ratio = more diverse vocabulary

  // Factor 3: Structural Complexity (0-25 points)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const avgSentenceLength = wordCount / Math.max(1, sentences.length)
  const structureScore = Math.min(25, (paragraphs.length / 5) * 10 + (avgSentenceLength / 20) * 15)

  // Factor 4: Technical Density (0-20 points)
  // Count capitalized words, numbers, acronyms, technical patterns
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g)?.length || 0
  const numbers = text.match(/\b\d+(\.\d+)?\b/g)?.length || 0
  const acronyms = text.match(/\b[A-Z]{2,}\b/g)?.length || 0
  const technicalDensity = (capitalizedWords + numbers * 2 + acronyms * 3) / Math.max(1, wordCount)
  const technicalScore = Math.min(20, technicalDensity * 100)

  // Calculate total complexity score (0-100)
  const totalScore = Math.min(100, lengthScore + vocabularyScore + structureScore + technicalScore)

  // Determine complexity level and recommendations
  let complexity: ComplexityAnalysis['complexity']
  let recommendedNodes: number
  let recommendedDepth: number
  let reasoning: string

  if (totalScore < 25) {
    complexity = 'simple'
    recommendedNodes = 15
    recommendedDepth = 2
    reasoning = 'Short document with straightforward content. Using focused mind map with 2 levels and 15 nodes for clarity.'
  } else if (totalScore < 50) {
    complexity = 'moderate'
    recommendedNodes = 25
    recommendedDepth = 3
    reasoning = 'Moderate complexity with balanced content. Using standard mind map with 3 levels and 25 nodes for comprehensive coverage.'
  } else if (totalScore < 75) {
    complexity = 'complex'
    recommendedNodes = 40
    recommendedDepth = 4
    reasoning = 'Rich, complex document with diverse topics. Using detailed mind map with 4 levels and 40 nodes to capture nuances.'
  } else {
    complexity = 'very_complex'
    recommendedNodes = 55
    recommendedDepth = 5
    reasoning = 'Highly complex document with technical depth. Using comprehensive mind map with 5 levels and 55 nodes for full exploration.'
  }

  return {
    complexity,
    recommendedNodes,
    recommendedDepth,
    score: Math.round(totalScore),
    factors: {
      length: Math.round(lengthScore),
      vocabulary: Math.round(vocabularyScore),
      structure: Math.round(structureScore),
      technical: Math.round(technicalScore)
    },
    reasoning
  }
}

/**
 * Get a human-readable explanation of the complexity analysis
 */
export function getComplexityExplanation(analysis: ComplexityAnalysis): string {
  const { complexity, score, factors, recommendedNodes, recommendedDepth } = analysis

  const level = complexity === 'simple' ? 'Simple' :
                complexity === 'moderate' ? 'Moderate' :
                complexity === 'complex' ? 'Complex' : 'Very Complex'

  return `**${level} Document** (Complexity Score: ${score}/100)

**Analysis:**
- Content Length: ${factors.length}/30 points
- Vocabulary Richness: ${factors.vocabulary}/25 points
- Structural Complexity: ${factors.structure}/25 points
- Technical Density: ${factors.technical}/20 points

**Optimized Settings:**
- **${recommendedNodes} nodes** for comprehensive coverage
- **${recommendedDepth} levels** for appropriate depth

${analysis.reasoning}`
}
