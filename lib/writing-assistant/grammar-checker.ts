/**
 * Enhanced Grammar and Style Checker for Academic Writing
 * Uses OpenAI GPT-4o-mini for context-aware suggestions
 */

import OpenAI from 'openai'
import type { WritingType, CitationStyle, WritingSuggestion } from '@/lib/supabase/types'
import { calculateReadability, type ReadabilityScores } from './readability'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface EnhancedAnalysisResult {
  suggestions: WritingSuggestion[]
  readabilityScores: ReadabilityScores
  wordCount: number
  characterCount: number
  sentenceCount: number
  paragraphCount: number
}

/**
 * Enhanced system prompt for academic writing analysis
 * Focuses on 6 key categories: grammar, spelling, structure, tone, citation, clarity
 */
const ACADEMIC_WRITING_SYSTEM_PROMPT = `You are an expert academic writing assistant and educator specializing in college-level composition. Your role is to provide constructive, educational feedback that helps students develop strong writing skills.

**Analysis Categories:**

1. **Grammar**: Subject-verb agreement, verb tenses, pronoun usage, articles, prepositions, sentence fragments, run-ons
2. **Spelling**: Typos, commonly confused words (their/there/they're, affect/effect, its/it's), homophone errors
3. **Structure**: Paragraph organization, topic sentences, transitions, logical flow, essay organization (intro/body/conclusion)
4. **Tone**: Academic formality, avoiding contractions, eliminating bias/informal language, appropriate passive vs active voice
5. **Citation**: Missing citations for facts/statistics/quotes, improper citation format, citation placement, over-reliance on quotes
6. **Clarity**: Wordiness, jargon without explanation, ambiguous pronouns, sentence variety, unclear antecedents, vague language

**For each issue, provide:**
- **type**: One of: "grammar", "spelling", "structure", "tone", "citation", "clarity"
- **severity**:
  - "error" = critical issue that impairs understanding or violates grammar rules
  - "warning" = should be fixed, impacts clarity or academic appropriateness
  - "suggestion" = optional improvement for style or flow
- **message**: Clear, actionable description (10-20 words max)
- **start_position**: Approximate character position where issue starts (estimate if needed)
- **end_position**: Approximate character position where issue ends (estimate if needed)
- **replacement**: Suggested fix (ONLY if you can provide exact replacement text that improves the original)
- **explanation**: Educational context explaining:
  - WHY this is an issue (academic writing standards, clarity, professionalism)
  - HOW to fix it (specific techniques or principles)
  - WHEN to apply this rule (context matters)
  - 2-4 sentences, focus on teaching

**Quality Guidelines:**
✓ Be encouraging and constructive - celebrate strengths, frame issues as growth opportunities
✓ Prioritize learning over perfection - explain principles, not just corrections
✓ Focus on high-impact issues - don't nitpick stylistic preferences
✓ Provide specific examples and context
✓ Consider the writer's intent and audience

**Academic Writing Priorities:**
1. Strong, specific thesis statements (argumentative, not descriptive)
2. Evidence-based arguments with proper source integration
3. Logical organization and clear topic sentences
4. Formal academic tone (no contractions, slang, or colloquialisms)
5. Proper citation of all borrowed ideas and facts
6. Clear, concise writing (avoid unnecessary words)
7. Smooth transitions between ideas and paragraphs
8. Varied sentence structure for readability

**Important:**
- Return ONLY valid JSON (no markdown, no code blocks)
- Limit to 10-15 most important suggestions (prioritize by severity and impact)
- For minor issues, group similar problems into one suggestion with general guidance
- If text is excellent, return empty suggestions array with compliment in a separate field

Return format: {"suggestions": [array of suggestion objects]}`

/**
 * Generate enhanced suggestions for academic writing with readability analysis
 * @param content - The text content to analyze
 * @param writingType - Type of writing (academic, professional, creative)
 * @param citationStyle - Citation format (APA, MLA, Chicago, etc.)
 * @returns Enhanced analysis result with suggestions and readability scores
 */
