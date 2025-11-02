"use client"

import { useState } from 'react'
import { Search, Youtube, Clock, User, TrendingUp, Loader2 } from 'lucide-react'

interface VideoSearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnailUrl: string
  durationSeconds: number
  viewCount?: number
  publishedAt: string
}

interface VideoSearchProps {
  onVideoSelect: (videoId: string, videoUrl: string) => void
}

export default function VideoSearch({ onVideoSelect }: VideoSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<VideoSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`
    }
    return `${count} views`
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/video/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const { results } = await response.json()
      setResults(results)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Failed to search videos')
    } finally {
      setIsSearching(false)
    }
  }

  const handleVideoClick = (videoId: string) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    onVideoSelect(videoId, videoUrl)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Search Bar */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Youtube className="w-7 h-7 text-red-500" />
            Search YouTube Videos
          </h2>

          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for educational videos..."
              className="w-full px-5 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </form>

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {results.length === 0 && !isSearching && (
          <div className="max-w-3xl mx-auto text-center py-12">
            <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Search for Educational Videos
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Find YouTube videos to learn from. We'll extract transcripts, generate summaries, and create flashcards automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSearchQuery('machine learning tutorial')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Machine Learning
              </button>
              <button
                onClick={() => setSearchQuery('calculus explained')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Calculus
              </button>
              <button
                onClick={() => setSearchQuery('biology basics')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Biology
              </button>
              <button
                onClick={() => setSearchQuery('programming tutorial')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Programming
              </button>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="max-w-3xl mx-auto text-center py-12">
            <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Searching YouTube...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Search Results ({results.length})
            </h3>

            {results.map((video) => (
              <div
                key={video.videoId}
                onClick={() => handleVideoClick(video.videoId)}
                className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-accent-primary dark:hover:border-accent-primary hover:shadow-lg transition-all cursor-pointer group"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-48 h-27 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatDuration(video.durationSeconds)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors">
                    {video.title}
                  </h4>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <User className="w-4 h-4" />
                    <span>{video.channelName}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    {video.viewCount && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {formatViewCount(video.viewCount)}
                      </span>
                    )}
                    <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Select Button */}
                <div className="flex items-center">
                  <button className="px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
