"use client"

/**
 * VoiceChat Component
 *
 * Provides voice input (Whisper) and voice output (TTS) capabilities for chat.
 * Can be integrated into ChatInterface for hands-free conversation with documents.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Loader2, Square, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface VoiceChatProps {
  onTranscription: (text: string) => void
  textToSpeak?: string
  isAssistantSpeaking?: boolean
  onSpeakingChange?: (isSpeaking: boolean) => void
  disabled?: boolean
  className?: string
}

// Audio visualization bars count
const VISUALIZER_BARS = 12

export default function VoiceChat({
  onTranscription,
  textToSpeak,
  isAssistantSpeaking = false,
  onSpeakingChange,
  disabled = false,
  className
}: VoiceChatProps) {
  const toast = useToast()

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(VISUALIZER_BARS).fill(0))
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Voice output state
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refs for TTS playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTextRef = useRef<string>('')

  // Notify parent of speaking state changes
  useEffect(() => {
    onSpeakingChange?.(isSpeaking)
  }, [isSpeaking, onSpeakingChange])

  // Auto-speak new assistant messages if voice is enabled
  useEffect(() => {
    if (textToSpeak && voiceEnabled && textToSpeak !== currentTextRef.current) {
      currentTextRef.current = textToSpeak
      speakText(textToSpeak)
    }
  }, [textToSpeak, voiceEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      stopSpeaking()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  // Update audio visualization
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current || !isRecording) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const bars: number[] = []
    const sliceWidth = Math.floor(dataArray.length / VISUALIZER_BARS)

    for (let i = 0; i < VISUALIZER_BARS; i++) {
      let sum = 0
      for (let j = 0; j < sliceWidth; j++) {
        sum += dataArray[i * sliceWidth + j]
      }
      bars.push(Math.min(100, (sum / sliceWidth) * 0.5))
    }

    setAudioLevel(bars)
    animationFrameRef.current = requestAnimationFrame(updateVisualization)
  }, [isRecording])

  // === VOICE INPUT (Recording + Whisper) ===

  const startRecording = async () => {
    try {
      // Stop any playing audio first
      stopSpeaking()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      streamRef.current = stream

      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Determine best supported format
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        await processAudio()
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingDuration(0)

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      updateVisualization()
    } catch (error) {
      console.error('Failed to start recording:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone permission denied')
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found')
        } else {
          toast.error(`Recording failed: ${error.message}`)
        }
      }
    }
  }

  const stopRecording = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsRecording(false)
    setAudioLevel(new Array(VISUALIZER_BARS).fill(0))
  }

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.warning('No audio recorded')
      return
    }

    setIsProcessing(true)

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

      if (audioBlob.size < 1000) {
        toast.warning('Recording too short')
        setIsProcessing(false)
        return
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Transcription failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.text?.trim()) {
        onTranscription(data.text.trim())
      } else {
        toast.warning('No speech detected')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      toast.error(error instanceof Error ? error.message : 'Transcription failed')
    } finally {
      setIsProcessing(false)
      audioChunksRef.current = []
    }
  }

  // === VOICE OUTPUT (TTS) ===

  const speakText = async (text: string) => {
    if (!text || !voiceEnabled) return

    // Stop any current playback
    stopSpeaking()

    try {
      setIsSpeaking(true)

      // Use OpenAI TTS API
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.substring(0, 4096), // TTS has a character limit
          voice: 'nova', // Options: alloy, echo, fable, onyx, nova, shimmer
          speed: 1.0
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('TTS failed')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (error) {
      console.error('TTS error:', error)
      setIsSpeaking(false)
      // Silently fail - TTS is optional
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsSpeaking(false)
    setIsPaused(false)
  }

  const togglePause = () => {
    if (!audioRef.current) return

    if (isPaused) {
      audioRef.current.play()
      setIsPaused(false)
    } else {
      audioRef.current.pause()
      setIsPaused(true)
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Voice Input Button */}
      <button
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "p-2 rounded-lg transition-all",
          isRecording
            ? "bg-red-500 text-white animate-pulse"
            : isProcessing
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        )}
        title={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Recording Duration */}
      {isRecording && (
        <span className="text-xs font-mono text-red-500 animate-pulse">
          {formatDuration(recordingDuration)}
        </span>
      )}

      {/* Audio Level Indicator (compact) */}
      {isRecording && (
        <div className="flex items-end gap-0.5 h-5">
          {audioLevel.slice(0, 6).map((level, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, level * 0.2)}px` }}
            />
          ))}
        </div>
      )}

      {/* Voice Output Toggle */}
      <button
        onClick={() => setVoiceEnabled(!voiceEnabled)}
        className={cn(
          "p-2 rounded-lg transition-all",
          voiceEnabled
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-gray-100 dark:bg-gray-700 text-gray-400"
        )}
        title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
      >
        {voiceEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Playback Controls (when speaking) */}
      {isSpeaking && (
        <div className="flex items-center gap-1">
          <button
            onClick={togglePause}
            className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={stopSpeaking}
            className="p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            title="Stop"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
