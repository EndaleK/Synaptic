/**
 * YouTube Transcript Fetcher using Innertube API (youtubei.js)
 *
 * Handles transcript extraction from YouTube videos using YouTube's official Innertube API
 * which properly handles authentication including PO (Proof of Origin) tokens required as of Nov 2025
 */

import { Innertube } from 'youtubei.js'

export interface TranscriptSegment {
  start_time: number
  end_time: number
  text: string
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  source: 'innertube' | 'youtube-api' | 'timedtext'
  error?: string
}

/**
 * Fetch YouTube transcript using Innertube API (youtubei.js)
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  options: {
    lang?: string
    youtubeApiKey?: string
  } = {}
): Promise<TranscriptResult> {
  const { lang = 'en' } = options

  try {
    console.log(`[Transcript] Fetching transcript for video ${videoId} using Innertube API...`)

    // Initialize Innertube client (handles authentication automatically)
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false
    })

    // Get video info
    const info = await youtube.getInfo(videoId)

    // Get transcript/captions
    const transcriptData = await info.getTranscript()

    if (!transcriptData || !transcriptData.transcript) {
      throw new Error('No transcript available for this video')
    }

    const transcript = transcriptData.transcript

    // Check if transcript has content
    if (!transcript.content || !transcript.content.body) {
      throw new Error('Transcript data is empty')
    }

    // Extract segments from transcript body
    const body = transcript.content.body

    // The transcript body contains segments in different possible formats
    // We need to handle the segments array
    let rawSegments: any[] = []

    if (body.initial_segments) {
      rawSegments = body.initial_segments
    } else if (Array.isArray(body)) {
      rawSegments = body
    } else {
      throw new Error('Unexpected transcript format')
    }

    // Parse segments into our standard format
    const segments: TranscriptSegment[] = rawSegments
      .filter((seg: any) => seg && seg.snippet && seg.snippet.text)
      .map((seg: any) => {
        const snippet = seg.snippet
        const startMs = snippet.start_ms || 0
        const durationMs = snippet.duration_ms || 0

        return {
          start_time: startMs / 1000, // Convert ms to seconds
          end_time: (startMs + durationMs) / 1000,
          text: snippet.text.trim()
        }
      })
      .filter((seg: TranscriptSegment) => seg.text.length > 0)

    if (segments.length === 0) {
      throw new Error('No valid transcript segments found')
    }

    console.log(`[Transcript] ✅ Success with Innertube API (${segments.length} segments)`)
    return { segments, source: 'innertube' }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.log(`[Transcript] ❌ Innertube API failed:`, errorMessage)

    // Provide more helpful error messages
    if (errorMessage.includes('No transcript available')) {
      throw new Error('No captions available for this video. The video may not have subtitles/captions enabled.')
    } else if (errorMessage.includes('Video unavailable')) {
      throw new Error('Video is unavailable or private.')
    } else if (errorMessage.includes('Transcript data is empty')) {
      throw new Error('Transcript exists but contains no text. The video may have disabled captions.')
    } else {
      throw new Error(`Failed to fetch transcript: ${errorMessage}`)
    }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxRetries - 1) throw err

      const delay = baseDelay * Math.pow(2, i)
      console.log(`[Transcript] Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}

/**
 * Enhanced fetch with retry (main export used by API routes)
 */
export async function fetchYouTubeTranscriptWithRetry(
  videoId: string,
  options: {
    lang?: string
    youtubeApiKey?: string
    maxRetries?: number
  } = {}
): Promise<TranscriptResult> {
  const { maxRetries = 3, ...fetchOptions } = options

  return retryWithBackoff(
    () => fetchYouTubeTranscript(videoId, fetchOptions),
    maxRetries
  )
}
