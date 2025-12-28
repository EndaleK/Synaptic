/**
 * Document Analyzer
 *
 * Analyzes documents to extract intelligence for study planning:
 * - Complexity scoring
 * - Topic extraction with difficulty ratings
 * - Time estimates for reading and studying
 * - Content type classification
 * - Mode recommendations based on content + learning style
 */

import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'

// ============================================
// Types
// ============================================

export type ContentType = 'concepts' | 'procedures' | 'facts' | 'formulas'
export type TopicDifficulty = 'easy' | 'medium' | 'hard'
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'

export interface DocumentTopic {
  id: string
  title: string
  description: string
  pageRange?: { start: number; end: number }
  difficulty: TopicDifficulty
  estimatedMinutes: number
  contentType: ContentType
  keywords: string[]
}

export interface ComplexityFactors {
  technicalTermDensity: number // 0-100
  averageSentenceLength: number
  mathematicalContent: number // 0-100
  conceptDensity: number // 0-100
  vocabularyLevel: number // 0-100
}

export interface DocumentAnalysis {
  id?: string
  documentId: string
  userId: string
  complexityScore: number // 0-100
  complexityFactors: ComplexityFactors
  estimatedReadingMinutes: number
  estimatedStudyHours: number
  wordCount: number
  topics: DocumentTopic[]
  contentTypes: Record<ContentType, number> // Percentages
  recommendedModes: Record<LearningStyle, string[]>
  prerequisites: string[]
  analyzedAt: Date
  analysisModel: string
}

// ============================================
// Complexity Calculation (Heuristic-based)
// ============================================

const TECHNICAL_TERMS = new Set([
  // Science
  'hypothesis', 'theorem', 'coefficient', 'variable', 'equation', 'derivative',
  'integral', 'algorithm', 'function', 'parameter', 'matrix', 'vector',
  'quantum', 'molecule', 'electron', 'proton', 'nucleus', 'chromosome',
  'mitosis', 'photosynthesis', 'metabolism', 'enzyme', 'catalyst',
  // Medicine
  'diagnosis', 'prognosis', 'pathology', 'etiology', 'syndrome', 'symptom',
  'pharmacology', 'dosage', 'contraindication', 'therapeutic',
  // Law
  'jurisprudence', 'statute', 'precedent', 'liability', 'jurisdiction',
  // Business
  'amortization', 'depreciation', 'equity', 'dividend', 'arbitrage',
  // Computer Science
  'recursion', 'iteration', 'polymorphism', 'encapsulation', 'inheritance',
  'asynchronous', 'synchronous', 'middleware', 'protocol', 'encryption',
])

export function calculateComplexityScore(text: string): {
  score: number
  factors: ComplexityFactors
} {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const wordCount = words.length

  if (wordCount === 0) {
    return {
      score: 0,
      factors: {
        technicalTermDensity: 0,
        averageSentenceLength: 0,
        mathematicalContent: 0,
        conceptDensity: 0,
        vocabularyLevel: 0,
      },
    }
  }

  // Technical term density
  const technicalWords = words.filter(w =>
    TECHNICAL_TERMS.has(w.toLowerCase().replace(/[^a-z]/g, ''))
  )
  const technicalTermDensity = Math.min((technicalWords.length / wordCount) * 1000, 100)

  // Average sentence length
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1)
  const sentenceLengthScore = Math.min((avgSentenceLength / 30) * 100, 100)

  // Mathematical content (equations, numbers, formulas)
  const mathPatterns = text.match(/[=+\-*/^√∫∑∏≤≥≠±×÷]|\d+\.\d+|\b\d{2,}\b/g) || []
  const mathematicalContent = Math.min((mathPatterns.length / wordCount) * 500, 100)

  // Concept density (unique words / total words)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))
  const conceptDensity = (uniqueWords.size / wordCount) * 100

  // Vocabulary level (average word length as proxy)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount
  const vocabularyLevel = Math.min((avgWordLength / 10) * 100, 100)

  // Calculate overall complexity score (weighted average)
  const score = Math.round(
    technicalTermDensity * 0.25 +
    sentenceLengthScore * 0.15 +
    mathematicalContent * 0.25 +
    conceptDensity * 0.15 +
    vocabularyLevel * 0.20
  )

  return {
    score: Math.min(score, 100),
    factors: {
      technicalTermDensity: Math.round(technicalTermDensity),
      averageSentenceLength: Math.round(avgSentenceLength),
      mathematicalContent: Math.round(mathematicalContent),
      conceptDensity: Math.round(conceptDensity),
      vocabularyLevel: Math.round(vocabularyLevel),
    },
  }
}

