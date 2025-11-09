"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { BookOpen, MessageSquare, Mic, Network, Upload, FileText, Eye, Headphones, Hand, BookText, TrendingUp, Calendar, Link2, Globe, CheckCircle2, ArrowRight, Brain, Clock, Bell, BarChart3, Target, PenTool, Youtube } from "lucide-react"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import LearningProfileBanner from "@/components/LearningProfileBanner"
import SubscriptionStatus from "@/components/SubscriptionStatus"
import RecentContentWidget from "@/components/RecentContentWidget"
import type { Document } from "@/lib/supabase/types"

interface DashboardHomeProps {
  onModeSelect: (mode: string) => void
  onOpenAssessment?: () => void
}

export default function DashboardHome({ onModeSelect, onOpenAssessment }: DashboardHomeProps) {
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
      color: "indigo", // Maps to --mode-flashcards
      bgClass: "bg-indigo-500",
      shadowClass: "shadow-indigo-500/30",
      available: true,
      premium: false
    },
    {
      id: "chat",
      name: "Chat",
      icon: MessageSquare,
      description: "Ask questions about your documents with AI",
      color: "blue", // Maps to --mode-chat
      bgClass: "bg-blue-500",
      shadowClass: "shadow-blue-500/30",
      available: true,
      premium: false
    },
    {
      id: "podcast",
      name: "Podcast",
      icon: Mic,
      description: "Generate AI-hosted podcast discussions",
      color: "violet", // Maps to --mode-podcast
      bgClass: "bg-violet-500",
      shadowClass: "shadow-violet-500/30",
      available: true,
      premium: false
    },
    {
      id: "mindmap",
      name: "Mind Map",
      icon: Network,
      description: "Visualize concepts and relationships interactively",
      color: "emerald", // Maps to --mode-mindmap
      bgClass: "bg-emerald-500",
      shadowClass: "shadow-emerald-500/30",
      available: true,
      premium: false
    },
    {
      id: "writer",
      name: "Writer",
      icon: PenTool,
      description: "AI-powered writing assistant with citations and grammar",
      color: "rose", // Maps to --mode-writer
      bgClass: "bg-rose-500",
      shadowClass: "shadow-rose-500/30",
      available: true,
      premium: false
    },
    {
      id: "video",
      name: "Video",
      icon: Youtube,
      description: "Learn from YouTube videos with AI analysis",
      color: "amber", // Maps to --mode-video
      bgClass: "bg-amber-500",
      shadowClass: "shadow-amber-500/30",
      available: true,
      premium: false
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
    return 'bg-accent-primary/20 dark:bg-accent-primary/30 text-accent-primary'
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-6 lg:px-10 lg:py-8 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-accent-primary to-accent-secondary rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-display mb-3">
                Welcome back, {user?.firstName || user?.username || 'Student'}! 👋
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Ready to continue your learning journey?
              </p>
              <div className="flex items-center gap-2 mt-4 text-white text-caption">
                <Calendar className="w-4 h-4" />
                <span className="hidden md:inline">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="md:hidden">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Content Widget */}
        <RecentContentWidget />

        {/* Learning Modes Grid */}
        <div>
          <h2 className="text-headline text-gray-900 dark:text-white mb-6">Choose Your Learning Mode</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className={`w-14 h-14 ${mode.bgClass} rounded-xl flex items-center justify-center mb-4 shadow-lg ${mode.shadowClass}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-title text-gray-900 dark:text-white mb-2">
                    {mode.name}
                  </h3>
                  <p className="text-body text-gray-600 dark:text-gray-400 leading-relaxed">
                    {mode.description}
                  </p>
                  {!mode.available && (
                    <span className="absolute top-4 right-4 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                      Soon
                    </span>
                  )}
                  {mode.premium && (
                    <span className="absolute top-4 right-4 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-semibold rounded-full shadow-md">
                      Premium
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Study Scheduler Tools */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-headline text-gray-900 dark:text-white">Study Tools & Scheduler</h2>
            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
              AI Enhanced
            </span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/study/review'}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-semibold rounded-full">
                AI
              </span>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Review Queue
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-prioritized flashcard reviews
              </p>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/study/pomodoro'}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-semibold rounded-full">
                AI
              </span>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Pomodoro Timer
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Context-aware smart timer
              </p>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/study/calendar'}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Study Calendar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Schedule and plan study sessions
              </p>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/study/statistics'}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-semibold rounded-full">
                AI
              </span>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Statistics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI insights & progress tracking
              </p>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/study/settings'}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure reminders and alerts
              </p>
            </button>
          </div>
        </div>

        {/* Learning Profile Banner - Shows Below Welcome */}
        <LearningProfileBanner
          onTakeAssessment={() => onOpenAssessment?.()}
        />

        {/* Learning Profile Card */}
        {learningStyle && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Learning Profile</h2>
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="text-sm text-accent-primary hover:underline"
              >
                View Full Profile
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dominant Style */}
              <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-xl p-6 border border-accent-primary/30 dark:border-accent-primary/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center text-white">
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
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-500"
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

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Recent Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Documents</h2>
            <button
              onClick={() => window.location.href = '/dashboard/documents'}
              className="text-sm text-accent-primary hover:underline"
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Get Started with Your Documents</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Upload documents or import from URLs to start generating flashcards, mind maps, podcasts, and chat with AI
                </p>
              </div>

              {/* Upload Methods Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Upload Files Card */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Upload Files</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Drag and drop or browse to upload your documents
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Formats:</strong> PDF, DOCX, DOC, TXT, JSON</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Size:</strong> Up to 500MB per file</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Content:</strong> Textbooks, notes, research papers</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => window.location.href = '/dashboard/documents'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Go to Documents
                  </button>
                </div>

                {/* Import from URL Card */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Import from URL</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Import content directly from the internet
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span><strong>arXiv:</strong> Scientific papers & research</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Web:</strong> Medium, blogs, articles</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span><strong>YouTube:</strong> Transcripts (coming soon)</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => window.location.href = '/dashboard/documents'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Link2 className="w-4 h-4" />
                    Go to Documents
                  </button>
                </div>
              </div>

              {/* Quick Start Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Quick Start:</strong> Click "Go to Documents" above to access the upload page, then choose your preferred method to get started
                </p>
              </div>
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
                      className="flex-1 px-3 py-1.5 bg-accent-primary/20 dark:bg-accent-primary/30 text-accent-primary rounded-lg text-xs font-semibold hover:bg-accent-primary/30 dark:hover:bg-accent-primary/40 transition-colors"
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
