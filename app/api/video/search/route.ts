import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// YouTube API response types
interface YouTubeSearchItem {
  id: {
    videoId: string
  }
}

interface YouTubeVideoSnippet {
  title: string
  channelTitle: string
  publishedAt: string
  thumbnails: {
    medium: {
      url: string
    }
  }
}

interface YouTubeVideoDetails {
  id: string
  snippet: YouTubeVideoSnippet
  contentDetails: {
    duration: string
  }
  statistics: {
    viewCount?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { query } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Call YouTube Data API v3
    const youtubeApiKey = process.env.YOUTUBE_API_KEY

    if (!youtubeApiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      )
    }

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '10')
    searchUrl.searchParams.set('videoCaption', 'closedCaption') // Only videos with captions
    searchUrl.searchParams.set('key', youtubeApiKey)

    const searchResponse = await fetch(searchUrl.toString())

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      console.error('YouTube API error:', errorData)
      throw new Error(errorData.error?.message || 'YouTube search failed')
    }

    const searchData = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Get video IDs for details request
    const videoIds = searchData.items.map((item: YouTubeSearchItem) => item.id.videoId).join(',')

    // Get video details (duration, view count, etc.)
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics')
    detailsUrl.searchParams.set('id', videoIds)
    detailsUrl.searchParams.set('key', youtubeApiKey)

    const detailsResponse = await fetch(detailsUrl.toString())

    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch video details')
    }

    const detailsData = await detailsResponse.json()

    // Parse duration from ISO 8601 format (e.g., "PT15M33S")
    const parseDuration = (duration: string): number => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0

      const hours = parseInt(match[1] || '0')
      const minutes = parseInt(match[2] || '0')
      const seconds = parseInt(match[3] || '0')

      return hours * 3600 + minutes * 60 + seconds
    }

    // Format results
    const results = detailsData.items.map((item: YouTubeVideoDetails) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      durationSeconds: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount || '0'),
      publishedAt: item.snippet.publishedAt
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Video search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search videos' },
      { status: 500 }
    )
  }
}
