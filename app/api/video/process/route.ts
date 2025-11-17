import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTranscript } from '@egoist/youtube-transcript-plus'
import OpenAI from 'openai'
import { incrementUsage } from '@/lib/usage-limits'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Vercel: Allow up to 5 minutes for video processing (transcript + AI analysis)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { videoId, videoUrl } = await request.json()

    if (!videoId || !videoUrl) {
      return NextResponse.json(
        { error: 'Video ID and URL are required' },
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

    // Get video metadata from YouTube Data API
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured')
    }

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    detailsUrl.searchParams.set('part', 'snippet,contentDetails')
    detailsUrl.searchParams.set('id', videoId)
    detailsUrl.searchParams.set('key', youtubeApiKey)

    const detailsResponse = await fetch(detailsUrl.toString())
    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch video metadata')
    }

    const detailsData = await detailsResponse.json()
    const videoData = detailsData.items[0]

    if (!videoData) {
      throw new Error('Video not found')
    }

    // Parse duration
    const parseDuration = (duration: string): number => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      const hours = parseInt(match[1] || '0')
      const minutes = parseInt(match[2] || '0')
      const seconds = parseInt(match[3] || '0')
      return hours * 3600 + minutes * 60 + seconds
    }

    const durationSeconds = parseDuration(videoData.contentDetails.duration)

    // Check if video already exists for this user
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', profile.id)
      .eq('video_id', videoId)
      .single()

    // If video exists, check if it needs reprocessing
    if (existingVideo) {
      const hasTranscript = existingVideo.transcript && existingVideo.transcript.length > 0
      const hasFailed = existingVideo.processing_status === 'failed'

      // Check if transcript has valid timestamps (not all zeros or all same value)
      const hasBadTimestamps = hasTranscript && (
        existingVideo.transcript.every((line: any) => line.start_time === 0) ||
        existingVideo.transcript.every((line: any) => Math.floor(line.start_time) === 0) ||
        (existingVideo.transcript.length > 5 &&
         existingVideo.transcript.slice(0, 5).every((line: any) =>
           Math.floor(line.start_time) === Math.floor(existingVideo.transcript[0].start_time)
         ))
      )

      console.log(`[Video ${videoId}] Found existing video:`, {
        id: existingVideo.id,
        hasTranscript,
        transcriptLength: existingVideo.transcript?.length || 0,
        hasFailed,
        hasBadTimestamps,
        status: existingVideo.processing_status
      })

      // Only return existing video if it has transcript with valid timestamps
      if (hasTranscript && !hasBadTimestamps) {
        console.log(`[Video ${videoId}] Returning existing video with transcript`)
        return NextResponse.json(existingVideo)
      }

      // Otherwise, delete the incomplete, failed, or bad timestamp record and reprocess
      console.log(`[Video ${videoId}] Deleting video ${hasBadTimestamps ? 'with bad timestamps' : 'without transcript'} and reprocessing...`)
      await supabase
        .from('videos')
        .delete()
        .eq('id', existingVideo.id)
    }

    // Create video record with pending status
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: profile.id,
        video_url: videoUrl,
        video_id: videoId,
        title: videoData.snippet.title,
        channel_name: videoData.snippet.channelTitle,
        duration_seconds: durationSeconds,
        thumbnail_url: videoData.snippet.thumbnails.medium.url,
        transcript: [],
        key_points: [],
        generated_flashcard_ids: [],
        processing_status: 'processing'
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Extract transcript (force English language)
    let transcript: any[] = []
    let transcriptError: string | null = null
    try {
      console.log(`[Video ${videoId}] Attempting transcript extraction with youtube-transcript-plus (English)...`)
      const transcriptData = await fetchTranscript(videoId, { lang: 'en' })
      console.log(`[Video ${videoId}] Transcript fetched successfully, ${transcriptData.segments.length} segments`)

      // Check first segment to determine if offset is in ms or seconds
      const firstOffset = transcriptData.segments[0]?.offset || 0
      const isMilliseconds = firstOffset > 100 // If offset > 100, likely milliseconds

      console.log(`[Video ${videoId}] First offset: ${firstOffset}, treating as ${isMilliseconds ? 'milliseconds' : 'seconds'}`)

      transcript = transcriptData.segments.map((line: any) => ({
        start_time: isMilliseconds ? line.offset / 1000 : line.offset,
        end_time: isMilliseconds ? (line.offset + line.duration) / 1000 : (line.offset + line.duration),
        text: line.text
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[Video ${videoId}] Transcript extraction failed:`, {
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined
      })
      transcriptError = errorMessage
      // Continue without transcript - some videos don't have captions
    }

    // Combine transcript text for AI analysis
    const fullTranscript = transcript.map(line => line.text).join(' ')

    // Generate AI summary and key points with enhanced analysis
    let summary = ''
    let keyPoints: any[] = []

    if (fullTranscript) {
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
            content: `Video Title: ${videoData.snippet.title}
Channel: ${videoData.snippet.channelTitle}
Duration: ${Math.floor(durationSeconds / 60)} minutes

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
      if (analysisText) {
        // Strip markdown code blocks if present
        let cleanedContent = analysisText.trim()
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

        const analysis = JSON.parse(cleanedContent)
        summary = analysis.summary || ''
        keyPoints = analysis.key_points || []

        // Store additional metadata in the video record
        video.difficulty_level = analysis.difficulty_level
        video.topics_covered = analysis.topics_covered || []
        video.prerequisites = analysis.prerequisites || []
        video.learning_outcomes = analysis.learning_outcomes || []
        video.key_vocabulary = analysis.key_vocabulary || []

        console.log(`[Video ${videoId}] AI analysis complete:`, {
          keyPointsCount: keyPoints.length,
          difficultyLevel: analysis.difficulty_level,
          topicsCount: analysis.topics_covered?.length || 0,
          learningOutcomesCount: analysis.learning_outcomes?.length || 0,
          vocabularyCount: analysis.key_vocabulary?.length || 0
        })
      }
    }

    // Determine processing status based on whether we got a transcript
    const finalStatus = transcript.length > 0 ? 'completed' : 'failed'

    console.log(`[Video ${videoId}] Updating video with status: ${finalStatus}, transcript segments: ${transcript.length}`)
    if (transcriptError) {
      console.log(`[Video ${videoId}] Transcript error: ${transcriptError}`)
    }

    // Update video with completed data
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        transcript,
        summary,
        key_points: keyPoints,
        processing_status: finalStatus
      })
      .eq('id', video.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Track video processing in usage tracking (only if successfully completed)
    if (finalStatus === 'completed') {
      await incrementUsage(userId, 'videos')
    }

    console.log(`[Video ${videoId}] Video processing complete`)
    return NextResponse.json(updatedVideo)
  } catch (error) {
    console.error('Video processing error:', error)

    // Try to update video status to failed
    try {
      const { userId } = await auth()
      if (userId) {
        const supabase = await createClient()
        // Would need video ID here - skip for now
      }
    } catch (err) {
      // Ignore update errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    )
  }
}
