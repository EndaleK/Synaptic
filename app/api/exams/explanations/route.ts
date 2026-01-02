/**
 * API Route: /api/exams/explanations
 *
 * POST: Generate AI explanation for why an answer was wrong
 * Includes key concepts missed, study tips, and similar practice questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface ExplanationRequest {
  questionId: string
  questionText: string
  userAnswer: string
  correctAnswer: string
  topic: string
  examId?: string
}

interface ExplanationResponse {
  whyWrong: string
  keyConceptsMissed: string[]
  studyTip: string
  similarQuestions: {
    question: string
    correctAnswer: string
    hint: string
  }[]
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExplanationRequest = await req.json()
    const { questionId, questionText, userAnswer, correctAnswer, topic } = body

    if (!questionText || !correctAnswer) {
      return NextResponse.json(
        { error: 'questionText and correctAnswer are required' },
        { status: 400 }
      )
    }

    // Generate AI explanation
    const prompt = `You are an expert tutor helping a student understand why their exam answer was wrong.

Question: ${questionText}
Student's Answer: ${userAnswer || '(No answer provided)'}
Correct Answer: ${correctAnswer}
Topic: ${topic}

Provide a detailed analysis in JSON format with the following structure:
{
  "whyWrong": "A clear, empathetic explanation of why the student's answer was incorrect. Focus on the specific misconception or error in their reasoning. Be encouraging but direct.",
  "keyConceptsMissed": ["Concept 1 the student should review", "Concept 2", "Concept 3"],
  "studyTip": "A specific, actionable study tip to help the student master this concept. Include a memory trick or study technique if applicable.",
  "similarQuestions": [
    {
      "question": "A practice question testing the same concept",
      "correctAnswer": "The correct answer",
      "hint": "A helpful hint without giving away the answer"
    },
    {
      "question": "Another practice question with a slight variation",
      "correctAnswer": "The correct answer",
      "hint": "A helpful hint"
    }
  ]
}

Guidelines:
- Be encouraging and supportive, not condescending
- Explain the "why" behind the correct answer
- Keep explanations concise but thorough
- Generate 2 similar practice questions that test the same concept
- Key concepts should be 2-4 specific topics to review
- The study tip should be practical and immediately applicable

Return only valid JSON, no additional text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert tutor who provides clear, encouraging explanations. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from AI')
    }

    const explanation: ExplanationResponse = JSON.parse(content)

    // Validate the response structure
    if (!explanation.whyWrong || !explanation.keyConceptsMissed || !explanation.studyTip) {
      throw new Error('Invalid AI response structure')
    }

    // Ensure similarQuestions exists and is an array
    if (!Array.isArray(explanation.similarQuestions)) {
      explanation.similarQuestions = []
    }

    // Log usage for analytics (optional)
    try {
      const supabase = await createClient()
      await supabase.from('usage_tracking').insert({
        clerk_user_id: userId,
        feature: 'exam_explanation',
        tokens_used: response.usage?.total_tokens || 0,
        metadata: { questionId, topic }
      })
    } catch {
      // Ignore tracking errors
    }

    return NextResponse.json(explanation)
  } catch (error) {
    console.error('[ExamExplanations] Error:', error)

    // Return a fallback explanation if AI fails
    return NextResponse.json({
      whyWrong: 'Unable to generate a detailed explanation at this time. Please review the correct answer and compare it with your response to understand the difference.',
      keyConceptsMissed: ['Review the topic material', 'Practice similar questions'],
      studyTip: 'Try explaining the correct answer in your own words to solidify your understanding.',
      similarQuestions: []
    })
  }
}
