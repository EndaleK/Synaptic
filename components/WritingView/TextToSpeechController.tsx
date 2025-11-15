"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Square, SkipBack, SkipForward, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TextToSpeechControllerProps {
  content: string
  enabled: boolean
  rate: number
  voiceName: string
  onHighlight?: (start: number, end: number) => void
  className?: string
}

/**
 * TextToSpeechController - Web Speech API integration for reading essays aloud
 *
 * Features:
 * - Sentence-by-sentence reading with highlighting
 * - Adjustable reading speed
 * - Voice selection
 * - Play/pause/stop controls
 * - Progress tracking
 */
export default function TextToSpeechController({
  content,
  enabled,
  rate,
  voiceName,
  onHighlight,
  className
}: TextToSpeechControllerProps) {

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [sentences, setSentences] = useState<string[]>([])
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  // Split content into sentences
  useEffect(() => {
    if (content) {
      // Split by period, exclamation mark, or question mark followed by space
      // Keep the punctuation with the sentence
      const sentenceArray = content
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0)
      setSentences(sentenceArray)
    } else {
      setSentences([])
    }
  }, [content])

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const speakSentence = (index: number) => {
    if (!synthRef.current || !sentences[index]) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(sentences[index])
    utteranceRef.current = utterance

    // Set voice
    const voices = synthRef.current.getVoices()
    const selectedVoice = voices.find(v => v.name === voiceName)
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // Set rate
    utterance.rate = rate

    // Handle events
    utterance.onstart = () => {
      setIsPlaying(true)
      setCurrentSentenceIndex(index)

      // Calculate character positions for highlighting
      const precedingText = sentences.slice(0, index).join(' ')
      const start = precedingText.length + (index > 0 ? 1 : 0) // +1 for space
      const end = start + sentences[index].length

      if (onHighlight) {
        onHighlight(start, end)
      }
    }

    utterance.onend = () => {
      // Move to next sentence
      if (index < sentences.length - 1) {
        speakSentence(index + 1)
      } else {
        // Finished reading all sentences
        setIsPlaying(false)
        setCurrentSentenceIndex(0)
        if (onHighlight) {
          onHighlight(-1, -1) // Clear highlight
        }
      }
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsPlaying(false)
      if (onHighlight) {
        onHighlight(-1, -1)
      }
    }

    synthRef.current.speak(utterance)
  }

  const handlePlay = () => {
    if (!synthRef.current) return

    if (synthRef.current.paused) {
      // Resume if paused
      synthRef.current.resume()
      setIsPlaying(true)
    } else {
      // Start from current sentence
      speakSentence(currentSentenceIndex)
    }
  }

  const handlePause = () => {
    if (synthRef.current) {
      synthRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsPlaying(false)
      setCurrentSentenceIndex(0)
      if (onHighlight) {
        onHighlight(-1, -1)
      }
    }
  }

  const handlePrevious = () => {
    const newIndex = Math.max(0, currentSentenceIndex - 1)
    setCurrentSentenceIndex(newIndex)
    if (isPlaying) {
      speakSentence(newIndex)
    }
  }

  const handleNext = () => {
    const newIndex = Math.min(sentences.length - 1, currentSentenceIndex + 1)
    setCurrentSentenceIndex(newIndex)
    if (isPlaying) {
      speakSentence(newIndex)
    }
  }

  if (!enabled || sentences.length === 0) {
    return null
  }

  const progress = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0

  return (
    <div className={cn(
      "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
      "border border-indigo-200 dark:border-indigo-800 rounded-lg p-4",
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-5 h-5 text-white" />
        </div>

        {/* Controls */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handlePrevious}
              disabled={currentSentenceIndex === 0}
              className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous sentence"
            >
              <SkipBack className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
            </button>

            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                aria-label="Play text-to-speech"
              >
                <Play className="w-4 h-4 text-white fill-white" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                aria-label="Pause text-to-speech"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>
            )}

            <button
              onClick={handleStop}
              className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              aria-label="Stop text-to-speech"
            >
              <Square className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
            </button>

            <button
              onClick={handleNext}
              disabled={currentSentenceIndex >= sentences.length - 1}
              className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next sentence"
            >
              <SkipForward className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
            </button>

            <div className="flex-1 text-sm text-indigo-800 dark:text-indigo-200">
              {currentSentenceIndex + 1} / {sentences.length} sentences
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Reading progress"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
