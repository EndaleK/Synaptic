"use client"

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, Loader2, Globe, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface VoiceDictationProps {
  onTextReceived: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
  className?: string
}

// Supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' }
]

// Punctuation commands mapping
const PUNCTUATION_COMMANDS: Record<string, string> = {
  'period': '.',
  'comma': ',',
  'question mark': '?',
  'exclamation point': '!',
  'exclamation mark': '!',
  'colon': ':',
  'semicolon': ';',
  'dash': '—',
  'hyphen': '-',
  'quote': '"',
  'open quote': '"',
  'close quote': '"',
  'apostrophe': "'",
  'open parenthesis': '(',
  'close parenthesis': ')',
  'open bracket': '[',
  'close bracket': ']',
}

// Formatting commands
const FORMATTING_COMMANDS: Record<string, string> = {
  'new line': '\n',
  'new paragraph': '\n\n',
  'tab': '\t',
  'space': ' ',
}

export default function VoiceDictation({ onTextReceived, onListeningChange, className }: VoiceDictationProps) {
  const toast = useToast()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [commandsEnabled, setCommandsEnabled] = useState(true)
  const recognitionRef = useRef<any>(null)
  const shouldBeListeningRef = useRef(false)
  const lastResultTimeRef = useRef<number>(0)
  const restartCountRef = useRef(0)
  const restartTimeoutRef = useRef<NodeJS.Timeout>()

  // Notify parent when listening state changes
  useEffect(() => {
    onListeningChange?.(isListening)
  }, [isListening, onListeningChange])

  // Process commands in transcribed text
  const processCommands = (text: string): string => {
    if (!commandsEnabled) return text

    let processed = text.toLowerCase()

    // Replace punctuation commands
    Object.entries(PUNCTUATION_COMMANDS).forEach(([command, punctuation]) => {
      const regex = new RegExp(`\\b${command}\\b`, 'gi')
      processed = processed.replace(regex, punctuation)
    })

    // Replace formatting commands
    Object.entries(FORMATTING_COMMANDS).forEach(([command, formatting]) => {
      const regex = new RegExp(`\\b${command}\\b`, 'gi')
      processed = processed.replace(regex, formatting)
    })

    // Capitalize first letter after sentence-ending punctuation
    processed = processed.replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => {
      return punct + letter.toUpperCase()
    })

    // Capitalize first letter of text
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1)
    }

    return processed
  }

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
    recognition.lang = selectedLanguage
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started, language:', selectedLanguage)
    }

    recognition.onaudiostart = () => {
      console.log('🔊 Audio capture started')
    }

    recognition.onsoundstart = () => {
      console.log('🔉 Sound detected')
    }

    recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected')
    }

    recognition.onresult = (event: any) => {
      console.log('📝 Speech recognition result:', event)
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`)
        if (event.results[i].isFinal) {
          final += transcript + ' '
        } else {
          interim += transcript
        }
      }

      console.log('Interim:', interim, 'Final:', final)
      setInterimTranscript(interim)

      if (final) {
        // Track that we received speech - reset restart counter
        lastResultTimeRef.current = Date.now()
        restartCountRef.current = 0

        // Process commands if enabled
        const processedText = processCommands(final)
        setFinalTranscript(prev => prev + processedText)
        onTextReceived(processedText)
      }
    }

    recognition.onerror = (event: any) => {
      // Don't log normal/expected errors (permission denied, aborted, no speech detected, audio capture)
      if (event.error !== 'not-allowed' && event.error !== 'aborted' && event.error !== 'no-speech' && event.error !== 'audio-capture') {
        console.error('Speech recognition error:', event.error)
      }

      if (event.error === 'not-allowed') {
        toast.error('Microphone permission denied. Please allow microphone access to use voice dictation.')
        shouldBeListeningRef.current = false
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        // This is normal - user paused or didn't speak within timeout
        // Automatically restart to keep listening (onend will handle this)
        console.log('No speech detected, will restart on end event...')
      } else if (event.error === 'aborted') {
        // User stopped manually, don't restart
        shouldBeListeningRef.current = false
        setIsListening(false)
      } else if (event.error === 'audio-capture') {
        // Audio capture issue - usually transient, stop gracefully
        console.log('⚠️ Audio capture issue detected, stopping voice dictation')
        shouldBeListeningRef.current = false
        setIsListening(false)
      } else {
        // Real error occurred
        toast.error(`Voice dictation error: ${event.error}. Please try again.`)
        shouldBeListeningRef.current = false
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      console.log('Recognition ended, shouldBeListening:', shouldBeListeningRef.current)

      // Clear any existing restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }

      // If we're still supposed to be listening, implement smart restart logic
      if (shouldBeListeningRef.current) {
        // Check if we've exceeded max restart attempts
        if (restartCountRef.current >= 3) {
          console.log('⚠️ Max restart attempts (3) reached. Stopping to prevent infinite loop.')
          console.log('User may be idle. They can manually restart if needed.')
          shouldBeListeningRef.current = false
          setIsListening(false)
          restartCountRef.current = 0
          return
        }

        // Increment restart counter
        restartCountRef.current++
        console.log(`🔄 Scheduling restart attempt ${restartCountRef.current}/3 in 1 second...`)

        // Wait 1 second before restarting to prevent rapid-fire loops
        restartTimeoutRef.current = setTimeout(() => {
          // Double-check we should still be listening
          if (shouldBeListeningRef.current) {
            console.log(`▶️ Executing restart attempt ${restartCountRef.current}/3`)
            try {
              recognitionRef.current?.start()
            } catch (e) {
              console.log('Could not restart recognition:', e)
              shouldBeListeningRef.current = false
              setIsListening(false)
              restartCountRef.current = 0
            }
          }
        }, 1000)
      } else {
        setIsListening(false)
        restartCountRef.current = 0
      }
    }

    recognitionRef.current = recognition

    return () => {
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }

      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore stop errors on unmount
        }
      }
    }
  }, [selectedLanguage, commandsEnabled, onTextReceived])

  const toggleListening = async () => {
    if (!isSupported) {
      toast.warning('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isListening) {
      try {
        shouldBeListeningRef.current = false
        recognitionRef.current?.stop()
        setIsListening(false)
        setInterimTranscript('')
        restartCountRef.current = 0 // Reset restart counter when manually stopped
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
        }
      } catch (error) {
        console.error('Error stopping recognition:', error)
        shouldBeListeningRef.current = false
        setIsListening(false)
        restartCountRef.current = 0
      }
    } else {
      try {
        // Check if microphone permission API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia API not available. Please use HTTPS or localhost.')
        }

        console.log('Requesting microphone permission...')

        // Request microphone permission explicitly first
        // This triggers Chrome's permission popup if not already granted
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('Microphone permission granted, stream:', stream)

        // Stop the stream immediately - we just needed to trigger the permission request
        stream.getTracks().forEach(track => track.stop())
        console.log('Stopped microphone stream, waiting 100ms before starting speech recognition...')

        // Wait a brief moment for the audio device to be released
        // This prevents "audio-capture" errors from race conditions
        await new Promise(resolve => setTimeout(resolve, 100))

        // Now start speech recognition with permission granted
        setFinalTranscript('')
        setInterimTranscript('')
        shouldBeListeningRef.current = true
        restartCountRef.current = 0 // Reset restart counter for new session
        lastResultTimeRef.current = 0 // Reset last result time
        recognitionRef.current?.start()
        setIsListening(true)
        console.log('Speech recognition started successfully')
      } catch (error) {
        console.error('Detailed error starting recognition:', {
          error,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        })

        if (error instanceof Error && error.name === 'NotAllowedError') {
          toast.error('Microphone permission denied. Please:\n1. Click the lock icon in the address bar\n2. Set Microphone to "Allow"\n3. Refresh the page and try again')
        } else if (error instanceof Error && error.name === 'NotFoundError') {
          toast.error('No microphone found. Please connect a microphone and try again.')
        } else if (error instanceof Error && error.name === 'NotSupportedError') {
          toast.error('Microphone access requires HTTPS. Please access via https:// or use localhost.')
        } else {
          toast.error('Failed to start voice dictation: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
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

      {/* Settings and Instructions */}
      {!isListening && (
        <div className="space-y-2">
          {/* Language and Command Settings */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{' '}
                    {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                  </span>
                </div>
              </button>

              {/* Language Dropdown */}
              {showLanguageSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code)
                        setShowLanguageSelector(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                        selectedLanguage === lang.code && "bg-purple-50 dark:bg-purple-900/30"
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-gray-700 dark:text-gray-300">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Commands Toggle */}
            <button
              onClick={() => setCommandsEnabled(!commandsEnabled)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                commandsEnabled
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
              title={commandsEnabled ? "Punctuation commands enabled" : "Punctuation commands disabled"}
            >
              {commandsEnabled ? "Commands: ON" : "Commands: OFF"}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
                <p><strong>Quick Start:</strong> Click "Start Voice Dictation" and speak clearly. Pause between sentences for better accuracy.</p>
                {commandsEnabled && (
                  <div className="text-xs mt-2">
                    <p className="font-semibold mb-1">Voice Commands:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>Say "period", "comma", "question mark", "exclamation point" for punctuation</li>
                      <li>Say "new line" or "new paragraph" for formatting</li>
                      <li>Say "quote", "colon", "semicolon", "dash" for other marks</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
