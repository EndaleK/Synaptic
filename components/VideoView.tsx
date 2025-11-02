"use client"

import { useState, useEffect } from 'react'
import { Search, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import VideoSearch from './VideoSearch'
import VideoPlayer from './VideoPlayer'
import VideoAnalysis from './VideoAnalysis'
import type { Video } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'

export default function VideoView() {
  const { user } = useUser()
  const [activeView, setActiveView] = useState<'search' | 'player'>('search')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const handleVideoSelect = async (videoId: string, videoUrl: string) => {
    if (!user) return

    setSelectedVideoId(videoId)
    setActiveView('player')
    setIsProcessing(true)
    setError(null)

    try {
      // Check if video already exists in database
      const supabase = createClient()

      // Get user profile (created by middleware)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!profile || profileError) {
        // Profile should have been created by middleware
        // If it doesn't exist, refresh the page to trigger middleware again
        console.error('User profile not found, refreshing page...', profileError)
        window.location.reload()
        return
      }

      // Check for existing video
      const { data: existingVideo } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('video_id', videoId)
        .single()

      if (existingVideo) {
        // Video already processed
        setVideo(existingVideo)
        setIsProcessing(false)
        return
      }

      // Process new video
      const response = await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, videoUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process video')
      }

      const processedVideo = await response.json()
      setVideo(processedVideo)
    } catch (err) {
      console.error('Video processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process video')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!video) return

    try {
      const response = await fetch('/api/video/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          contentType: 'flashcards'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate flashcards')
      }

      const { flashcardIds } = await response.json()

      // Update video with flashcard IDs
      setVideo({
        ...video,
        generated_flashcard_ids: flashcardIds
      })

      alert(`Successfully generated ${flashcardIds.length} flashcards!`)
    } catch (err) {
      console.error('Flashcard generation error:', err)
      alert('Failed to generate flashcards')
    }
  }

  const handleJumpToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp)
    // VideoPlayer component will handle the actual seeking
  }

  const handleBackToSearch = () => {
    setActiveView('search')
    setSelectedVideoId(null)
    setVideo(null)
    setError(null)
  }

  if (activeView === 'search') {
    return <VideoSearch onVideoSelect={handleVideoSelect} />
  }

  // Player View
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSearch}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {video?.title || 'Loading...'}
            </h2>
            {video?.channel_name && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {video.channel_name}
              </p>
            )}
          </div>
          {video?.processing_status && (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
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
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6">
          <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Processing Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
                <button
                  onClick={handleBackToSearch}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Back to Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Processing Video
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Extracting transcript, generating summary, and identifying key learning points...
            </p>
          </div>
        </div>
      )}

      {/* Video Content - Two Column Layout */}
      {!isProcessing && !error && video && selectedVideoId && (
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 min-h-0">
          {/* Left Column: Player + Transcript */}
          <div className="flex flex-col min-h-0">
            <VideoPlayer
              videoId={selectedVideoId}
              transcript={video.transcript}
              onTimeUpdate={setCurrentTime}
            />
          </div>

          {/* Right Column: Analysis */}
          <div className="flex flex-col min-h-0">
            <VideoAnalysis
              summary={video.summary}
              keyPoints={video.key_points}
              flashcardCount={video.generated_flashcard_ids.length}
              onGenerateFlashcards={handleGenerateFlashcards}
              onJumpToTimestamp={handleJumpToTimestamp}
            />
          </div>
        </div>
      )}
    </div>
  )
}
