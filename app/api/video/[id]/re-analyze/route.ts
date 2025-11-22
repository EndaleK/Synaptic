import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { VideoTranscriptLine } from '@/lib/supabase/types'
import OpenAI from 'openai'
import { validateUUIDParam } from '@/lib/validation/uuid'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const maxDuration = 60 // 1 minute for AI analysis

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const videoId = params.id

    // Validate UUID format
    try {
      validateUUIDParam(videoId, 'Video ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Get video with transcript
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
        { error: 'No transcript available for this video' },
        { status: 400 }
      )
    }

    console.log(`[Video ${videoId}] Re-analyzing with enhanced AI...`)

    // Combine transcript text for AI analysis
    const fullTranscript = video.transcript.map((line: VideoTranscriptLine) => line.text).join(' ')

    // Generate enhanced AI analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content analyzer specializing in extracting learning value from video content.

Analyze the video transcript and extract comprehensive learning insights.

Return ONLY valid JSON (no markdown blocks) with this structure:
{
  "summary": "Comprehensive 3-5 sentence summary covering: (1) main topic, (2) key concepts taught, (3) intended audience, (4) primary takeaways",
  "difficulty_level": "beginner" | "intermediate" | "advanced" | "expert",
  "topics_covered": ["topic1", "topic2", "topic3"],
  "prerequisites": ["concept1", "concept2"] or [] if none,
  "key_points": [
    {
      "timestamp": 0,
      "title": "Clear, specific title (5-10 words)",
      "description": "Detailed explanation with context and examples (2-4 sentences)",
      "importance": "high" | "medium" | "low",
      "category": "concept" | "example" | "definition" | "application" | "insight"
    }
  ],
  "learning_outcomes": [
    "What students will be able to do after watching (3-5 concrete outcomes)"
  ],
  "key_vocabulary": [
    {"term": "technical term", "definition": "simple explanation"}
  ]
}

**Quality Guidelines**:
- Extract 8-15 key learning points, prioritized by educational value
- Focus on concepts, definitions, examples, and applications
- Include timestamps to help students navigate to specific topics
- Identify difficulty level based on complexity, terminology, and assumed knowledge
- Extract prerequisite knowledge required to understand the content
- Define key technical vocabulary for students
- Write learning outcomes in measurable terms (understand, apply, analyze, create)

**Categories**:
- concept: Core ideas or principles being taught
- example: Specific examples or case studies
- definition: Important terms being defined
- application: Practical uses or implementations
- insight: Key insights, tips, or best practices`
        },
        {
          role: 'user',
          content: `Video Title: ${video.title}
Channel: ${video.channel_name}
Duration: ${Math.floor(video.duration_seconds / 60)} minutes

Transcript:
${fullTranscript.slice(0, 15000)}${fullTranscript.length > 15000 ? '\n\n[Transcript truncated for length - focus on extracting key concepts from the content shown]' : ''}

Analyze this educational video and extract comprehensive learning insights.`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      console.error('[Re-analyze] No analysis returned from OpenAI')
      return NextResponse.json(
        { error: 'Failed to generate analysis' },
        { status: 500 }
      )
    }

    // Strip markdown code blocks if present
    let cleanedContent = analysisText.trim()
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    const analysis = JSON.parse(cleanedContent)
    const summary = analysis.summary || ''
    const keyPoints = analysis.key_points || []

    console.log(`[Video ${videoId}] Enhanced analysis complete:`, {
      keyPointsCount: keyPoints.length,
      difficultyLevel: analysis.difficulty_level,
      topicsCount: analysis.topics_covered?.length || 0,
      learningOutcomesCount: analysis.learning_outcomes?.length || 0,
      vocabularyCount: analysis.key_vocabulary?.length || 0
    })

    // Update video with enhanced metadata
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        summary,
        key_points: keyPoints,
        difficulty_level: analysis.difficulty_level,
        topics_covered: analysis.topics_covered || [],
        prerequisites: analysis.prerequisites || [],
        learning_outcomes: analysis.learning_outcomes || [],
        key_vocabulary: analysis.key_vocabulary || []
      })
      .eq('id', videoId)
      .select()
      .single()

    if (updateError) {
      console.error('[Re-analyze] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      )
    }

    console.log(`[Video ${videoId}] Re-analysis complete`)
    return NextResponse.json(updatedVideo)
  } catch (error) {
    console.error('Video re-analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to re-analyze video' },
      { status: 500 }
    )
  }
}