export async function analyzeWritingEnhanced(
  content: string,
  writingType: WritingType = 'academic',
  citationStyle?: CitationStyle
): Promise<EnhancedAnalysisResult> {
  // Calculate basic statistics
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length
  const characterCount = content.length
  const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const paragraphCount = content.split(/\n\n+/).filter(p => p.trim().length > 0).length

  // Calculate readability scores
  const readabilityScores = calculateReadability(content)

  if (!content || content.trim().length === 0) {
    return {
      suggestions: [],
      readabilityScores,
      wordCount: 0,
      characterCount: 0,
      sentenceCount: 0,
      paragraphCount: 0
    }
  }

  // Don't analyze if content is too short (less than 50 characters)
  if (content.length < 50) {
    return {
      suggestions: [],
      readabilityScores,
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: ACADEMIC_WRITING_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Please analyze this ${writingType} writing${citationStyle ? ` (citation style: ${citationStyle})` : ''}:

${content}

Target academic level: ${readabilityScores.academicLevel.replace('_', ' ')}
Current readability: ${readabilityScores.readabilityAssessment}

Focus on providing actionable, educational feedback that helps the student learn and improve.`
        }
      ],
      temperature: 0.2, // Low temperature for consistent, deterministic results
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      console.error('No analysis returned from OpenAI')
      return {
        suggestions: [],
        readabilityScores,
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount
      }
    }

    // Strip markdown code blocks if present (defensive parsing)
    let cleanedContent = analysisText.trim()
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    const analysis = JSON.parse(cleanedContent)
    const suggestions: WritingSuggestion[] = (analysis.suggestions || []).map((s: any, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      type: s.type || 'clarity',
      severity: s.severity || 'suggestion',
      message: s.message || 'Consider revising this section',
      start_position: s.start_position || 0,
      end_position: s.end_position || 0,
      replacement: s.replacement,
      explanation: s.explanation
    }))

    return {
      suggestions,
      readabilityScores,
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount
    }
  } catch (error) {
    console.error('Grammar analysis error:', error)

    // Return readability scores even if AI analysis fails
    return {
      suggestions: [],
      readabilityScores,
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use analyzeWritingEnhanced instead
 */
export async function analyzeWriting(
  content: string,
  writingType: WritingType = 'academic',
  citationStyle?: CitationStyle
): Promise<WritingSuggestion[]> {
  const result = await analyzeWritingEnhanced(content, writingType, citationStyle)
  return result.suggestions
}

/**
 * Quick grammar check for shorter texts (single sentences/paragraphs)
 * Faster, less comprehensive than full analysis
 */
export async function quickGrammarCheck(
  text: string
): Promise<WritingSuggestion[]> {
  if (!text || text.trim().length === 0) {
    return []
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a grammar checker. Identify only critical grammar and spelling errors. Return JSON with format: {"suggestions": [{"type": "grammar|spelling", "severity": "error|warning", "message": "brief issue", "start_position": 0, "end_position": 10, "replacement": "fix"}]}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      return []
    }

    const analysis = JSON.parse(analysisText)
    return (analysis.suggestions || []).map((s: any, index: number) => ({
      id: `quick-${Date.now()}-${index}`,
      type: s.type || 'grammar',
      severity: s.severity || 'error',
      message: s.message,
      start_position: s.start_position || 0,
      end_position: s.end_position || 0,
      replacement: s.replacement,
      explanation: s.explanation
    }))
  } catch (error) {
    console.error('Quick grammar check error:', error)
    return []
  }
}

/**
 * Check if text needs citations (for academic writing)
 * Identifies claims that require sources
 */
export async function checkCitationNeeds(
  content: string
): Promise<Array<{ position: number; claim: string; reason: string }>> {
  if (!content || content.trim().length === 0) {
    return []
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an academic citation expert. Identify statements that need citations (facts, statistics, research findings, expert opinions, controversial claims). Return JSON: {"claims": [{"position": character_index, "claim": "the statement", "reason": "why it needs citation"}]}`
        },
        {
          role: 'user',
          content
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      return []
    }

    const analysis = JSON.parse(analysisText)
    return analysis.claims || []
  } catch (error) {
    console.error('Citation check error:', error)
    return []
  }
}

/**
 * Analyze academic structure (thesis, topic sentences, etc.)
 */
export async function analyzeAcademicStructure(
  content: string
): Promise<{
  hasThesis: boolean
  thesisQuality: 'strong' | 'weak' | 'missing'
  thesisFeedback: string
  topicSentences: Array<{ paragraph: number; quality: string; feedback: string }>
  overallStructure: string
}> {
  if (!content || content.trim().length === 0) {
    return {
      hasThesis: false,
      thesisQuality: 'missing',
      thesisFeedback: 'No content to analyze',
      topicSentences: [],
      overallStructure: 'No structure detected'
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an academic writing expert. Analyze the essay structure and return JSON with: {"hasThesis": boolean, "thesisQuality": "strong|weak|missing", "thesisFeedback": "explanation", "topicSentences": [{"paragraph": number, "quality": "good|weak|missing", "feedback": "explanation"}], "overallStructure": "overall assessment"}`
        },
        {
          role: 'user',
          content
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      return {
        hasThesis: false,
        thesisQuality: 'missing',
        thesisFeedback: 'Analysis failed',
        topicSentences: [],
        overallStructure: 'Unable to analyze structure'
      }
    }

    return JSON.parse(analysisText)
  } catch (error) {
    console.error('Structure analysis error:', error)
    return {
      hasThesis: false,
      thesisQuality: 'missing',
      thesisFeedback: 'Error analyzing structure',
      topicSentences: [],
      overallStructure: 'Analysis error'
    }
  }
}
