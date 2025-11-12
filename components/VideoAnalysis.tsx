"use client"

import { useState } from 'react'
import { FileText, Lightbulb, AlertCircle, Sparkles, Clock, ChevronDown, ChevronUp, Brain, FileQuestion, MessageCircle } from 'lucide-react'
import type { VideoKeyPoint } from '@/lib/supabase/types'

interface VideoAnalysisProps {
  summary?: string
  keyPoints: VideoKeyPoint[]
  flashcardCount?: number
  hasTranscript?: boolean
  onGenerateFlashcards?: () => void
  onGenerateMindMap?: () => void
  onGenerateExam?: () => void
  onChatWithVideo?: () => void
  onJumpToTimestamp?: (timestamp: number) => void
}

export default function VideoAnalysis({
  summary,
  keyPoints,
  flashcardCount = 0,
  hasTranscript = true,
  onGenerateFlashcards,
  onGenerateMindMap,
  onGenerateExam,
  onChatWithVideo,
  onJumpToTimestamp
}: VideoAnalysisProps) {
  const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set([0])) // First point expanded by default

  const togglePoint = (index: number) => {
    const newExpanded = new Set(expandedPoints)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedPoints(newExpanded)
  }

  const getImportanceColor = (importance: 'high' | 'medium' | 'low') => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    }
  }

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Group key points by importance
  const highImportancePoints = keyPoints.filter(p => p.importance === 'high')
  const mediumImportancePoints = keyPoints.filter(p => p.importance === 'medium')
  const lowImportancePoints = keyPoints.filter(p => p.importance === 'low')

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-primary" />
          AI Analysis
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AI-generated summary and key learning points from this video
        </p>
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-primary" />
            Summary
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Points</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{keyPoints.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">High Priority</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{highImportancePoints.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flashcards</div>
          <div className="text-2xl font-bold text-accent-primary">{flashcardCount}</div>
        </div>
      </div>

      {/* Content Generation Section */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
          Generate Learning Materials
        </h3>

        {!hasTranscript ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-1">
                  No Transcript Available
                </h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  This video does not have captions or transcript available. Content generation requires a transcript. Please try a video with captions enabled.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Flashcards */}
            {flashcardCount === 0 && onGenerateFlashcards && (
              <button
                onClick={onGenerateFlashcards}
                className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-accent-primary dark:hover:border-accent-primary transition-all"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Sparkles className="w-6 h-6 text-accent-primary" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Flashcards</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Study cards</span>
                </div>
              </button>
            )}

            {/* Mind Map */}
            {onGenerateMindMap && (
              <button
                onClick={onGenerateMindMap}
                className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Mind Map</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Visual concepts</span>
                </div>
              </button>
            )}

            {/* Mock Exam */}
            {onGenerateExam && (
              <button
                onClick={onGenerateExam}
                className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileQuestion className="w-6 h-6 text-blue-500" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Mock Exam</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Test yourself</span>
                </div>
              </button>
            )}

            {/* Chat with Video */}
            {onChatWithVideo && (
              <button
                onClick={onChatWithVideo}
                className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 transition-all"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Chat</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ask questions</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Key Points */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent-primary" />
          Key Learning Points
        </h3>

        {keyPoints.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No key points extracted yet. AI analysis in progress...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {keyPoints.map((point, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 overflow-hidden transition-all ${
                  expandedPoints.has(index)
                    ? getImportanceColor(point.importance)
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header - Always Visible */}
                <button
                  onClick={() => togglePoint(index)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getImportanceColor(
                          point.importance
                        )}`}
                      >
                        {point.importance}
                      </span>
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          onJumpToTimestamp?.(point.timestamp)
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(point.timestamp)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {point.title}
                    </h4>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {expandedPoints.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedPoints.has(index) && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      {keyPoints.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">
                {highImportancePoints.length} High Priority
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">
                {mediumImportancePoints.length} Medium
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">
                {lowImportancePoints.length} Low
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
