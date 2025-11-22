import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai'

export const maxDuration = 60 // Allow up to 60 seconds for outline generation

interface OutlineRequest {
  topic: string
  writingType: 'academic' | 'professional' | 'creative'
  targetWordCount?: number
  includeThesis?: boolean
  outlineStyle?: 'minimal' | 'traditional' | 'detailed'
}

/**
 * POST /api/writing/outline
 * Generates a structured essay outline using AI
 *
 * Based on research: Planning stage is critical for organizing thoughts
 * and establishing structure before drafting (Process Writing Theory)
 */
export async function POST(req: NextRequest) {
  try {
    const body: OutlineRequest = await req.json()
    const { topic, writingType, targetWordCount, includeThesis = true, outlineStyle = 'traditional' } = body

    // Validation
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Get AI provider (prefer DeepSeek for cost-effectiveness)
    const provider = getAIProvider('writing-outline')

    // Build prompt based on parameters
    const systemPrompt = `You are an expert writing coach helping students plan their essays. Your role is to create well-structured outlines that guide students through the writing process without doing the writing for them.

IMPORTANT GUIDELINES:
- Create a clear, logical structure that students can follow
- Suggest main points and supporting details, but don't write full sentences
- Encourage critical thinking by posing questions where appropriate
- Adapt to the writing type (${writingType})
- Maintain academic integrity - this is a planning tool, not a ghostwriter

Output a structured outline in plain text format using:
- Roman numerals (I, II, III) for main sections
- Capital letters (A, B, C) for subsections
- Numbers (1, 2, 3) for supporting points
- Lowercase letters (a, b, c) for details`

    const userPrompt = `Topic: ${topic}

Writing Type: ${writingType}
${targetWordCount ? `Target Word Count: ${targetWordCount} words` : ''}
Outline Style: ${outlineStyle}

Create a ${outlineStyle} outline for this ${writingType} essay. ${includeThesis ? 'Include a suggested thesis statement at the beginning.' : ''}

${outlineStyle === 'minimal' ? 'Focus on key sections and main points only.' : ''}
${outlineStyle === 'traditional' ? 'Include main sections, subsections, and key supporting points.' : ''}
${outlineStyle === 'detailed' ? 'Provide comprehensive detail with multiple layers of supporting points and examples.' : ''}

${writingType === 'academic' ? `
For academic writing, include:
- Introduction (with thesis statement)
- Literature review or background (if applicable)
- Main body sections with clear arguments
- Counter-arguments (if relevant)
- Conclusion
- References/Works Cited section marker
` : ''}

${writingType === 'professional' ? `
For professional writing, include:
- Executive summary or introduction
- Problem statement or context
- Analysis or main points
- Recommendations or solutions
- Conclusion and next steps
` : ''}

${writingType === 'creative' ? `
For creative writing, include:
- Setup/Exposition
- Rising action
- Climax
- Falling action
- Resolution
- Themes and motifs to explore
` : ''}

Format the outline clearly with proper indentation and numbering.`

    // Generate outline using AI
    const outlineText = await provider.generateText(systemPrompt, userPrompt, {
      temperature: 0.7, // Moderate creativity
      maxTokens: outlineStyle === 'detailed' ? 1500 : outlineStyle === 'traditional' ? 1000 : 600
    })

    if (!outlineText || outlineText.trim().length === 0) {
      throw new Error('AI failed to generate outline')
    }

    // Optional: Parse structure for interactive rendering
    // (For now, returning as plain text - can enhance later)
    const structure = parseOutlineStructure(outlineText)

    return NextResponse.json({
      outline: outlineText.trim(),
      structure: structure.length > 0 ? structure : null,
      metadata: {
        topic,
        writingType,
        targetWordCount,
        outlineStyle,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error: unknown) {
    console.error('Outline generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate outline' },
      { status: 500 }
    )
  }
}

/**
 * Parse outline text into structured format
 * (Basic parser - can be enhanced)
 */
function parseOutlineStructure(outlineText: string): Array<{
  title: string
  points: string[]
  level: number
}> {
  const lines = outlineText.split('\n').filter(line => line.trim())
  const structure: Array<{ title: string; points: string[]; level: number }> = []

  let currentSection: { title: string; points: string[]; level: number } | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Roman numerals (I, II, III) - Level 1
    if (/^[IVX]+\./.test(trimmed)) {
      if (currentSection) structure.push(currentSection)
      currentSection = {
        title: trimmed.replace(/^[IVX]+\.\s*/, ''),
        points: [],
        level: 1
      }
    }
    // Capital letters (A, B, C) - Level 2
    else if (/^[A-Z]\./.test(trimmed) && currentSection) {
      currentSection.points.push(trimmed.replace(/^[A-Z]\.\s*/, ''))
    }
    // Numbers (1, 2, 3) - Level 3
    else if (/^\d+\./.test(trimmed) && currentSection) {
      currentSection.points.push('  ' + trimmed.replace(/^\d+\.\s*/, ''))
    }
  }

  if (currentSection) structure.push(currentSection)

  return structure
}
