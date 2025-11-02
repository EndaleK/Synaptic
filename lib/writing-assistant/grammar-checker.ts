/**
 * Enhanced Grammar and Style Checker for Academic Writing
 * Uses OpenAI GPT-4o-mini for context-aware suggestions
 */

import OpenAI from 'openai'
import type { WritingType, CitationStyle, WritingSuggestion } from '@/lib/supabase/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Enhanced system prompt for academic writing analysis
 * Focuses on 6 key categories: grammar, spelling, structure, tone, citation, clarity
 */
const ACADEMIC_WRITING_SYSTEM_PROMPT = `You are an expert academic writing assistant for college students. Your role is to provide constructive, educational feedback that helps students improve their writing skills.

Analyze the provided text for the following categories:

1. **Grammar**: Subject-verb agreement, verb tenses, pronouns, articles, prepositions
2. **Spelling**: Typos, commonly confused words (their/there/they're, affect/effect)
3. **Structure**: Paragraph organization, topic sentences, transitions, logical flow
4. **Tone**: Academic formality, avoiding contractions, eliminating bias, passive vs active voice
5. **Citation**: Missing citations for claims, improper citation format, citation placement
6. **Clarity**: Wordiness, jargon, ambiguous pronouns, run-on sentences, sentence variety

For each issue found, provide:
- **type**: One of: "grammar", "spelling", "structure", "tone", "citation", "clarity"
- **severity**: "error" (must fix), "warning" (should fix), "suggestion" (consider fixing)
- **message**: Brief, clear description of the issue (10-15 words)
- **start_position**: Character position where issue starts
- **end_position**: Character position where issue ends
- **replacement**: Suggested fix (ONLY if you can provide exact replacement text)
- **explanation**: Educational context explaining WHY this is an issue and HOW to fix it (2-3 sentences)

Guidelines:
- Be encouraging and constructive, not critical
- Prioritize learning over perfection
- Explain the "why" behind each suggestion
- Focus on issues that genuinely impact clarity or correctness
- For academic writing, emphasize:
  * Strong thesis statements
  * Evidence-based arguments
  * Proper citation placement
  * Formal academic tone
  * Clear topic sentences
  * Logical paragraph structure

Return your analysis as a JSON object with a "suggestions" array.`

/**
 * Generate enhanced suggestions for academic writing
 * @param content - The text content to analyze
 * @param writingType - Type of writing (academic, professional, creative)
 * @param citationStyle - Citation format (APA, MLA, Chicago, etc.)
 * @returns Array of writing suggestions with detailed feedback
 */
export async function analyzeWriting(
  content: string,
  writingType: WritingType = 'academic',
  citationStyle?: CitationStyle
): Promise<WritingSuggestion[]> {
  if (!content || content.trim().length === 0) {
    return []
  }

  // Don't analyze if content is too short (less than 50 characters)
  if (content.length < 50) {
    return []
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
      return []
    }

    const analysis = JSON.parse(analysisText)
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

    return suggestions
  } catch (error) {
    console.error('Grammar analysis error:', error)

    // Return empty array on error, don't break the user experience
    return []
  }
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
