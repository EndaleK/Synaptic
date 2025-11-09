"use client"

import { useState, useEffect } from "react"
import { Mic, Loader2, AlertCircle, Sparkles, History } from "lucide-react"
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
            setPodcast({
              id: latest.id,
              title: latest.title,
              description: `Generated ${new Date(latest.created_at).toLocaleDateString()}`,
              audioUrl: latest.audio_url,
              duration: latest.duration_seconds,
              fileSize: latest.file_size,
              transcript: latest.script
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

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

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

      const data = await response.json()
      setPodcast(data.podcast)
      toast.success('Podcast generated successfully!')

    } catch (err: any) {
      console.error('Podcast generation error:', err)
      setError(err.message || 'Failed to generate podcast')
      toast.error(err.message || 'Failed to generate podcast')
    } finally {
      setIsGenerating(false)
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

  if (podcast) {
    return (
      <div className="space-y-6">
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
          audioUrl={podcast.audioUrl}
          title={podcast.title}
          description={podcast.description}
          duration={podcast.duration}
          transcript={podcast.transcript}
          onRegenerate={handleRegenerate}
          isRegenerating={isGenerating}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                Audio Overview
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Generate an AI-hosted podcast discussion about "{documentName}"
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-black dark:text-white mb-3">
              Podcast Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'deep-dive', label: 'Deep Dive', icon: '🎯', desc: 'In-depth exploration' },
                { value: 'brief', label: 'Brief', icon: '⚡', desc: 'Quick overview' },
                { value: 'critique', label: 'Critique', icon: '🔍', desc: 'Critical analysis' },
                { value: 'debate', label: 'Debate', icon: '⚔️', desc: 'Two perspectives' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value as PodcastFormat)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    format === option.value
                      ? 'border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-accent-primary/50 dark:hover:border-accent-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="font-semibold text-sm text-black dark:text-white mb-1">
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
              {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="E.g., 'Focus on practical applications' or 'Explain for beginners'"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all resize-none"
                    rows={3}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Guide the AI hosts to focus on specific topics or adjust the discussion style
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* What to Expect */}
          <div className="bg-gradient-to-r from-accent-primary/5 to-accent-secondary/5 dark:from-accent-primary/10 dark:to-accent-secondary/10 rounded-xl p-6 border border-accent-primary/20 dark:border-accent-primary/30">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-black dark:text-white mb-2">
                  What to Expect
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary">•</span>
                    <span>Two AI hosts (Alex & Jordan) discuss your document</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary">•</span>
                    <span>~10 minutes of engaging conversation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary">•</span>
                    <span>Interactive transcript with timestamps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary">•</span>
                    <span>Downloadable MP3 for offline listening</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                  Generation Failed
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 px-6 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating Podcast...
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Generate Audio Overview
              </>
            )}
          </button>

          {isGenerating && (
            <div className="text-center space-y-3">
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This may take 2-3 minutes. We're crafting a conversation just for you...
              </p>
            </div>
          )}

          {/* Cost Estimate */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
            Estimated cost: ~$0.15 per podcast • Uses OpenAI GPT-4 + TTS
          </div>
        </div>
      </div>

      {/* Document Switcher */}
      <DocumentSwitcherModal
        onDocumentSwitch={() => {
          // Clear podcast data when switching documents
          setPodcastData(null)
          setIsGenerating(false)
        }}
      />
    </div>
  )
}
