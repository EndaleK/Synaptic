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

    if (contentType !== 'flashcards') {
      return NextResponse.json(
        { error: 'Only flashcards content type is supported' },
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

    // Combine transcript and key points for flashcard generation
    const transcriptText = video.transcript.map((line: any) => line.text).join(' ')
    const keyPointsText = video.key_points.map((point: any) => `${point.title}: ${point.description}`).join('\n\n')

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
      "back": "Answer or explanation",
      "difficulty": "easy" | "medium" | "hard"
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

    // Create a virtual document for the video (to link flashcards)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: profile.id,
        file_name: `${video.title}.video`,
        file_type: 'video',
        file_size: 0,
        extracted_text: transcriptText.slice(0, 50000), // Store transcript
        document_summary: video.summary,
        processing_status: 'completed',
        source_url: video.video_url,
        source_type: 'youtube',
        metadata: {
          video_id: video.video_id,
          channel_name: video.channel_name,
          duration_seconds: video.duration_seconds
        }
      })
      .select()
      .single()

    if (docError) {
      throw docError
    }

    // Insert flashcards into database
    const flashcardInserts = flashcards.map((card: any) => ({
      user_id: profile.id,
      document_id: document.id,
      front: card.front,
      back: card.back,
      difficulty: card.difficulty || 'medium'
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
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    )
  }
}