// ============================================
// Time Estimation
// ============================================

const WORDS_PER_MINUTE_READING = 200 // Average reading speed
const STUDY_MULTIPLIER_BASE = 2.5 // Base multiplier for study time

export function estimateReadingTime(wordCount: number, complexityScore: number): number {
  // Adjust reading speed based on complexity (harder = slower)
  const adjustedWPM = WORDS_PER_MINUTE_READING * (1 - complexityScore / 200)
  return Math.ceil(wordCount / adjustedWPM)
}

export function estimateStudyTime(
  readingMinutes: number,
  complexityScore: number
): number {
  // Study time = reading time * multiplier adjusted by complexity
  const multiplier = STUDY_MULTIPLIER_BASE + (complexityScore / 50)
  const studyMinutes = readingMinutes * multiplier
  return Math.round((studyMinutes / 60) * 10) / 10 // Convert to hours, round to 1 decimal
}

// ============================================
// Mode Recommendations
// ============================================

export function getRecommendedModes(
  contentTypes: Record<ContentType, number>,
  _complexityScore: number
): Record<LearningStyle, string[]> {
  // Determine dominant content type
  const sortedTypes = Object.entries(contentTypes).sort((a, b) => b[1] - a[1])
  const dominantType = sortedTypes[0]?.[0] as ContentType

  const recommendations: Record<LearningStyle, string[]> = {
    visual: [],
    auditory: [],
    kinesthetic: [],
    reading_writing: [],
    mixed: [],
  }

  // Visual learners
  if (dominantType === 'concepts' || dominantType === 'procedures') {
    recommendations.visual = ['mindmap', 'flashcards', 'exam']
  } else {
    recommendations.visual = ['flashcards', 'mindmap', 'exam']
  }

  // Auditory learners
  if (dominantType === 'concepts') {
    recommendations.auditory = ['podcast', 'chat', 'flashcards']
  } else {
    recommendations.auditory = ['podcast', 'flashcards', 'quick-summary']
  }

  // Kinesthetic learners
  if (dominantType === 'procedures' || dominantType === 'formulas') {
    recommendations.kinesthetic = ['exam', 'flashcards', 'chat']
  } else {
    recommendations.kinesthetic = ['exam', 'flashcards', 'mindmap']
  }

  // Reading/Writing learners
  recommendations.reading_writing = ['flashcards', 'chat', 'exam']

  // Mixed learners (balanced approach)
  recommendations.mixed = ['flashcards', 'mindmap', 'podcast', 'exam']

  return recommendations
}

// ============================================
// AI-Powered Topic Extraction
// ============================================

const TOPIC_EXTRACTION_PROMPT = `Analyze this document and extract the main topics/chapters/sections.

For each topic, provide:
1. A concise title (2-5 words)
2. A brief description (1-2 sentences)
3. Difficulty level (easy, medium, hard) based on:
   - Concept complexity
   - Prerequisites needed
   - Technical depth
4. Estimated study time in minutes (5-60)
5. Content type classification:
   - concepts: Theoretical knowledge, definitions, theories
   - procedures: Step-by-step processes, how-to guides
   - facts: Data, statistics, historical information
   - formulas: Mathematical equations, calculations
6. Key terms/keywords (3-5 words)

Return a JSON array with this structure:
[
  {
    "title": "Topic Title",
    "description": "Brief description",
    "difficulty": "easy|medium|hard",
    "estimatedMinutes": 15,
    "contentType": "concepts|procedures|facts|formulas",
    "keywords": ["term1", "term2", "term3"]
  }
]

Document text (first 20000 chars):
`

