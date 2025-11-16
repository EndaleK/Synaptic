"use client"

import { useState, useEffect } from "react"
import { X, Mic, Square } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import VoiceDictation to avoid SSR issues
const VoiceDictation = dynamic(() => import("@/components/VoiceDictation"), {
  ssr: false
})

interface VoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInsertText: (text: string) => void
}

export default function VoiceModal({
  isOpen,
  onClose,
  onInsertText
}: VoiceModalProps) {
  const [transcribedText, setTranscribedText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleTranscriptChange = (text: string) => {
    setTranscribedText(text)
  }

  const handleInsert = () => {
    if (transcribedText.trim()) {
      onInsertText(transcribedText)
      handleClose()
    }
  }

  const handleClose = () => {
    setTranscribedText("")
    setIsRecording(false)
    setRecordingTime(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Your Voice</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Waveform Visualization */}
          {isRecording && (
            <div className="flex items-end justify-center gap-1 h-10 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-600 to-violet-600 rounded-full animate-waveform"
                  style={{
                    height: `${20 + Math.random() * 20}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Timer */}
          <div className="text-center mb-6">
            <div className="text-3xl font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
          </div>

          {/* Voice Dictation Component */}
          <div className="mb-4">
            <VoiceDictation
              onTranscriptChange={handleTranscriptChange}
              onRecordingStateChange={setIsRecording}
            />
          </div>

          {/* Transcription Preview */}
          {transcribedText && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {transcribedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          {transcribedText && (
            <button
              onClick={handleInsert}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold hover:shadow-lg transition-all duration-200"
            >
              Insert Text
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease;
        }
        .animate-waveform {
          animation: waveform 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
