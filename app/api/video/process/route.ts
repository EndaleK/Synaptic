import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { YoutubeTranscript } from 'youtube-transcript'
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
        processing_status: 'processing'
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Extract transcript
    let transcript: any[] = []
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
      transcript = transcriptData.map((line: any) => ({
        start_time: line.offset / 1000, // Convert ms to seconds
        end_time: (line.offset + line.duration) / 1000,
        text: line.text
      }))
    } catch (err) {
      console.error('Transcript extraction error:', err)
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

    // Update video with completed data
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        transcript,
        summary,
        key_points: keyPoints,
        processing_status: 'completed'
      })
      .eq('id', video.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

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
