import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTranscript } from '@egoist/youtube-transcript-plus'
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

    // Generate AI summary and key points
    let summary = ''
    let keyPoints: any[] = []

    if (fullTranscript) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an educational content analyzer. Analyze video transcripts and extract key learning points.

Return a JSON object with:
{
  "summary": "A 2-3 sentence summary of the main topic and key takeaways",
  "key_points": [
    {
      "timestamp": 0 (approximate timestamp in seconds),
      "title": "Brief title of this concept",
      "description": "Detailed explanation of this learning point",
      "importance": "high" | "medium" | "low"
    }
  ]
}

Focus on educational value. Extract 5-10 key learning points.`
          },
          {
            role: 'user',
            content: `Video Title: ${videoData.snippet.title}\n\nTranscript:\n${fullTranscript.slice(0, 12000)}` // Limit to ~3000 tokens
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })

      const analysisText = completion.choices[0]?.message?.content
      if (analysisText) {
        const analysis = JSON.parse(analysisText)
        summary = analysis.summary || ''
        keyPoints = analysis.key_points || []
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
