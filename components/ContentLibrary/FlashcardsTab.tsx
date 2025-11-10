"use client"

import { useState, useEffect } from 'react'
import { Search, Loader2, BookOpen, Calendar, Filter, Play, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: string
  times_reviewed: number
  next_review_at: string
  document_id: string
  created_at: string
  documents?: {
    file_name: string
  }
}

interface GroupedFlashcards {
  documentId: string
  documentName: string
  flashcards: Flashcard[]
  count: number
}

export default function FlashcardsTab() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAllFlashcards()
  }, [])

  const fetchAllFlashcards = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/flashcards')
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards')
      }

      const data = await response.json()
      setFlashcards(data.flashcards || [])
    } catch (err) {
      console.error('Error fetching flashcards:', err)
      setError(err instanceof Error ? err.message : 'Failed to load flashcards')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter flashcards
  const filteredFlashcards = flashcards.filter(card => {
    const matchesSearch = searchQuery.trim() === '' ||
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDifficulty = difficultyFilter === 'all' || card.difficulty === difficultyFilter

    return matchesSearch && matchesDifficulty
  })

  // Group by document
  const groupedFlashcards: GroupedFlashcards[] = []
  const documentMap = new Map<string, GroupedFlashcards>()

  filteredFlashcards.forEach(card => {
    if (!documentMap.has(card.document_id)) {
      documentMap.set(card.document_id, {
        documentId: card.document_id,
        documentName: card.documents?.file_name || 'Unknown Document',
        flashcards: [],
        count: 0
      })
    }

    const group = documentMap.get(card.document_id)!
    group.flashcards.push(card)
    group.count++
  })

  groupedFlashcards.push(...documentMap.values())

  // Sort by most flashcards
  groupedFlashcards.sort((a, b) => b.count - a.count)

  const handleStartReview = (documentId: string) => {
    router.push(`/dashboard?mode=flashcards&documentId=${documentId}`)
  }

  const handleDelete = async (documentId: string, documentName: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete all flashcards for "${documentName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(documentId)

    try {
      const response = await fetch(`/api/flashcards?documentId=${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete flashcards')
      }

      // Remove all flashcards for this document from state
      setFlashcards(prev => prev.filter(card => card.document_id !== documentId))
    } catch (err) {
      console.error('Error deleting flashcards:', err)
      alert('Failed to delete flashcards. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading flashcards...</span>
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

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No flashcards yet
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
              placeholder="Search flashcards..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <strong className="text-gray-900 dark:text-white">{filteredFlashcards.length}</strong> flashcards
          </span>
          <span>
            <strong className="text-gray-900 dark:text-white">{groupedFlashcards.length}</strong> documents
          </span>
        </div>
      </div>

      {/* Grouped Flashcards */}
      <div className="space-y-6">
        {groupedFlashcards.map((group) => (
          <div
            key={group.documentId}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Document Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {group.documentName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {group.count} flashcard{group.count > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(group.documentId, group.documentName, e)}
                  disabled={deletingId === group.documentId}
                  className="w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete all flashcards"
                >
                  {deletingId === group.documentId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleStartReview(group.documentId)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Review
                </button>
              </div>
            </div>

            {/* Flashcard Preview (show first 3) */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {group.flashcards.slice(0, 3).map((card) => (
                <div
                  key={card.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {card.front}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {card.back}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className={cn(
                        "px-2 py-1 rounded-full font-medium",
                        card.difficulty === 'easy' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                        card.difficulty === 'medium' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                        card.difficulty === 'hard' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      )}>
                        {card.difficulty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {card.times_reviewed} reviews
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {group.count > 3 && (
                <div className="px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30">
                  +{group.count - 3} more flashcards
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredFlashcards.length === 0 && flashcards.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No flashcards match your search criteria
          </p>
        </div>
      )}
    </div>
  )
}
