"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Download, RotateCcw, Volume2, VolumeX, Loader2, BookmarkPlus, BookmarkCheck } from "lucide-react"
import { formatDetailedTime } from "@/lib/audio-utils"
import { cn } from "@/lib/utils"
import { usePodcastStore } from "@/lib/store/usePodcastStore"

export interface TranscriptEntry {
  speaker: 'host_a' | 'host_b'
  speakerName: string
  text: string
  startTime: number
  endTime: number
}

interface PodcastPlayerProps {
  podcastId: string
  audioUrl: string
  title: string
  description?: string
  duration: number
  transcript: TranscriptEntry[]
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function PodcastPlayer({
  podcastId,
  audioUrl,
  title,
  description,
  duration,
  transcript,
  onRegenerate,
  isRegenerating = false
}: PodcastPlayerProps) {
  const { getPosition, setPosition } = usePodcastStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showTranscript, setShowTranscript] = useState(true)
  const [isSaved, setIsSaved] = useState(true) // Podcasts are auto-saved during generation
  const transcriptRef = useRef<HTMLDivElement>(null)

  // 🔄 CONTINUITY: Load saved playback position when podcast changes
  useEffect(() => {
    if (!podcastId || !audioRef.current) return

    const savedPosition = getPosition(podcastId)
    if (savedPosition > 0) {
      console.log('[PodcastPlayer] Restoring playback position:', savedPosition, 'seconds for podcast:', podcastId)
      audioRef.current.currentTime = savedPosition
      setCurrentTime(savedPosition)
    } else {
      console.log('[PodcastPlayer] No saved position, starting from beginning')
      audioRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }, [podcastId, getPosition])

  // Update current time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    audio.addEventListener('timeupdate', updateTime)

    return () => audio.removeEventListener('timeupdate', updateTime)
  }, [])

  // 🔄 CONTINUITY: Save playback position with debouncing
  useEffect(() => {
    if (!podcastId || currentTime === 0) return

    // Debounce: Only save every 2 seconds to avoid too many writes
    const timeoutId = setTimeout(() => {
      console.log('[PodcastPlayer] Saving playback position:', currentTime.toFixed(1), 'seconds')
      setPosition(podcastId, currentTime, duration)
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [currentTime, podcastId, duration, setPosition])

  // Handle play/pause
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Toggle mute
  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Change playback speed
  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length]

    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = nextSpeed
    }
    setPlaybackSpeed(nextSpeed)
  }

  // Jump to transcript line
  const jumpToTime = (time: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = time
    setCurrentTime(time)
    if (!isPlaying) {
      audio.play()
      setIsPlaying(true)
    }
  }

  // Find active transcript line
  const activeLineIndex = transcript.findIndex(
    (line) => currentTime >= line.startTime && currentTime < line.endTime
  )

  // Auto-scroll transcript
  useEffect(() => {
    if (!transcriptRef.current || activeLineIndex === -1) return

    const activeElement = transcriptRef.current.querySelector(
      `[data-index="${activeLineIndex}"]`
    )
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLineIndex])

  // Download audio
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp3`
    link.click()
  }

  // Save to library (already saved, but provide visual feedback)
  const handleSave = () => {
    setIsSaved(true)
    // Show a brief visual confirmation
    setTimeout(() => {
      // Toast or notification could be added here
    }, 1000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {description}
          </p>
        )}
      </div>

      {/* Audio Player */}
      <div className="p-6 space-y-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Waveform / Progress */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-primary"
            style={{
              background: `linear-gradient(to right, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary)) ${(currentTime / duration) * 100}%, rgb(229 231 235) ${(currentTime / duration) * 100}%, rgb(229 231 235) 100%)`
            }}
          />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{formatDetailedTime(currentTime)}</span>
            <span>{formatDetailedTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent-primary transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Playback Speed */}
            <button
              onClick={cycleSpeed}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 transition-colors"
            >
              {playbackSpeed}x
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 transition-colors"
            >
              {showTranscript ? 'Hide' : 'Show'} Transcript
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent-primary transition-colors"
              title="Download podcast"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Save to Library */}
            <button
              onClick={handleSave}
              className={cn(
                "p-2 transition-colors",
                isSaved
                  ? "text-accent-primary"
                  : "text-gray-600 dark:text-gray-400 hover:text-accent-primary"
              )}
              title={isSaved ? "Saved to library" : "Save to library"}
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <BookmarkPlus className="w-5 h-5" />
              )}
            </button>

            {/* Regenerate */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary/10 dark:bg-accent-primary/20 text-accent-primary rounded-lg text-sm font-medium hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && (
        <div
          ref={transcriptRef}
          className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
        >
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Transcript
            </h3>
            {transcript.map((line, index) => (
              <div
                key={index}
                data-index={index}
                onClick={() => jumpToTime(line.startTime)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all",
                  index === activeLineIndex
                    ? "bg-accent-primary/20 dark:bg-accent-primary/30 border-l-4 border-accent-primary"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      line.speaker === 'host_a'
                        ? "bg-blue-500 text-white"
                        : "bg-pink-500 text-white"
                    )}>
                      {line.speakerName[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-black dark:text-white">
                        {line.speakerName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDetailedTime(line.startTime)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {line.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
