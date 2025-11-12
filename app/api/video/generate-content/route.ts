import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

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

    const { videoId, contentType } = await request.json()

    if (!videoId || !contentType) {
      return NextResponse.json(
        { error: 'Video ID and content type are required' },
        { status: 400 }
      )
    }

    if (!['flashcards', 'mindmap', 'exam'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Supported types: flashcards, mindmap, exam' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get video from database
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', profile.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Check if video has transcript
    if (!video.transcript || video.transcript.length === 0) {
      return NextResponse.json(
        { error: 'This video does not have captions or transcript available. Please try a video with captions enabled.' },
        { status: 400 }
      )
    }

    // Combine transcript and key points
    const transcriptText = video.transcript.map((line: any) => line.text).join(' ')
    const keyPointsText = video.key_points?.map((point: any) => `${point.title}: ${point.description}`).join('\n\n') || ''

    // Create or get virtual document for the video (shared by all content types)
    let document
    const cleanTitle = video.title.replace(/[^\w\s-]/g, '').trim()
    const libraryFileName = `Video: ${cleanTitle}`

    const { data: existingDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', profile.id)
      .eq('file_name', libraryFileName)
      .single()

    if (existingDoc) {
      document = existingDoc
    } else {
      const { data: newDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: profile.id,
          file_name: libraryFileName,
          file_type: 'video',
          file_size: 0,
          extracted_text: transcriptText.slice(0, 50000),
          document_summary: video.summary,
          processing_status: 'completed'
        })
        .select()
        .single()

      if (docError) {
        throw docError
      }
      document = newDoc
    }

    // Handle different content types
    if (contentType === 'flashcards') {
      // Generate flashcards with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an educational flashcard generator. Create high-quality flashcards from video content.

Return a JSON object with:
{
  "flashcards": [
    {
      "front": "Question or concept to recall",
      "back": "Answer or explanation"
    }
  ]
}

Guidelines:
- Create 10-15 flashcards covering the most important concepts
- Mix difficulty levels (easier recall questions, harder application questions)
- Keep front concise (1-2 sentences)
- Keep back focused but complete (2-4 sentences)
- Cover key points comprehensively
- Use clear, educational language`
        },
        {
          role: 'user',
          content: `Video Title: ${video.title}\n\nSummary: ${video.summary}\n\nKey Learning Points:\n${keyPointsText}\n\nFull Transcript (excerpt):\n${transcriptText.slice(0, 8000)}`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No flashcards generated')
    }

    const { flashcards } = JSON.parse(responseText)

    if (!flashcards || flashcards.length === 0) {
      throw new Error('No flashcards generated')
    }

      // Insert flashcards into database
      const flashcardInserts = flashcards.map((card: any) => ({
        user_id: profile.id,
        document_id: document.id,
        front: card.front,
        back: card.back
      }))

      const { data: insertedFlashcards, error: flashcardError } = await supabase
        .from('flashcards')
        .insert(flashcardInserts)
        .select()

      if (flashcardError) {
        throw flashcardError
      }

      // Update video with flashcard IDs
      const flashcardIds = insertedFlashcards.map(fc => fc.id)

      const { error: updateError } = await supabase
        .from('videos')
        .update({
          generated_flashcard_ids: flashcardIds
        })
        .eq('id', videoId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ flashcardIds })
    } else if (contentType === 'mindmap') {
      // Use existing generate-mindmap logic via API call
      const mindmapResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-mindmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        },
        body: JSON.stringify({ documentId: document.id })
      })

      if (!mindmapResponse.ok) {
        throw new Error('Failed to generate mind map')
      }

      const mindmapData = await mindmapResponse.json()
      return NextResponse.json({ mindmapId: mindmapData.id })
    } else if (contentType === 'exam') {
      // Use existing exam generation logic via API call
      const examResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        },
        body: JSON.stringify({
          documentId: document.id,
          questionCount: 15,
          difficulty: 'mixed',
          timeLimitMinutes: 30
        })
      })

      if (!examResponse.ok) {
        throw new Error('Failed to generate exam')
      }

      const examData = await examResponse.json()
      return NextResponse.json({ examId: examData.id })
    } else {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    )
  }
}
