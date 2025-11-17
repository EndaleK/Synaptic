"use client"

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, ArrowLeft, Star, Trash2 } from 'lucide-react'
import VideoSearch from './VideoSearch'
import VideoPlayer from './VideoPlayer'
import VideoAnalysis from './VideoAnalysis'
import MyVideosView from './MyVideosView'
import type { Video } from '@/lib/supabase/types'
import { useUser } from '@clerk/nextjs'
import { useDocumentStore } from '@/lib/store/useStore'
import { useUIStore } from '@/lib/store/useStore'

export default function VideoView() {
  const { user } = useUser()
  const setCurrentDocument = useDocumentStore(state => state.setCurrentDocument)
  const setActiveMode = useUIStore(state => state.setActiveMode)
  const [activeView, setActiveView] = useState<'search' | 'my-videos' | 'player'>('search')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [myVideos, setMyVideos] = useState<Video[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 📊 Study session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // 📊 STATISTICS: Start study session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: undefined, // VideoView doesn't always have a document
            sessionType: 'video',
            plannedDurationMinutes: 30 // Default estimate for video session
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.sessionId)
          sessionStartTime.current = new Date()
          console.log('[VideoView] Study session started:', data.sessionId)
        }
      } catch (error) {
        console.error('[VideoView] Failed to start study session:', error)
      }
    }

    startSession()
  }, [])

  // 📊 STATISTICS: Complete study session when component unmounts
  useEffect(() => {
    return () => {
      // Complete session on unmount using fetch with keepalive
      if (sessionId && sessionStartTime.current) {
        const durationMinutes = Math.round((Date.now() - sessionStartTime.current.getTime()) / 60000)

        // Only record if session lasted at least 1 minute
        if (durationMinutes >= 1) {
          // Use fetch with keepalive: works during page unload and sets proper Content-Type header
          fetch('/api/study-sessions/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              durationMinutes
            }),
            keepalive: true // Ensures request completes even during page unload
          }).then(response => {
            if (response.ok) {
              console.log('[VideoView] Study session completed:', durationMinutes, 'minutes')
            } else {
              console.warn('[VideoView] Failed to complete study session:', response.status)
            }
          }).catch(error => {
            console.error('[VideoView] Error completing study session:', error)
          })
        }
      }
    }
  }, [sessionId])

  const handleVideoSelect = async (videoId: string, videoUrl: string) => {
    if (!user) return

    setSelectedVideoId(videoId)
    setActiveView('player')
    setIsProcessing(true)
    setError(null)

    try {
      // Process video via API (handles profile lookup and duplicate checking)
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate flashcards')
      }

      const { flashcardIds } = await response.json()

      // Update video with flashcard IDs
      setVideo({
        ...video,
        generated_flashcard_ids: flashcardIds
      })

      // Get the document for this video and navigate to flashcards
      const docResponse = await fetch(`/api/video/${video.id}/document`)
      if (docResponse.ok) {
        const videoDocument = await docResponse.json()
        setCurrentDocument(videoDocument)
        setActiveMode('flashcards')
      } else {
        alert(`Successfully generated ${flashcardIds.length} flashcards! Go to the Flashcards section to view them.`)
      }
    } catch (err) {
      console.error('Flashcard generation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate flashcards')
    }
  }

  const handleGenerateMindMap = async () => {
    if (!video) return

    try {
      const response = await fetch('/api/video/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          contentType: 'mindmap'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate mind map')
      }

      const { mindmapId } = await response.json()
      alert(`Successfully generated mind map! View it in the Mind Map section.`)
    } catch (err) {
      console.error('Mind map generation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate mind map')
    }
  }

  const handleGenerateExam = async () => {
    if (!video) return

    try {
      const response = await fetch('/api/video/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          contentType: 'exam'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate exam')
      }

      const { examId } = await response.json()
      alert(`Successfully generated mock exam! View it in the Mock Exams section.`)
    } catch (err) {
      console.error('Exam generation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate exam')
    }
  }

  const handleChatWithVideo = async () => {
    if (!video) return

    try {
      // Get or create the virtual document for the video
      const response = await fetch(`/api/video/${video.id}/document`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get video document')
      }

      const videoDocument = await response.json()

      // Set the video's document as current
      setCurrentDocument(videoDocument)
      // Navigate to chat mode
      setActiveMode('chat')
    } catch (err) {
      console.error('Chat navigation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to open chat')
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

  const handleToggleFavorite = async () => {
    if (!video) return

    try {
      const newFavoritedState = !video.is_favorited

      // Optimistic UI update
      setVideo({
        ...video,
        is_favorited: newFavoritedState
      })

      const response = await fetch(`/api/video/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorited: newFavoritedState })
      })

      if (!response.ok) {
        // Revert on failure
        setVideo({
          ...video,
          is_favorited: video.is_favorited
        })
        throw new Error('Failed to toggle favorite')
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      alert(err instanceof Error ? err.message : 'Failed to toggle favorite')
    }
  }

  const handleDelete = async () => {
    if (!video) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/video/${video.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete video')
      }

      // Go back to search after successful deletion
      handleBackToSearch()
    } catch (err) {
      console.error('Error deleting video:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete video')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleReAnalyze = async () => {
    if (!video) return

    try {
      const response = await fetch(`/api/video/${video.id}/re-analyze`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to re-analyze video')
      }

      const updatedVideo = await response.json()
      setVideo(updatedVideo)
      alert('Video analysis enhanced successfully!')
    } catch (err) {
      console.error('Re-analysis error:', err)
      alert(err instanceof Error ? err.message : 'Failed to re-analyze video')
    }
  }

  const loadMyVideos = async (filter: 'all' | 'favorites' = 'all') => {
    setIsLoadingVideos(true)
    try {
      const response = await fetch(`/api/video?filter=${filter}`)
      if (!response.ok) throw new Error('Failed to load videos')
      const videos = await response.json()
      setMyVideos(videos)
    } catch (err) {
      console.error('Error loading videos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setIsLoadingVideos(false)
    }
  }

  // Tab navigation
  if (activeView === 'search' || activeView === 'my-videos') {
    return (
      <div className="h-full flex flex-col">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveView('search')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'search'
                  ? 'bg-accent-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Search YouTube
            </button>
            <button
              onClick={() => {
                setActiveView('my-videos')
                loadMyVideos('all')
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'my-videos'
                  ? 'bg-accent-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              My Videos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'search' ? (
            <VideoSearch onVideoSelect={handleVideoSelect} />
          ) : (
            <MyVideosView
              videos={myVideos}
              isLoading={isLoadingVideos}
              onVideoSelect={handleVideoSelect}
              onLoadVideos={loadMyVideos}
            />
          )}
        </div>
      </div>
    )
  }

  // Player View
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile optimized */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start sm:items-center gap-2 sm:gap-4">
          <button
            onClick={handleBackToSearch}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 sm:line-clamp-1">
              {video?.title || 'Loading...'}
            </h2>
            {video?.channel_name && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                {video.channel_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {video?.processing_status && (
              <span
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
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
            )}
            {video && (
              <>
                {/* Favorite/Bookmark Button */}
                <button
                  onClick={handleToggleFavorite}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={video.is_favorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      video.is_favorited
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete video"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                </button>
              </>
            )}
          </div>
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

      {/* Video Content - Responsive Layout: Single column on mobile, two columns on desktop */}
      {!isProcessing && !error && video && selectedVideoId && (
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 p-3 sm:p-4 md:p-6 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Player Section - Full width on mobile, left column on desktop */}
          <div className="flex flex-col min-h-0 w-full">
            <VideoPlayer
              videoId={selectedVideoId}
              transcript={video.transcript}
              onTimeUpdate={setCurrentTime}
            />
          </div>

          {/* Analysis Section - Full width on mobile, right column on desktop */}
          <div className="flex flex-col min-h-0 w-full">
            <VideoAnalysis
              videoId={video.id}
              summary={video.summary}
              keyPoints={video.key_points}
              flashcardCount={video.generated_flashcard_ids.length}
              hasTranscript={!!video.transcript && video.transcript.length > 0}
              difficultyLevel={video.difficulty_level}
              topicsCovered={video.topics_covered}
              prerequisites={video.prerequisites}
              learningOutcomes={video.learning_outcomes}
              keyVocabulary={video.key_vocabulary}
              onGenerateFlashcards={handleGenerateFlashcards}
              onGenerateMindMap={handleGenerateMindMap}
              onGenerateExam={handleGenerateExam}
              onChatWithVideo={handleChatWithVideo}
              onJumpToTimestamp={handleJumpToTimestamp}
              onReAnalyze={handleReAnalyze}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Video
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{video.title}"? This will also delete all associated flashcards and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
