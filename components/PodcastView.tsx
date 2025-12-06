"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, Loader2, AlertCircle, Sparkles, History, Play } from "lucide-react"
import PodcastPlayer, { type TranscriptEntry } from "./PodcastPlayer"
import { useToast } from "./ToastContainer"
import type { PodcastFormat } from "@/lib/podcast-generator"
import DocumentSwitcherModal from "./DocumentSwitcherModal"

interface PodcastViewProps {
  documentId: string
  documentName: string
}

interface PodcastData {
  id: string
  title: string
  description: string
  audioUrl: string
  duration: number
  fileSize: number
  transcript: TranscriptEntry[]
}

/**
 * Transform database script format to transcript format expected by PodcastPlayer
 * Database stores: { lines: [{ speaker, text, emotion }] }
 * PodcastPlayer expects: [{ speaker, speakerName, text, startTime, endTime }]
 */
function transformScriptToTranscript(script: any, totalDuration: number): TranscriptEntry[] {
  // Handle case where script is already in transcript format (has speakerName)
  if (Array.isArray(script) && script.length > 0 && script[0]?.speakerName) {
    return script
  }

  // Handle case where script is PodcastScript format with lines array
  const lines = script?.lines || script || []
  if (!Array.isArray(lines) || lines.length === 0) {
    return []
  }

  // Estimate time per line based on text length
  const totalChars = lines.reduce((sum: number, line: any) => sum + (line?.text?.length || 0), 0)
  let currentTime = 0

  return lines.map((line: any) => {
    const text = line?.text || ''
    const speaker = line?.speaker || 'host_a'
    // Estimate duration proportional to text length
    const lineDuration = totalChars > 0
      ? (text.length / totalChars) * totalDuration
      : totalDuration / lines.length

    const entry: TranscriptEntry = {
      speaker: speaker as 'host_a' | 'host_b',
      speakerName: speaker === 'host_a' ? 'Alex' : 'Jordan',
      text,
      startTime: currentTime,
      endTime: currentTime + lineDuration
    }

    currentTime += lineDuration
    return entry
  })
}

