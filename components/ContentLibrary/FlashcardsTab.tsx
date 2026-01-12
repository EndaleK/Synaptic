"use client"

import { useState, useEffect } from 'react'
import { Search, Loader2, BookOpen, Calendar, Filter, Play, Trash2, Clock, CheckCircle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface FlashcardSession {
  id: string
  title: string
  description: string | null
  generation_type: string
  selection_info: Record<string, unknown> | null
  cards_count: number
  cards_reviewed: number
  cards_mastered: number
  created_at: string
  last_studied_at: string | null
  document_id: string | null
  documents?: {
    name: string
    file_name: string
  } | null
}

export default function FlashcardsTab() {
  const toast = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<FlashcardSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'cards' | 'progress'>('recent')
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/flashcard-sessions', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch flashcard sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load flashcard sessions')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (searchQuery.trim() === '') return true
    const query = searchQuery.toLowerCase()
    return (
      session.title.toLowerCase().includes(query) ||
      session.documents?.name?.toLowerCase().includes(query) ||
      session.documents?.file_name?.toLowerCase().includes(query)
    )
  })

  // Sort sessions
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'cards':
        return b.cards_count - a.cards_count
      case 'progress':
        const progressA = a.cards_count > 0 ? a.cards_mastered / a.cards_count : 0
        const progressB = b.cards_count > 0 ? b.cards_mastered / b.cards_count : 0
        return progressB - progressA
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const handleStartReview = (session: FlashcardSession) => {
    // Navigate to flashcards mode with session ID
    router.push(`/dashboard?mode=flashcards&sessionId=${session.id}`)
  }

  const handleDelete = async (session: FlashcardSession, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete "${session.title}"? This will delete all ${session.cards_count} flashcards. This action cannot be undone.`)) {
      return
    }

    setDeletingId(session.id)

    try {
      const response = await fetch(`/api/flashcard-sessions?sessionId=${session.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete session')
      }

      // Remove session from state
      setSessions(prev => prev.filter(s => s.id !== session.id))
      toast.success('Flashcard set deleted successfully')
    } catch (err) {
      console.error('Error deleting session:', err)
      toast.error('Failed to delete flashcard set. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getProgressPercent = (session: FlashcardSession) => {
    if (session.cards_count === 0) return 0
    return Math.round((session.cards_mastered / session.cards_count) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading flashcard sets...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No flashcard sets yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Generate flashcards from your documents to start studying
        </p>
        <button
          onClick={() => router.push('/dashboard?mode=flashcards')}
          className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Generate Flashcards
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flashcard sets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'cards' | 'progress')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            >
              <option value="recent">Most Recent</option>
              <option value="cards">Most Cards</option>
              <option value="progress">Most Progress</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <strong className="text-gray-900 dark:text-white">{sessions.length}</strong> flashcard sets
          </span>
          <span>
            <strong className="text-gray-900 dark:text-white">
              {sessions.reduce((sum, s) => sum + s.cards_count, 0)}
            </strong> total cards
          </span>
          <span>
            <strong className="text-gray-900 dark:text-white">
              {sessions.reduce((sum, s) => sum + s.cards_mastered, 0)}
            </strong> mastered
          </span>
        </div>
      </div>

      {/* Session Cards */}
      <div className="grid gap-4">
        {sortedSessions.map((session) => {
          const progress = getProgressPercent(session)

          return (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-accent-primary/50 transition-colors cursor-pointer"
              onClick={() => handleStartReview(session)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-accent-primary flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {session.title}
                      </h3>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {session.cards_count} cards
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(session.created_at)}
                      </span>
                      {session.last_studied_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Last studied {formatDate(session.last_studied_at)}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">
                          {session.cards_mastered} of {session.cards_count} mastered
                        </span>
                        <span className={cn(
                          "font-medium",
                          progress >= 80 ? "text-green-600 dark:text-green-400" :
                          progress >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-gray-600 dark:text-gray-400"
                        )}>
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            progress >= 80 ? "bg-green-500" :
                            progress >= 50 ? "bg-yellow-500" :
                            "bg-accent-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(session, e)}
                      disabled={deletingId === session.id}
                      className="w-9 h-9 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete flashcard set"
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartReview(session)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Study
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredSessions.length === 0 && sessions.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No flashcard sets match your search
          </p>
        </div>
      )}
    </div>
  )
}
