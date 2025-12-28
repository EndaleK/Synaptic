"use client"

import { useState, useEffect } from 'react'
import { Sparkles, Mic, Map as MapIcon, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

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
  const { userId, isLoaded } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Wait for auth to be loaded AND userId to be available
    if (!isLoaded || !userId) {
      setIsLoading(true)
      return
    }

    fetchRecentContent()
  }, [userId, isLoaded])

  const fetchRecentContent = async () => {
    setIsLoading(true)

    try {
      // Fetch recent items from all three types
      const [flashcardsRes, podcastsRes, mindmapsRes] = await Promise.all([
        fetch('/api/flashcards?limit=5', { credentials: 'include' }),
        fetch('/api/podcasts?limit=5', { credentials: 'include' }),
        fetch('/api/mindmaps?limit=5', { credentials: 'include' })
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
          bgColor: 'bg-cyan-100 dark:bg-cyan-500/20',
          textColor: 'text-cyan-600 dark:text-cyan-400',
          mode: 'flashcards'
        }
      case 'podcast':
        return {
          icon: Mic,
          bgColor: 'bg-pink-100 dark:bg-pink-500/20',
          textColor: 'text-pink-600 dark:text-pink-400',
          mode: 'podcast'
        }
      case 'mindmap':
        return {
          icon: MapIcon,
          bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
          textColor: 'text-emerald-600 dark:text-emerald-400',
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
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (recentItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
        <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">Recent</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">
          No content yet
        </p>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Recent</h3>
        <button
          onClick={() => router.push('/dashboard/library')}
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1">
        {(isExpanded ? recentItems : recentItems.slice(0, 3)).map((item) => {
          const config = getItemConfig(item.type)
          const Icon = config.icon

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-neutral-800 transition-colors duration-200 text-left group"
            >
              <div className={`w-9 h-9 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.textColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {item.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {item.documentName}
                </p>
              </div>

              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatDate(item.createdAt)}
              </span>
            </button>
          )
        })}
      </div>

      {recentItems.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
