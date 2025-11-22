"use client"

import { useState, useEffect } from 'react'
import { Search, Loader2, Mic, Clock, Calendar, Play, Pause, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface Podcast {
  id: string
  title: string
  audio_url: string
  duration_seconds: number
  play_count: number
  created_at: string
  document_id: string
  documents?: {
    file_name: string
  }
}

export default function PodcastsTab() {
  const toast = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAllPodcasts()

    // Cleanup audio on unmount
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.src = ''
      }
    }
  }, [])

  const fetchAllPodcasts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/podcasts')
      if (!response.ok) {
        throw new Error('Failed to fetch podcasts')
      }

      const data = await response.json()
      setPodcasts(data.podcasts || [])
    } catch (err) {
      console.error('Error fetching podcasts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load podcasts')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter podcasts
  const filteredPodcasts = podcasts.filter(podcast => {
    const matchesSearch = searchQuery.trim() === '' ||
      podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.documents?.file_name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlay = (podcast: Podcast) => {
    // Pause current audio if playing
    if (currentAudio) {
      currentAudio.pause()
    }

    // If clicking the same podcast, stop it
    if (playingId === podcast.id) {
      setPlayingId(null)
      setCurrentAudio(null)
      return
    }

    // Play new podcast
    const audio = new Audio(podcast.audio_url)
    audio.play()
    setCurrentAudio(audio)
    setPlayingId(podcast.id)

    // Reset playing state when audio ends
    audio.onended = () => {
      setPlayingId(null)
      setCurrentAudio(null)
    }
  }

  const handleViewPodcast = (documentId: string) => {
    router.push(`/dashboard?mode=podcast&documentId=${documentId}`)
  }

  const handleDelete = async (podcastId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this podcast? This action cannot be undone.')) {
      return
    }

    setDeletingId(podcastId)

    try {
      const response = await fetch(`/api/podcasts/${podcastId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete podcast')
      }

      // Remove podcast from state
      setPodcasts(prev => prev.filter(p => p.id !== podcastId))

      // Stop audio if this podcast is playing
      if (playingId === podcastId && currentAudio) {
        currentAudio.pause()
        currentAudio.src = ''
        setPlayingId(null)
        setCurrentAudio(null)
      }
    } catch (err) {
      console.error('Error deleting podcast:', err)
      toast.error('Failed to delete podcast. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading podcasts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  if (podcasts.length === 0) {
    return (
      <div className="text-center py-12">
        <Mic className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No podcasts yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Generate podcasts from your documents to start listening
        </p>
        <button
          onClick={() => router.push('/dashboard?mode=podcast')}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Generate Podcast
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search podcasts by title or document..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">{filteredPodcasts.length}</strong> podcast{filteredPodcasts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Podcast Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPodcasts.map((podcast) => {
          const isPlaying = playingId === podcast.id

          return (
            <div
              key={podcast.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Cover */}
              <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Mic className="w-16 h-16 text-white opacity-50" />

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(podcast.id, e)}
                  disabled={deletingId === podcast.id}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  title="Delete podcast"
                >
                  {deletingId === podcast.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>

                {/* Play/Pause Button Overlay */}
                <button
                  onClick={() => handlePlay(podcast)}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
                >
                  {isPlaying ? (
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                      <Pause className="w-10 h-10 text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                      <Play className="w-10 h-10 text-purple-600 ml-1" />
                    </div>
                  )}
                </button>

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(podcast.duration_seconds)}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {podcast.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                  {podcast.documents?.file_name || 'Unknown Document'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(podcast.created_at).toLocaleDateString()}
                  </span>
                  {podcast.play_count > 0 && (
                    <span>{podcast.play_count} plays</span>
                  )}
                </div>

                <button
                  onClick={() => handleViewPodcast(podcast.document_id)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredPodcasts.length === 0 && podcasts.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No podcasts match your search
          </p>
        </div>
      )}
    </div>
  )
}
