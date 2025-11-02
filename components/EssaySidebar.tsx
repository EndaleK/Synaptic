"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileText, Trash2, Calendar, FileEdit, Menu, X } from 'lucide-react'
import type { Essay } from '@/lib/supabase/types'

interface EssaySidebarProps {
  isOpen: boolean
  onToggle: () => void
  currentEssayId?: string
  onEssaySelect: (essay: Essay) => void
  onEssayDelete?: (essayId: string) => void
  onRefresh?: () => void
}

export default function EssaySidebar({
  isOpen,
  onToggle,
  currentEssayId,
  onEssaySelect,
  onEssayDelete,
  onRefresh
}: EssaySidebarProps) {
  const [essays, setEssays] = useState<Essay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch essays from API
  useEffect(() => {
    fetchEssays()
  }, [])

  const fetchEssays = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/essays/list')

      if (!response.ok) {
        throw new Error('Failed to fetch essays')
      }

      const data = await response.json()
      setEssays(data.essays || [])
    } catch (error) {
      console.error('Error fetching essays:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (essayId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent essay selection

    if (!confirm('Are you sure you want to delete this essay? This action cannot be undone.')) {
      return
    }

    setDeletingId(essayId)

    try {
      const response = await fetch(`/api/essays/${essayId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete essay')
      }

      // Remove from local state
      setEssays(prev => prev.filter(e => e.id !== essayId))

      // Notify parent component
      onEssayDelete?.(essayId)
      onRefresh?.()

      alert('Essay deleted successfully')
    } catch (error) {
      console.error('Error deleting essay:', error)
      alert('Failed to delete essay. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getWordCount = (content: string) => {
    // Strip HTML tags and count words
    const text = content.replace(/<[^>]*>/g, '').trim()
    return text.split(/\s+/).filter(word => word.length > 0).length
  }

  if (!isOpen) return null

  return (
    <React.Fragment>
      {/* Backdrop - only on mobile */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onToggle}
      />

      {/* Sidebar - slides in from left */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 shadow-2xl transform transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Essays</h3>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Close sidebar"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Essays List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading essays...</p>
            </div>
          </div>
        ) : essays.length === 0 ? (
          <div className="flex items-center justify-center py-12 px-4">
            <div className="text-center">
              <FileEdit className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">No essays yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Upload or create your first essay to get started</p>
            </div>
          </div>
        ) : (
          essays.map((essay) => (
            <div
              key={essay.id}
              onClick={() => onEssaySelect(essay)}
              className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                currentEssayId === essay.id
                  ? 'bg-accent-primary/10 border-accent-primary dark:border-accent-primary'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium truncate ${
                    currentEssayId === essay.id
                      ? 'text-accent-primary'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {essay.title}
                  </h4>
                </div>

                {onEssayDelete && (
                  <button
                    onClick={(e) => handleDelete(essay.id, e)}
                    disabled={deletingId === essay.id}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${
                      deletingId === essay.id
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-red-100 dark:hover:bg-red-900/30'
                    }`}
                    title="Delete essay"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>{getWordCount(essay.content)} words</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(essay.updated_at)}</span>
                </div>
              </div>

              {essay.writing_type && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {essay.writing_type.charAt(0).toUpperCase() + essay.writing_type.slice(1)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer with essay count */}
      {!isLoading && essays.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            {essays.length} {essays.length === 1 ? 'essay' : 'essays'} total
          </p>
        </div>
      )}
    </div>
    </React.Fragment>
  )
}
