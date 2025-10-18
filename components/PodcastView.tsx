"use client"

import { useState } from "react"
import { Mic, Loader2, AlertCircle, Sparkles } from "lucide-react"
import PodcastPlayer, { type TranscriptEntry } from "./PodcastPlayer"
import { useToast } from "./ToastContainer"
import type { PodcastFormat } from "@/lib/podcast-generator"

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
  const [podcast, setPodcast] = useState<PodcastData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [format, setFormat] = useState<PodcastFormat>('deep-dive')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  if (podcast) {
    return (
      <div className="space-y-6">
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
        <div className="p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
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
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
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
              className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-black dark:text-white mb-2">
                  What to Expect
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400">•</span>
                    <span>Two AI hosts (Alex & Jordan) discuss your document</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400">•</span>
                    <span>~10 minutes of engaging conversation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400">•</span>
                    <span>Interactive transcript with timestamps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400">•</span>
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
            className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
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
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
    </div>
  )
}
