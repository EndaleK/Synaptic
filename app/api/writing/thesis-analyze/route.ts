import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProviderForFeature } from '@/lib/ai'
import { logger } from '@/lib/logger'

export interface ThesisAnalysisRequest {
  content: string
}

export interface ThesisAnalysisResponse {
  hasThesis: boolean
  thesisStatement: string | null
  thesisQuality: 'strong' | 'weak' | 'missing'
  thesisFeedback: string
  isArgumentative: boolean
  isSpecific: boolean
  isClearlyStated: boolean
  suggestions: string[]
  topicSentences: Array<{
    paragraph: number
    sentence: string | null
    quality: 'strong' | 'weak' | 'missing'
    feedback: string
  }>
  overallStructure: {
    hasIntroduction: boolean
    hasBody: boolean
    hasConclusion: boolean
    paragraphCount: number
    feedback: string
  }
  argumentStrength: {
    score: number // 0-100
    hasEvidence: boolean
    hasCounterarguments: boolean
    hasAnalysis: boolean
    feedback: string
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ThesisAnalysisRequest = await req.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length < 100) {
      return NextResponse.json(
        { error: 'Content too short for analysis. Minimum 100 characters.' },
        { status: 400 }
      )
    }

    logger.debug('Thesis analysis request', {
      userId,
      contentLength: content.length
    })

    // Use OpenAI GPT-4o-mini for high-quality structural analysis
    const provider = getProviderForFeature('chat')

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert academic writing instructor specializing in thesis statements and essay structure. Analyze the provided essay for:

1. **Thesis Statement**: Identify the main thesis, evaluate its quality, and provide specific feedback
2. **Topic Sentences**: Check each paragraph for clear topic sentences
3. **Overall Structure**: Assess introduction, body paragraphs, and conclusion
4. **Argument Strength**: Evaluate evidence, counter-arguments, and analysis

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "hasThesis": boolean,
  "thesisStatement": "the actual thesis text or null",
  "thesisQuality": "strong|weak|missing",
  "thesisFeedback": "detailed feedback on thesis",
  "isArgumentative": boolean,
  "isSpecific": boolean,
  "isClearlyStated": boolean,
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "topicSentences": [
    {
      "paragraph": 1,
      "sentence": "first sentence of paragraph or null",
      "quality": "strong|weak|missing",
      "feedback": "feedback on this topic sentence"
    }
  ],
  "overallStructure": {
    "hasIntroduction": boolean,
    "hasBody": boolean,
    "hasConclusion": boolean,
    "paragraphCount": number,
    "feedback": "overall structure feedback"
  },
  "argumentStrength": {
    "score": 0-100,
    "hasEvidence": boolean,
    "hasCounterarguments": boolean,
    "hasAnalysis": boolean,
    "feedback": "argument strength feedback"
  }
}`

    const userPrompt = `Analyze this essay:\n\n${content}\n\nProvide comprehensive structural analysis with actionable feedback.`

    const completion = await provider.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        temperature: 0.3, // Lower temperature for consistent analysis
        maxTokens: 2500
      }
    )

    let analysis: ThesisAnalysisResponse
    try {
      analysis = JSON.parse(completion.content || '{}')

      // Validate required fields
      if (typeof analysis.hasThesis === 'undefined') {
        throw new Error('Invalid response structure')
      }
    } catch (parseError) {
      logger.error('Failed to parse thesis analysis response', parseError, {
        userId,
        response: completion.content
      })
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/writing/thesis-analyze', 200, duration, {
      userId,
      contentLength: content.length,
      thesisQuality: analysis.thesisQuality,
      structureScore: analysis.argumentStrength.score
    })

    return NextResponse.json(analysis)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Thesis analysis API error', error, {
      duration: `${duration}ms`
    })

    return NextResponse.json(
      { error: 'Failed to analyze thesis. Please try again.' },
      { status: 500 }
    )
  }
}
