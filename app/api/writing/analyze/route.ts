import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import type { WritingType, CitationStyle, WritingSuggestion } from '@/lib/supabase/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content, writingType, citationStyle } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Call OpenAI to analyze the writing
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert writing assistant specialized in ${writingType} writing. Analyze the provided text and identify issues with:
- Grammar and spelling
- Sentence structure and flow
- Tone consistency (formal for academic, professional for business, engaging for creative)
- Clarity and conciseness
- ${citationStyle} citation format (if citations are present)
- Academic writing requirements (thesis statements, arguments, evidence for academic writing)

Return your analysis as a JSON array of suggestions. Each suggestion must have:
{
  "id": "unique-id",
  "type": "grammar" | "spelling" | "structure" | "tone" | "citation" | "clarity",
  "severity": "error" | "warning" | "suggestion",
  "message": "Brief description of the issue",
  "start_position": number (character position in text),
  "end_position": number (character position in text),
  "replacement": "Suggested replacement text (optional)",
  "explanation": "Detailed explanation of why this is an issue (optional)"
}

Be constructive and helpful. Focus on the most important issues first.`
        },
        {
          role: 'user',
          content: `Please analyze this ${writingType} writing (citation style: ${citationStyle}):\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI')
    }

    const analysis = JSON.parse(analysisText)
    const suggestions: WritingSuggestion[] = analysis.suggestions || []

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Writing analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze writing' },
      { status: 500 }
    )
  }
}
