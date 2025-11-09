"use client"

import { useState, useEffect } from 'react'
import { Search, Loader2, Map, Calendar, Network, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MindMap {
  id: string
  title: string
  nodeCount: number
  edgeCount: number
  created_at: string
  document_id: string
  documents?: {
    file_name: string
  }
}

export default function MindMapsTab() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [mindmaps, setMindmaps] = useState<MindMap[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllMindMaps()
  }, [])

  const fetchAllMindMaps = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mindmaps')
      if (!response.ok) {
        throw new Error('Failed to fetch mind maps')
      }

      const data = await response.json()
      setMindmaps(data.mindmaps || [])
    } catch (err) {
      console.error('Error fetching mind maps:', err)
      setError(err instanceof Error ? err.message : 'Failed to load mind maps')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter mind maps
  const filteredMindMaps = mindmaps.filter(mindmap => {
    const matchesSearch = searchQuery.trim() === '' ||
      mindmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mindmap.documents?.file_name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const handleViewMindMap = (documentId: string) => {
    router.push(`/dashboard?mode=mindmap&documentId=${documentId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading mind maps...</span>
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

  if (mindmaps.length === 0) {
    return (
      <div className="text-center py-12">
        <Map className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No mind maps yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Generate mind maps from your documents to visualize concepts
        </p>
        <button
          onClick={() => router.push('/dashboard?mode=mindmap')}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Generate Mind Map
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mind maps by title or document..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">{filteredMindMaps.length}</strong> mind map{filteredMindMaps.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Mind Map Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMindMaps.map((mindmap) => (
          <div
            key={mindmap.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow group"
          >
            {/* Thumbnail (placeholder with network icon) */}
            <div className="relative h-48 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Network className="w-24 h-24 text-white opacity-30" />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleViewMindMap(mindmap.document_id)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Mind Map
                </button>
              </div>

              {/* Stats Badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                {mindmap.nodeCount} nodes
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {mindmap.title}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                {mindmap.documents?.file_name || 'Unknown Document'}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(mindmap.created_at).toLocaleDateString()}
                </span>
                <span>{mindmap.edgeCount} connections</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMindMaps.length === 0 && mindmaps.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No mind maps match your search
          </p>
        </div>
      )}
    </div>
  )
}
