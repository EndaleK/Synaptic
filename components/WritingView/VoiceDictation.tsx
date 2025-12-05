"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Volume2, Loader2, Send, Trash2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface VoiceDictationProps {
  onTextReceived: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
  className?: string
}

// Audio visualization bars count
const VISUALIZER_BARS = 20

export default function VoiceDictation({ onTextReceived, onListeningChange, className }: VoiceDictationProps) {
  const toast = useToast()
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(VISUALIZER_BARS).fill(0))
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [accumulatedText, setAccumulatedText] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Notify parent when recording state changes
  useEffect(() => {
    onListeningChange?.(isRecording)
  }, [isRecording, onListeningChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
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

    // Sample the frequency data to create visualization bars
    const bars: number[] = []
    const sliceWidth = Math.floor(dataArray.length / VISUALIZER_BARS)

    for (let i = 0; i < VISUALIZER_BARS; i++) {
      let sum = 0
      for (let j = 0; j < sliceWidth; j++) {
        sum += dataArray[i * sliceWidth + j]
      }
      // Normalize to 0-100 range
      bars.push(Math.min(100, (sum / sliceWidth) * 0.5))
    }

    setAudioLevel(bars)
    animationFrameRef.current = requestAnimationFrame(updateVisualization)
  }, [isRecording])

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting microphone access...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      streamRef.current = stream
      console.log('✅ Microphone access granted')

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
            mimeType = '' // Let browser choose
          }
        }
      }
      console.log('📼 Using MIME type:', mimeType || 'default')

      // Create MediaRecorder
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log(`📦 Audio chunk: ${(event.data.size / 1024).toFixed(1)}KB`)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, processing...')
        await processAudio()
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      // Start visualization
      updateVisualization()

      console.log('🎙️ Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone permission denied. Please allow microphone access.')
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found. Please connect a microphone.')
        } else {
          toast.error(`Failed to start recording: ${error.message}`)
        }
      }
    }
  }

  const stopRecording = () => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsRecording(false)
    setAudioLevel(new Array(VISUALIZER_BARS).fill(0))
  }

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('⚠️ No audio data recorded')
      toast.warning('No audio was recorded. Please try again.')
      return
    }

    setIsProcessing(true)

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      console.log(`📤 Sending audio for transcription: ${(audioBlob.size / 1024).toFixed(1)}KB`)

      // Check minimum size (very short recordings may not contain useful audio)
      if (audioBlob.size < 1000) {
        toast.warning('Recording too short. Please speak for at least 1 second.')
        setIsProcessing(false)
        return
      }

      // Send to Whisper API
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

      if (data.text && data.text.trim()) {
        console.log(`✅ Transcription received: "${data.text.substring(0, 100)}..."`)

        // Accumulate text
        setAccumulatedText(prev => {
          const newText = prev ? `${prev} ${data.text.trim()}` : data.text.trim()
          return newText
        })

        // Also send to parent immediately
        onTextReceived(data.text.trim())
      } else {
        console.log('⚠️ No speech detected in audio')
        toast.warning('No speech detected. Please speak clearly and try again.')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio')
    } finally {
      setIsProcessing(false)
      audioChunksRef.current = []
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleClearText = () => {
    setAccumulatedText('')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleRecording}
          disabled={isProcessing}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg min-w-[180px] justify-center",
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : isProcessing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-purple-500 hover:opacity-90 text-white"
          )}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Transcribing...
            </>
          ) : isRecording ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Recording
            </>
          )}
        </button>

        {/* Recording Duration */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-600 font-mono font-semibold animate-pulse">
            <div className="w-2 h-2 bg-red-600 rounded-full" />
            {formatDuration(recordingDuration)}
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      {isRecording && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recording...
            </span>
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-end justify-center gap-0.5 h-16">
            {audioLevel.map((level, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-purple-600 to-violet-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, level * 0.6)}px` }}
              />
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Speak clearly into your microphone
          </p>
        </div>
      )}

      {/* Accumulated Text Preview */}
      {accumulatedText && !isRecording && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Transcribed Text
            </span>
            <button
              onClick={handleClearText}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear text"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {accumulatedText}
          </p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
              <p>
                <strong>Voice Dictation (Whisper AI):</strong> Click "Start Recording" and speak.
                Your voice will be transcribed using OpenAI's Whisper model for accurate results.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 Tip: Speak in complete sentences for best results. Recording stops when you click the button.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
