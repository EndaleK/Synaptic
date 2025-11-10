"use client"

import { useState, useEffect } from 'react'
import { Clock, Sparkles, Mic, Map as MapIcon, Loader2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface RecentItem {
  id: string
  type: 'flashcard' | 'podcast' | 'mindmap'
  title: string
  documentName: string
  documentId: string
  createdAt: string
  count?: number // For flashcards
  duration?: number // For podcasts
  nodeCount?: number // For mind maps
}

export default function RecentContentWidget() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchRecentContent()
  }, [])

  const fetchRecentContent = async () => {
    setIsLoading(true)

    try {
      // Fetch recent items from all three types
      const [flashcardsRes, podcastsRes, mindmapsRes] = await Promise.all([
        fetch('/api/flashcards?limit=5'),
        fetch('/api/podcasts?limit=5'),
        fetch('/api/mindmaps?limit=5')
      ])

      const [flashcardsData, podcastsData, mindmapsData] = await Promise.all([
        flashcardsRes.ok ? flashcardsRes.json() : { flashcards: [] },
        podcastsRes.ok ? podcastsRes.json() : { podcasts: [] },
        mindmapsRes.ok ? mindmapsRes.json() : { mindmaps: [] }
      ])

      // Group flashcards by document and get most recent per document
      const flashcardsByDoc = new Map<string, any[]>()
      flashcardsData.flashcards?.forEach((card: any) => {
        if (!flashcardsByDoc.has(card.document_id)) {
          flashcardsByDoc.set(card.document_id, [])
        }
        flashcardsByDoc.get(card.document_id)!.push(card)
      })

      const flashcardItems: RecentItem[] = Array.from(flashcardsByDoc.entries()).map(([docId, cards]) => ({
        id: `flashcard-${docId}`,
        type: 'flashcard' as const,
        title: 'Flashcard Set',
        documentName: cards[0].documents?.file_name || 'Unknown Document',
        documentId: docId,
        createdAt: cards[0].created_at,
        count: cards.length
      }))

      const podcastItems: RecentItem[] = podcastsData.podcasts?.map((podcast: any) => ({
        id: `podcast-${podcast.id}`,
        type: 'podcast' as const,
        title: podcast.title,
        documentName: podcast.documents?.file_name || 'Unknown Document',
        documentId: podcast.document_id,
        createdAt: podcast.created_at,
        duration: podcast.duration_seconds
      })) || []

      const mindmapItems: RecentItem[] = mindmapsData.mindmaps?.map((mindmap: any) => ({
        id: `mindmap-${mindmap.id}`,
        type: 'mindmap' as const,
        title: mindmap.title,
        documentName: mindmap.documents?.file_name || 'Unknown Document',
        documentId: mindmap.document_id,
        createdAt: mindmap.created_at,
        nodeCount: mindmap.nodeCount
      })) || []

      // Combine and sort by creation date
      const allItems = [...flashcardItems, ...podcastItems, ...mindmapItems]
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Take top 5
      setRecentItems(allItems.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch recent content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getItemConfig = (type: RecentItem['type']) => {
    switch (type) {
      case 'flashcard':
        return {
          icon: Sparkles,
          color: 'from-accent-primary to-accent-secondary',
          bgColor: 'bg-accent-primary/10 dark:bg-accent-primary/20',
          textColor: 'text-accent-primary',
          mode: 'flashcards'
        }
      case 'podcast':
        return {
          icon: Mic,
          color: 'from-purple-500 to-pink-500',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-600 dark:text-purple-400',
          mode: 'podcast'
        }
      case 'mindmap':
        return {
          icon: MapIcon,
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-600 dark:text-blue-400',
          mode: 'mindmap'
        }
    }
  }

  const handleItemClick = (item: RecentItem) => {
    const config = getItemConfig(item.type)
    router.push(`/dashboard?mode=${config.mode}&documentId=${item.documentId}`)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Content</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        </div>
      </div>
    )
  }

  if (recentItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Content</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
          No content generated yet. Start by creating flashcards, podcasts, or mind maps!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Content</h3>
        </div>
        <button
          onClick={() => router.push('/dashboard/library')}
          className="text-sm text-accent-primary hover:text-accent-secondary transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {(isExpanded ? recentItems : recentItems.slice(0, 3)).map((item) => {
          const config = getItemConfig(item.type)
          const Icon = config.icon

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
                <Icon className={cn("w-5 h-5", config.textColor)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-accent-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {item.documentName}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(item.createdAt)}</span>
                {item.count && <span>{item.count} cards</span>}
                {item.duration && <span>{formatDuration(item.duration)}</span>}
                {item.nodeCount && <span>{item.nodeCount} nodes</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Show More / Show Less button */}
      {recentItems.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-sm text-accent-primary hover:text-accent-secondary transition-colors flex items-center justify-center gap-1 font-medium"
        >
          {isExpanded ? (
            <>
              Show Less
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show {recentItems.length - 3} More
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
