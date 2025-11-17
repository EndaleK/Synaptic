/**
 * YouTube Transcript Fetcher with Fallback Mechanisms
 *
 * Handles transcript extraction from YouTube videos with multiple fallback strategies
 * to ensure reliability in serverless environments (Vercel)
 */

import { fetchTranscript as fetchTranscriptPlus } from '@egoist/youtube-transcript-plus'

export interface TranscriptSegment {
  start_time: number
  end_time: number
  text: string
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  source: 'youtube-transcript-plus' | 'youtube-api' | 'timedtext'
  error?: string
}

/**
 * Fetch YouTube transcript with multiple fallback strategies
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  options: {
    lang?: string
    youtubeApiKey?: string
  } = {}
): Promise<TranscriptResult> {
  const { lang = 'en', youtubeApiKey } = options

  // Strategy 1: Try youtube-transcript-plus library (fastest, but may fail on serverless)
  try {
    console.log(`[Transcript] Trying youtube-transcript-plus for video ${videoId}...`)
    const transcriptData = await fetchTranscriptPlus(videoId, { lang })

    if (transcriptData && transcriptData.segments && transcriptData.segments.length > 0) {
      // Check first segment to determine if offset is in ms or seconds
      const firstOffset = transcriptData.segments[0]?.offset || 0
      const isMilliseconds = firstOffset > 100 // If offset > 100, likely milliseconds

      const segments: TranscriptSegment[] = transcriptData.segments.map((line: any) => ({
        start_time: isMilliseconds ? line.offset / 1000 : line.offset,
        end_time: isMilliseconds ? (line.offset + line.duration) / 1000 : (line.offset + line.duration),
        text: line.text
      }))

      console.log(`[Transcript] ✅ Success with youtube-transcript-plus (${segments.length} segments)`)
      return { segments, source: 'youtube-transcript-plus' }
    }
  } catch (err) {
    console.log(`[Transcript] ⚠️ youtube-transcript-plus failed:`, err instanceof Error ? err.message : String(err))
  }

  // Strategy 2: Try YouTube's timedtext API directly (more reliable on serverless)
  try {
    console.log(`[Transcript] Trying YouTube timedtext API for video ${videoId}...`)
    const segments = await fetchViaTimedText(videoId, lang)

    if (segments && segments.length > 0) {
      console.log(`[Transcript] ✅ Success with timedtext API (${segments.length} segments)`)
      return { segments, source: 'timedtext' }
    }
  } catch (err) {
    console.log(`[Transcript] ⚠️ Timedtext API failed:`, err instanceof Error ? err.message : String(err))
  }

  // Strategy 3: Try YouTube Data API v3 (requires API key, most reliable but slower)
  if (youtubeApiKey) {
    try {
      console.log(`[Transcript] Trying YouTube Data API v3 for video ${videoId}...`)
      const segments = await fetchViaYouTubeAPI(videoId, lang, youtubeApiKey)

      if (segments && segments.length > 0) {
        console.log(`[Transcript] ✅ Success with YouTube Data API (${segments.length} segments)`)
        return { segments, source: 'youtube-api' }
      }
    } catch (err) {
      console.log(`[Transcript] ⚠️ YouTube Data API failed:`, err instanceof Error ? err.message : String(err))
    }
  }

  // All strategies failed
  throw new Error('No captions available for this video. The video may not have subtitles/captions enabled, or they may be auto-generated only.')
}

/**
 * Fallback: Fetch transcript via YouTube's timedtext API
 */
async function fetchViaTimedText(videoId: string, lang: string): Promise<TranscriptSegment[]> {
  // Step 1: Get caption track list
  const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`

  const trackListResponse = await fetch(trackListUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!trackListResponse.ok) {
    throw new Error(`Failed to fetch caption tracks: ${trackListResponse.status}`)
  }

  const trackListXml = await trackListResponse.text()

  // Parse available caption tracks (simple XML parsing)
  const langMatch = trackListXml.match(new RegExp(`lang_code="${lang}"[^>]*name="([^"]*)"`, 'i')) ||
                    trackListXml.match(/lang_code="en"[^>]*name="([^"]*)"/) // Fallback to English

  if (!langMatch) {
    throw new Error(`No ${lang} captions found`)
  }

  // Step 2: Fetch the actual captions
  const captionsUrl = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`

  const captionsResponse = await fetch(captionsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!captionsResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionsResponse.status}`)
  }

  const captionsData = await captionsResponse.json()

  // Parse JSON3 format captions
  if (!captionsData.events) {
    throw new Error('Invalid caption format')
  }

  const segments: TranscriptSegment[] = captionsData.events
    .filter((event: any) => event.segs) // Only events with segments
    .map((event: any) => {
      const startTime = event.tStartMs / 1000 // Convert ms to seconds
      const duration = event.dDurationMs / 1000
      const text = event.segs.map((seg: any) => seg.utf8).join('')

      return {
        start_time: startTime,
        end_time: startTime + duration,
        text: text.trim()
      }
    })
    .filter((seg: TranscriptSegment) => seg.text.length > 0)

  return segments
}

/**
 * Fallback: Fetch transcript via YouTube Data API v3
 */
async function fetchViaYouTubeAPI(
  videoId: string,
  lang: string,
  apiKey: string
): Promise<TranscriptSegment[]> {
  // Step 1: Get caption track ID
  const captionsListUrl = new URL('https://www.googleapis.com/youtube/v3/captions')
  captionsListUrl.searchParams.set('part', 'snippet')
  captionsListUrl.searchParams.set('videoId', videoId)
  captionsListUrl.searchParams.set('key', apiKey)

  const captionsListResponse = await fetch(captionsListUrl.toString())

  if (!captionsListResponse.ok) {
    throw new Error(`YouTube API error: ${captionsListResponse.status}`)
  }

  const captionsListData = await captionsListResponse.json()

  if (!captionsListData.items || captionsListData.items.length === 0) {
    throw new Error('No captions available via YouTube API')
  }

  // Find caption track (prefer requested language, fallback to English, then any)
  let captionTrack = captionsListData.items.find((item: any) =>
    item.snippet.language === lang
  )

  if (!captionTrack) {
    captionTrack = captionsListData.items.find((item: any) =>
      item.snippet.language === 'en'
    )
  }

  if (!captionTrack) {
    captionTrack = captionsListData.items[0]
  }

  // Note: YouTube Data API v3 doesn't provide direct caption download
  // We need to use the timedtext API as a fallback
  return fetchViaTimedText(videoId, captionTrack.snippet.language)
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
 * Enhanced fetch with retry
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