export async function extractTopicsWithAI(
  text: string,
  documentId: string
): Promise<DocumentTopic[]> {
  try {
    const provider = getAIProvider('deepseek') // Cost-effective for analysis
    const truncatedText = text.slice(0, 20000)

    const response = await provider.complete({
      messages: [
        {
          role: 'user',
          content: TOPIC_EXTRACTION_PROMPT + truncatedText,
        },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    })

    // Parse JSON from response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[DocumentAnalyzer] No JSON array found in AI response')
      return generateFallbackTopics(text, documentId)
    }

    const topics = JSON.parse(jsonMatch[0]) as Array<{
      title: string
      description: string
      difficulty: string
      estimatedMinutes: number
      contentType: string
      keywords: string[]
    }>

    return topics.map((t, index) => ({
      id: `${documentId}-topic-${index}`,
      title: t.title,
      description: t.description,
      difficulty: (t.difficulty as TopicDifficulty) || 'medium',
      estimatedMinutes: t.estimatedMinutes || 15,
      contentType: (t.contentType as ContentType) || 'concepts',
      keywords: t.keywords || [],
    }))
  } catch (error) {
    console.error('[DocumentAnalyzer] Error extracting topics with AI:', error)
    return generateFallbackTopics(text, documentId)
  }
}

function generateFallbackTopics(text: string, documentId: string): DocumentTopic[] {
  // Simple fallback: create a single topic representing the whole document
  const wordCount = text.split(/\s+/).length
  const { score } = calculateComplexityScore(text)

  return [{
    id: `${documentId}-topic-0`,
    title: 'Main Content',
    description: 'Primary document content for study',
    difficulty: score > 60 ? 'hard' : score > 30 ? 'medium' : 'easy',
    estimatedMinutes: Math.min(Math.ceil(wordCount / 200), 60),
    contentType: 'concepts',
    keywords: [],
  }]
}

// ============================================
// Content Type Classification
// ============================================

export function classifyContentTypes(text: string): Record<ContentType, number> {
  const lowerText = text.toLowerCase()

  // Pattern matching for content types
  const conceptPatterns = /\b(definition|theory|concept|principle|understanding|means|refers to|is defined as)\b/gi
  const procedurePatterns = /\b(step|process|procedure|method|how to|first|then|finally|instructions)\b/gi
  const factPatterns = /\b(in \d{4}|percent|million|billion|study shows|research|data|statistics)\b/gi
  const formulaPatterns = /[=+\-*/^]|\b(equation|formula|calculate|solve|x\s*=|f\(x\))\b/gi

  const conceptCount = (lowerText.match(conceptPatterns) || []).length
  const procedureCount = (lowerText.match(procedurePatterns) || []).length
  const factCount = (lowerText.match(factPatterns) || []).length
  const formulaCount = (lowerText.match(formulaPatterns) || []).length

  const total = conceptCount + procedureCount + factCount + formulaCount || 1

  return {
    concepts: Math.round((conceptCount / total) * 100),
    procedures: Math.round((procedureCount / total) * 100),
    facts: Math.round((factCount / total) * 100),
    formulas: Math.round((formulaCount / total) * 100),
  }
}

// ============================================
// Main Analysis Function
// ============================================

