import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { nodeId, nodeLabel, nodeDescription, documentText } = body

    if (!nodeLabel || !documentText) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeLabel and documentText' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          expandedExplanation: 'API key not configured. Please add OPENAI_API_KEY to your environment variables.',
          quotes: [],
          examples: []
        },
        { status: 500 }
      )
    }

    // Truncate document text to prevent token limit issues (~16K chars = ~4K tokens)
    const truncatedText = documentText.length > 16000
      ? documentText.substring(0, 16000) + '...'
      : documentText

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

    return NextResponse.json({
      nodeId,
      nodeLabel,
      expandedExplanation,
      quotes,
      examples
    })

  } catch (error) {
    console.error('Error expanding mind map node:', error)

    return NextResponse.json(
      {
        error: 'Failed to expand node details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
