"use client"

import { Video } from '@/lib/supabase/types'
import { Loader2, Star, Play, Clock } from 'lucide-react'
import { useState } from 'react'

interface MyVideosViewProps {
  videos: Video[]
  isLoading: boolean
  onVideoSelect: (videoId: string, videoUrl: string) => void
  onLoadVideos: (filter: 'all' | 'favorites') => void
}

export default function MyVideosView({
  videos,
  isLoading,
  onVideoSelect,
  onLoadVideos
}: MyVideosViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all')

  const handleFilterChange = (filter: 'all' | 'favorites') => {
    setActiveFilter(filter)
    onLoadVideos(filter)
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your videos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-accent-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All Videos
            </button>
            <button
              onClick={() => handleFilterChange('favorites')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeFilter === 'favorites'
                  ? 'bg-accent-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </p>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {videos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {activeFilter === 'favorites' ? 'No Favorite Videos' : 'No Videos Yet'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {activeFilter === 'favorites'
                  ? 'Videos you favorite will appear here for quick access.'
                  : 'Search for YouTube videos and process them to get started with AI-powered learning.'}
              </p>
              {activeFilter === 'favorites' && (
                <button
                  onClick={() => handleFilterChange('all')}
                  className="text-sm font-medium text-accent-primary hover:underline"
                >
                  View all videos
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => onVideoSelect(video.video_id, video.video_url)}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group border border-gray-200 dark:border-gray-700"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-900">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-gray-900 ml-1" />
                    </div>
                  </div>
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration_seconds)}
                  </div>
                  {/* Favorite indicator */}
                  {video.is_favorited && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 p-1.5 rounded-full">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-accent-primary transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {video.channel_name}
                  </p>

                  {/* Processing status */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        video.processing_status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : video.processing_status === 'processing'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : video.processing_status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {video.processing_status}
                    </span>
                    {video.generated_flashcard_ids && video.generated_flashcard_ids.length > 0 && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {video.generated_flashcard_ids.length} flashcards
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
