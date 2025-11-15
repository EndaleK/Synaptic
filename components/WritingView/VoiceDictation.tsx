"use client"

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceDictationProps {
  onTextReceived: (text: string) => void
  className?: string
}

export default function VoiceDictation({ onTextReceived, className }: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    // Initialize Speech Recognition once
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript + ' '
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)

      if (final) {
        setFinalTranscript(prev => prev + final)
        onTextReceived(final)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access to use voice dictation.')
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, continuing to listen...')
      } else {
        alert(`Voice dictation error: ${event.error}. Please try again.`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('Recognition ended')
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore stop errors on unmount
        }
      }
    }
  }, [onTextReceived])

  const toggleListening = () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop()
        setIsListening(false)
        setInterimTranscript('')
      } catch (error) {
        console.error('Error stopping recognition:', error)
        setIsListening(false)
      }
    } else {
      try {
        setFinalTranscript('')
        setInterimTranscript('')
        recognitionRef.current?.start()
        setIsListening(true)
      } catch (error) {
        console.error('Error starting recognition:', error)
        alert('Failed to start voice dictation. Please check microphone permissions and try again.')
      }
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Voice Dictation Button */}
      <button
        onClick={toggleListening}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg",
          isListening
            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
            : "bg-gradient-to-r from-purple-600 to-purple-500 hover:opacity-90 text-white"
        )}
        title={isListening ? "Stop dictation" : "Start voice dictation"}
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5" />
            Stop Dictation
            <div className="flex gap-1 ml-2">
              <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Start Voice Dictation
          </>
        )}
      </button>

      {/* Interim Transcript Display */}
      {isListening && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Listening...
            </span>
          </div>

          {interimTranscript ? (
            <p className="text-gray-700 dark:text-gray-300 italic">
              {interimTranscript}
              <span className="inline-block w-0.5 h-4 bg-purple-600 ml-1 animate-pulse" />
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Speak now...
            </p>
          )}

          {finalTranscript && (
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Transcribed:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {finalTranscript}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isListening && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Tip:</strong> Click "Start Voice Dictation" and speak clearly. Your words will be inserted at the cursor position. Pause between sentences for better accuracy.
          </p>
        </div>
      )}
    </div>
  )
}
