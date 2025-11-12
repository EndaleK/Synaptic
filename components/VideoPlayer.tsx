"use client"

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Clock } from 'lucide-react'
import type { VideoTranscriptLine } from '@/lib/supabase/types'

interface VideoPlayerProps {
  videoId: string
  transcript: VideoTranscriptLine[]
  onTimeUpdate?: (currentTime: number) => void
}

export default function VideoPlayer({ videoId, transcript, onTimeUpdate }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeTranscriptIndex, setActiveTranscriptIndex] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)
  const transcriptItemsRef = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const playerRef = useRef<any>(null)

  // YouTube IFrame API
  useEffect(() => {
    const initPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        // API already loaded, create player directly
        playerRef.current = new (window as any).YT.Player(`youtube-player-${videoId}`, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
          }
        })
      } else {
        // Load YouTube IFrame API if not loaded
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          const firstScriptTag = document.getElementsByTagName('script')[0]
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        }

        // Initialize player when API is ready
        ;(window as any).onYouTubeIframeAPIReady = () => {
          playerRef.current = new (window as any).YT.Player(`youtube-player-${videoId}`, {
            videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0
            },
            events: {
              onReady: onPlayerReady,
              onStateChange: onPlayerStateChange
            }
          })
        }
      }
    }

    initPlayer()

    // Cleanup
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId])

  const onPlayerReady = (event: any) => {
    const player = event.target
    setDuration(player.getDuration())

    // Poll for current time
    const interval = setInterval(() => {
      if (!playerRef.current) {
        clearInterval(interval)
        return
      }

      try {
        const currentTime = player.getCurrentTime()
        setCurrentTime(currentTime)
        onTimeUpdate?.(currentTime)

        // Find active transcript line
        const activeIndex = transcript.findIndex(
          (line, index) => {
            const nextLine = transcript[index + 1]
            return currentTime >= line.start_time && (!nextLine || currentTime < nextLine.start_time)
          }
        )

        if (activeIndex !== -1 && activeIndex !== activeTranscriptIndex) {
          setActiveTranscriptIndex(activeIndex)

          // Auto-scroll to active transcript
          const activeElement = transcriptItemsRef.current[activeIndex]
          if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      } catch (err) {
        // Player might be destroyed
        clearInterval(interval)
      }
    }, 100)
  }

  const onPlayerStateChange = (event: any) => {
    const state = event.data
    // 1 = playing, 2 = paused
    setIsPlaying(state === 1)
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleTranscriptClick = (startTime: number) => {
    // Seek to timestamp in YouTube player
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(startTime, true)
      playerRef.current.playVideo()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Video Player */}
      <div className="relative aspect-video bg-black">
        <div
          id={`youtube-player-${videoId}`}
          ref={iframeRef}
          className="w-full h-full"
        />
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Synchronized Transcript */}
      <div className="flex-1 overflow-y-auto p-4" ref={transcriptContainerRef}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Transcript
        </h3>

        {transcript.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No transcript available for this video
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transcript.map((line, index) => (
              <div
                key={index}
                ref={(el) => (transcriptItemsRef.current[index] = el)}
                onClick={() => handleTranscriptClick(line.start_time)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  index === activeTranscriptIndex
                    ? 'bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border-l-4 border-accent-primary'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0 w-16">
                    {formatTime(line.start_time)}
                  </span>
                  <p
                    className={`text-sm leading-relaxed ${
                      index === activeTranscriptIndex
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {line.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
