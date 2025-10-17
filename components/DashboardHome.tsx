"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { BookOpen, MessageSquare, Mic, Network, Upload, FileText, Eye, Headphones, Hand, BookText, TrendingUp, Calendar } from "lucide-react"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import type { Document } from "@/lib/supabase/types"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
}

export default function DashboardHome({ onModeSelect }: DashboardHomeProps) {
  const { user } = useUser()
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const { learningStyle, assessmentScores } = useUserStore()

  // Fetch recent documents
  useEffect(() => {
    const fetchRecentDocs = async () => {
      try {
        // Temporarily disabled to debug
        // const response = await fetch('/api/documents?limit=4')
        // if (response.ok) {
        //   const data = await response.json()
        //   setRecentDocuments(data.documents || [])
        // }
        setRecentDocuments([]) // Empty for now
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setIsLoadingDocs(false)
      }
    }

    fetchRecentDocs()
  }, [])

  const learningModes = [
    {
      id: "flashcards",
      name: "Flashcards",
      icon: BookOpen,
      description: "Transform documents into interactive flashcards",
      gradient: "from-purple-500 to-pink-500",
      available: true
    },
    {
      id: "chat",
      name: "Chat",
      icon: MessageSquare,
      description: "Ask questions about your documents with AI",
      gradient: "from-blue-500 to-cyan-500",
      available: true
    },
    {
      id: "podcast",
      name: "Podcast",
      icon: Mic,
      description: "Coming Soon - Audio learning on the go",
      gradient: "from-green-500 to-emerald-500",
      available: false
    },
    {
      id: "mindmap",
      name: "Mind Map",
      icon: Network,
      description: "Coming Soon - Visual concept mapping",
      gradient: "from-orange-500 to-red-500",
      available: false
    }
  ]

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'visual': return Eye
      case 'auditory': return Headphones
      case 'kinesthetic': return Hand
      case 'reading_writing': return BookText
      default: return BookOpen
    }
  }

  const getStyleDescription = (style: string) => {
    switch (style) {
      case 'visual': return "You learn best with images, diagrams, and visual aids"
      case 'auditory': return "You learn best through listening and discussion"
      case 'kinesthetic': return "You learn best through hands-on activities"
      case 'reading_writing': return "You learn best through reading and writing"
      case 'mixed': return "You have a balanced mix of learning preferences"
      default: return "Complete the assessment to discover your style"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileTypeColor = (type: string) => {
    if (type.includes('pdf')) return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    if (type.includes('word') || type.includes('doc')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    if (type.includes('text')) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.firstName || user?.username || 'Student'}! 👋
              </h1>
              <p className="text-white/90 text-lg">
                Ready to continue your learning journey?
              </p>
              <div className="flex items-center gap-2 mt-4 text-white/80">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Profile Card */}
        {learningStyle && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Learning Profile</h2>
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                View Full Profile
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dominant Style */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                    {(() => {
                      const Icon = getStyleIcon(learningStyle)
                      return <Icon className="w-6 h-6" />
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your Learning Style</p>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                      {learningStyle.replace('_', ' ')}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {getStyleDescription(learningStyle)}
                </p>
              </div>

              {/* Score Breakdown */}
              {assessmentScores && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Your Scores</p>
                  {Object.entries(assessmentScores).map(([style, score]) => {
                    const percentage = (score / 30) * 100 // Assuming max score of 30
                    return (
                      <div key={style}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                            {style.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Learning Modes Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Learning Mode</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {learningModes.map((mode) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => mode.available && onModeSelect(mode.id)}
                  disabled={!mode.available}
                  className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 ${
                    mode.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${mode.gradient} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {mode.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {mode.description}
                  </p>
                  {!mode.available && (
                    <span className="absolute top-4 right-4 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                      Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Documents</h2>
            <button
              onClick={() => window.location.href = '/dashboard/documents'}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              View All Documents
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading documents...</p>
            </div>
          ) : recentDocuments.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No documents yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload your first document to get started with AI-powered learning
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/documents'}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileTypeColor(doc.file_type)}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={doc.file_name}>
                        {doc.file_name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Set document and switch to flashcards mode
                        onModeSelect('flashcards')
                      }}
                      className="flex-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      Flashcards
                    </button>
                    <button
                      onClick={() => {
                        // Set document and switch to chat mode
                        onModeSelect('chat')
                      }}
                      className="flex-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