export default function PodcastView({ documentId, documentName }: PodcastViewProps) {
  const toast = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [podcast, setPodcast] = useState<PodcastData | null>(null)
  const [existingPodcasts, setExistingPodcasts] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [format, setFormat] = useState<PodcastFormat>('deep-dive')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [showGenerationForm, setShowGenerationForm] = useState(true) // Always show generation form first

  // Content selection state
  const [contentType, setContentType] = useState<'full' | 'chapters' | 'pageRange' | 'smartTopics'>('full')
  const [pageRange, setPageRange] = useState({ start: '', end: '' })
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  // 📊 Study session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // Check for existing podcasts on mount
  useEffect(() => {
    const fetchExistingPodcasts = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/podcasts?documentId=${documentId}`)
        if (response.ok) {
          const data = await response.json()
          setExistingPodcasts(data.podcasts || [])

          // Auto-load the most recent podcast
          if (data.podcasts && data.podcasts.length > 0) {
            const latest = data.podcasts[0]
            // Transform database script format to transcript format for PodcastPlayer
            const transcript = transformScriptToTranscript(latest.script, latest.duration_seconds)
            setPodcast({
              id: latest.id,
              title: latest.title,
              description: `Generated ${new Date(latest.created_at).toLocaleDateString()}`,
              audioUrl: latest.audio_url,
              duration: latest.duration_seconds,
              fileSize: latest.file_size,
              transcript
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch existing podcasts:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExistingPodcasts()
  }, [documentId])

  // 📊 STATISTICS: Start study session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: documentId,
            sessionType: 'podcast',
            plannedDurationMinutes: 30 // Default estimate for podcast session
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.sessionId)
          sessionStartTime.current = new Date()
          console.log('[PodcastView] Study session started:', data.sessionId)
        }
      } catch (error) {
        console.error('[PodcastView] Failed to start study session:', error)
      }
    }

    startSession()
  }, [documentId])

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
              console.log('[PodcastView] Study session completed:', durationMinutes, 'minutes')
            } else {
              console.warn('[PodcastView] Failed to complete study session:', response.status)
            }
          }).catch(error => {
            console.error('[PodcastView] Error completing study session:', error)
          })
        }
      }
    }
  }, [sessionId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setProgressMessage('Starting podcast generation...')

    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          format,
          customPrompt: customPrompt.trim() || undefined,
          targetDuration: 10
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate podcast')
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('Failed to get response reader')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6)

              // Skip heartbeat messages
              if (data.trim() === '' || data === ': heartbeat') continue

              try {
                const event = JSON.parse(data)

                if (event.type === 'progress') {
                  setProgress(event.progress)
                  setProgressMessage(event.message)
                } else if (event.type === 'complete') {
                  setPodcast(event.data.podcast)
                  setShowGenerationForm(false) // Show the player with new podcast
                  toast.success('Podcast generated successfully!')
                } else if (event.type === 'error') {
                  throw new Error(event.error)
                }
              } catch (parseError) {
                console.error('Failed to parse SSE message:', parseError, 'Data:', data)
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response (for backwards compatibility)
        const data = await response.json()
        setPodcast(data.podcast)
        setShowGenerationForm(false) // Show the player with new podcast
        toast.success('Podcast generated successfully!')
      }

    } catch (err: any) {
      console.error('Podcast generation error:', err)
      setError(err.message || 'Failed to generate podcast')
      toast.error(err.message || 'Failed to generate podcast')
    } finally {
      setIsGenerating(false)
      setProgress(0)
      setProgressMessage('')
    }
  }

  const handleRegenerate = () => {
    setPodcast(null)
    handleGenerate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Checking for existing podcasts...</span>
      </div>
    )
  }

  // Show podcast player when user chooses to listen to existing podcast
  if (podcast && !showGenerationForm) {
    return (
      <div className="space-y-6">
        {/* Back to generation form button */}
        <button
          onClick={() => setShowGenerationForm(true)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-accent-primary transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate New Podcast
        </button>

        {/* Show existing podcast count */}
        {existingPodcasts.length > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This document has {existingPodcasts.length} podcast{existingPodcasts.length > 1 ? 's' : ''}.
                Showing the most recent one.
              </p>
            </div>
          </div>
        )}

        <PodcastPlayer
          podcastId={podcast.id}
          audioUrl={podcast.audioUrl}
          title={podcast.title}
          description={podcast.description}
          duration={podcast.duration}
          transcript={podcast.transcript}
          onRegenerate={() => {
            setShowGenerationForm(true)
          }}
          isRegenerating={isGenerating}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        {/* Compact Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white truncate">
                Audio Overview
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                Generate podcast for "{documentName}"
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Existing Podcasts Banner */}
          {existingPodcasts.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You have {existingPodcasts.length} existing podcast{existingPodcasts.length > 1 ? 's' : ''} for this document
                  </p>
                </div>
                <button
                  onClick={() => setShowGenerationForm(false)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Listen
                </button>
              </div>
            </div>
          )}

          {/* Content Selection */}
          <div>
            <label className="block text-sm font-semibold text-black dark:text-white mb-2">
              Select Content
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setContentType('full')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'full'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  Full Document
                </div>
              </button>
              <button
                onClick={() => setContentType('chapters')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'chapters'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  Chapters
                </div>
              </button>
              <button
                onClick={() => setContentType('pageRange')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'pageRange'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  Page Range
                </div>
              </button>
              <button
                onClick={() => setContentType('smartTopics')}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  contentType === 'smartTopics'
                    ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                }`}
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  Smart Topics
                </div>
              </button>
            </div>
            {/* Page Range Inputs */}
            {contentType === 'pageRange' && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Start"
                  value={pageRange.start}
                  onChange={(e) => setPageRange({ ...pageRange, start: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="End"
                  value={pageRange.end}
                  onChange={(e) => setPageRange({ ...pageRange, end: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                />
              </div>
            )}
            {/* Info message */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {contentType === 'full' && `Podcast will be generated from the entire document`}
              {contentType === 'chapters' && 'Select specific chapters (feature coming soon)'}
              {contentType === 'pageRange' && 'Specify page range to generate from'}
              {contentType === 'smartTopics' && 'AI will extract and focus on key topics (feature coming soon)'}
            </p>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-black dark:text-white mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'deep-dive', label: 'Deep Dive', icon: '🎯', desc: 'In-depth' },
                { value: 'brief', label: 'Brief', icon: '⚡', desc: 'Quick' },
                { value: 'critique', label: 'Critique', icon: '🔍', desc: 'Critical' },
                { value: 'debate', label: 'Debate', icon: '⚔️', desc: 'Two views' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value as PodcastFormat)}
                  className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                    format === option.value
                      ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-1">{option.icon}</div>
                  <div className="font-semibold text-xs sm:text-sm text-black dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {option.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors"
            >
              {showAdvanced ? '− ' : '+ '}Custom Instructions
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="E.g., 'Focus on practical applications' or 'Explain for beginners'"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all resize-none"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold text-base sm:text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Generate Podcast</span>
              </>
            )}
          </button>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-accent-primary to-accent-secondary h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-center text-gray-600 dark:text-gray-400">
                {progressMessage || 'Generating... (~2-3 minutes)'}
              </p>
              {progress > 0 && (
                <p className="text-xs text-center text-gray-500">
                  {progress}% complete
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Switcher */}
      <DocumentSwitcherModal
        onDocumentSwitch={() => {
          // Clear podcast data when switching documents
          setPodcast(null)
          setIsGenerating(false)
        }}
      />
    </div>
  )
}