export async function analyzeDocument(
  documentId: string,
  userId: string,
  text: string,
  options?: {
    skipAI?: boolean
    forceRefresh?: boolean
  }
): Promise<DocumentAnalysis> {
  const supabase = await createClient()

  // Check for existing analysis (unless force refresh)
  if (!options?.forceRefresh) {
    const { data: existing } = await supabase
      .from('document_analysis')
      .select('*')
      .eq('document_id', documentId)
      .single()

    if (existing) {
      return {
        id: existing.id,
        documentId: existing.document_id,
        userId: existing.user_id,
        complexityScore: existing.complexity_score,
        complexityFactors: existing.complexity_factors as ComplexityFactors,
        estimatedReadingMinutes: existing.estimated_reading_minutes,
        estimatedStudyHours: existing.estimated_study_hours,
        wordCount: existing.word_count,
        topics: existing.topics as DocumentTopic[],
        contentTypes: existing.content_types as Record<ContentType, number>,
        recommendedModes: existing.recommended_modes as Record<LearningStyle, string[]>,
        prerequisites: existing.prerequisites as string[],
        analyzedAt: new Date(existing.analyzed_at),
        analysisModel: existing.analysis_model,
      }
    }
  }

  // Calculate complexity
  const { score: complexityScore, factors: complexityFactors } = calculateComplexityScore(text)

  // Word count
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length

  // Time estimates
  const estimatedReadingMinutes = estimateReadingTime(wordCount, complexityScore)
  const estimatedStudyHours = estimateStudyTime(estimatedReadingMinutes, complexityScore)

  // Content type classification
  const contentTypes = classifyContentTypes(text)

  // Mode recommendations
  const recommendedModes = getRecommendedModes(contentTypes, complexityScore)

  // Topic extraction (AI-powered unless skipped)
  let topics: DocumentTopic[]
  let analysisModel = 'heuristic'

  if (!options?.skipAI) {
    topics = await extractTopicsWithAI(text, documentId)
    analysisModel = 'deepseek-chat'
  } else {
    topics = generateFallbackTopics(text, documentId)
  }

  // Build analysis object
  const analysis: DocumentAnalysis = {
    documentId,
    userId,
    complexityScore,
    complexityFactors,
    estimatedReadingMinutes,
    estimatedStudyHours,
    wordCount,
    topics,
    contentTypes,
    recommendedModes,
    prerequisites: [], // Could be enhanced with AI
    analyzedAt: new Date(),
    analysisModel,
  }

  // Save to database
  const { data: saved, error } = await supabase
    .from('document_analysis')
    .upsert({
      document_id: documentId,
      user_id: userId,
      complexity_score: complexityScore,
      complexity_factors: complexityFactors,
      estimated_reading_minutes: estimatedReadingMinutes,
      estimated_study_hours: estimatedStudyHours,
      word_count: wordCount,
      topics,
      content_types: contentTypes,
      recommended_modes: recommendedModes,
      prerequisites: [],
      analysis_model: analysisModel,
      analyzed_at: new Date().toISOString(),
    }, {
      onConflict: 'document_id',
    })
    .select()
    .single()

  if (error) {
    console.error('[DocumentAnalyzer] Error saving analysis:', error)
  } else if (saved) {
    analysis.id = saved.id
  }

  return analysis
}

// ============================================
// Utility: Get cached analysis
// ============================================

export async function getDocumentAnalysis(
  documentId: string
): Promise<DocumentAnalysis | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_analysis')
    .select('*')
    .eq('document_id', documentId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    documentId: data.document_id,
    userId: data.user_id,
    complexityScore: data.complexity_score,
    complexityFactors: data.complexity_factors as ComplexityFactors,
    estimatedReadingMinutes: data.estimated_reading_minutes,
    estimatedStudyHours: data.estimated_study_hours,
    wordCount: data.word_count,
    topics: data.topics as DocumentTopic[],
    contentTypes: data.content_types as Record<ContentType, number>,
    recommendedModes: data.recommended_modes as Record<LearningStyle, string[]>,
    prerequisites: data.prerequisites as string[],
    analyzedAt: new Date(data.analyzed_at),
    analysisModel: data.analysis_model,
  }
}
