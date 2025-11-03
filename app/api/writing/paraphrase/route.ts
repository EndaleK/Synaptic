import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProviderForFeature } from '@/lib/ai'
import { logger } from '@/lib/logger'

export interface ParaphraseRequest {
  text: string
  style?: 'academic' | 'simplified' | 'professional' | 'expanded'
  numVariations?: number
}

export interface ParaphraseResponse {
  variations: string[]
  originalLength: number
  averageNewLength: number
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ParaphraseRequest = await req.json()
    const { text, style = 'academic', numVariations = 3 } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters.' },
        { status: 400 }
      )
    }

    logger.debug('Paraphrasing request', {
      userId,
      textLength: text.length,
      style,
      numVariations
    })

    // Use DeepSeek for cost-effective paraphrasing (83% cheaper than OpenAI)
    const provider = getProviderForFeature('chat')

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: 'AI provider not configured. Please add DEEPSEEK_API_KEY or OPENAI_API_KEY to environment variables.' },
        { status: 500 }
      )
    }

    // Create style-specific prompts
    const stylePrompts = {
      academic: `Rewrite the following text in a more academic and scholarly tone. Use formal language, discipline-specific terminology where appropriate, and maintain objectivity. Avoid contractions and colloquialisms. Ensure the meaning remains exactly the same.`,
      simplified: `Rewrite the following text in simpler, clearer language. Use shorter sentences, common words, and straightforward phrasing. Make it easier to understand while preserving the original meaning.`,
      professional: `Rewrite the following text in a professional, business-appropriate tone. Use clear, concise language suitable for formal communication. Maintain professionalism while keeping the core message intact.`,
      expanded: `Expand the following text by adding more detail, examples, and explanation. Elaborate on key points, provide context, and make the writing more comprehensive. Maintain the original meaning while making it more thorough.`
    }

    const systemPrompt = `You are an expert academic writing assistant. Your task is to paraphrase text while:
1. Maintaining the exact same meaning and intent
2. Changing sentence structure and word choice
3. Preserving all facts, data, and specific information
4. Avoiding plagiarism by creating truly original phrasing
5. ${stylePrompts[style]}

Generate ${numVariations} distinct variations. Each should be meaningfully different from the others.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "variations": ["variation 1", "variation 2", "variation 3"]
}

Do NOT include markdown code blocks, explanations, or any other text. Just pure JSON.`

    const userPrompt = `Text to paraphrase:\n\n"${text}"\n\nProvide ${numVariations} variations in the "${style}" style.`

    const completion = await provider.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        temperature: 0.8, // Higher temperature for more creative variations
        maxTokens: 2000
      }
    )

    let variations: string[]
    try {
      const parsed = JSON.parse(completion.content || '{}')
      variations = parsed.variations || []

      if (!Array.isArray(variations) || variations.length === 0) {
        throw new Error('No variations returned')
      }
    } catch (parseError) {
      logger.error('Failed to parse paraphrase response', parseError, {
        userId,
        response: completion.content
      })
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    const response: ParaphraseResponse = {
      variations,
      originalLength: text.length,
      averageNewLength: Math.round(
        variations.reduce((sum, v) => sum + v.length, 0) / variations.length
      )
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/writing/paraphrase', 200, duration, {
      userId,
      textLength: text.length,
      style,
      variations: variations.length
    })

    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Paraphrase API error', error, {
      duration: `${duration}ms`
    })

    return NextResponse.json(
      { error: 'Failed to paraphrase text. Please try again.' },
      { status: 500 }
    )
  }
}
