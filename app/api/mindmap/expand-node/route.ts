import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { userId } = await auth()

    if (!userId) {
      logger.warn('Unauthenticated mind map node expansion request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { nodeId, nodeLabel, nodeDescription, documentText } = body

    logger.debug('Mind map node expansion request', {
      userId,
      nodeId,
      nodeLabel,
      hasDocumentText: !!documentText,
      documentTextLength: documentText?.length
    })

    if (!nodeLabel || !documentText) {
      logger.warn('Mind map node expansion validation failed', {
        userId,
        nodeId,
        hasNodeLabel: !!nodeLabel,
        hasDocumentText: !!documentText
      })
      return NextResponse.json(
        { error: 'Missing required fields: nodeLabel and documentText' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured for mind map node expansion', null, {
        userId,
        nodeId,
        environment: process.env.VERCEL ? 'Vercel' : 'Local',
        suggestion: 'Add OPENAI_API_KEY to Vercel environment variables dashboard'
      })
      return NextResponse.json(
        {
          error: 'AI service not configured',
          expandedExplanation: 'Mind map node expansion requires an OpenAI API key. Please add OPENAI_API_KEY to your environment variables in Vercel dashboard and redeploy.',
          quotes: [],
          examples: [],
          configurationHelp: 'Visit your Vercel project settings → Environment Variables → Add OPENAI_API_KEY'
        },
        { status: 500 }
      )
    }

    // Truncate document text to prevent token limit issues (~16K chars = ~4K tokens)
    const truncatedText = documentText.length > 16000
      ? documentText.substring(0, 16000) + '...'
      : documentText

    logger.debug('Generating mind map node expansion with OpenAI', {
      userId,
      nodeId,
      nodeLabel,
      truncatedLength: truncatedText.length,
      originalLength: documentText.length
    })

    // Generate detailed expansion using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an educational assistant helping students understand concepts from their study materials.
Your task is to expand on a specific concept from a mind map by:
1. Providing a comprehensive explanation (2-3 paragraphs)
2. Finding 2-3 relevant, direct quotes from the source material
3. Creating 2-3 practical examples or applications

Be thorough, educational, and engaging. Focus on helping the student deeply understand the concept.`
        },
        {
          role: 'user',
          content: `Source Document:
${truncatedText}

Mind Map Concept: "${nodeLabel}"
${nodeDescription ? `Brief Description: ${nodeDescription}` : ''}

Please provide:
1. An expanded explanation (2-3 paragraphs) that thoroughly explains this concept
2. 2-3 relevant direct quotes from the source document that support or illustrate this concept
3. 2-3 practical examples or real-world applications of this concept

Format your response as JSON with this structure:
{
  "expandedExplanation": "detailed explanation here",
  "quotes": [
    {"text": "quote text", "context": "why this quote is relevant"},
    ...
  ],
  "examples": [
    {"title": "example title", "description": "example description"},
    ...
  ]
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const parsedResponse = JSON.parse(responseText)

    // Validate response structure
    const expandedExplanation = parsedResponse.expandedExplanation || 'No detailed explanation available.'
    const quotes = Array.isArray(parsedResponse.quotes) ? parsedResponse.quotes : []
    const examples = Array.isArray(parsedResponse.examples) ? parsedResponse.examples : []

    const duration = Date.now() - startTime
    logger.debug('Mind map node expansion complete', {
      userId,
      nodeId,
      nodeLabel,
      quotesCount: quotes.length,
      examplesCount: examples.length,
      duration: `${duration}ms`
    })

    logger.api('POST', '/api/mindmap/expand-node', 200, duration, {
      userId,
      nodeId,
      nodeLabel
    })

    return NextResponse.json({
      nodeId,
      nodeLabel,
      expandedExplanation,
      quotes,
      examples
    })

  } catch (error) {
    const duration = Date.now() - startTime

    // Get userId from auth if available for error logging
    let errorUserId = 'unknown'
    try {
      const { userId: authUserId } = await auth()
      errorUserId = authUserId || 'unknown'
    } catch {}

    logger.error('Mind map node expansion error', error, {
      userId: errorUserId,
      nodeId: req.url,
      duration: `${duration}ms`,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })

    logger.api('POST', '/api/mindmap/expand-node', 500, duration, {
      userId: errorUserId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to expand node details',
        message: error instanceof Error ? error.message : 'Unknown error',
        help: 'Check Vercel logs for detailed error information. Ensure OPENAI_API_KEY is configured in environment variables.'
      },
      { status: 500 }
    )
  }
}
