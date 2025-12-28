'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Upload, ChevronRight, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useUIStore, useDocumentStore } from '@/lib/store/useStore'

interface ReviewQueueData {
  success: boolean
  stats: {
    totalDue: number
    newCards: number
  }
}

interface RecentDocument {
  id: string
  file_name: string
  created_at: string
}

type WidgetState =
  | { type: 'loading' }
  | { type: 'flashcards_due'; count: number }
  | { type: 'continue_document'; document: RecentDocument }
  | { type: 'upload_first' }

export default function ContinueStudyingWidget() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const { setActiveMode } = useUIStore()
  const { setCurrentDocument } = useDocumentStore()
  const [state, setState] = useState<WidgetState>({ type: 'loading' })

  useEffect(() => {
    // Wait for auth to be loaded AND userId to be available
    if (!isLoaded || !userId) {
      return
    }

    async function checkStudyState() {
      try {
        // Check for due flashcards first (highest priority)
        const reviewResponse = await fetch('/api/flashcards/review-queue', {
          credentials: 'include'
        })

        if (reviewResponse.ok) {
          const reviewData: ReviewQueueData = await reviewResponse.json()
          if (reviewData.success && reviewData.stats?.totalDue > 0) {
            setState({ type: 'flashcards_due', count: reviewData.stats.totalDue })
            return
          }
        }

        // Check for recent documents
        const docsResponse = await fetch('/api/documents?limit=1', {
          credentials: 'include'
        })

        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          if (docsData.documents && docsData.documents.length > 0) {
            setState({ type: 'continue_document', document: docsData.documents[0] })
            return
          }
        }

        // No flashcards or documents - prompt to upload
        setState({ type: 'upload_first' })
      } catch (error) {
        console.error('[ContinueStudyingWidget] Error checking study state:', error)
        setState({ type: 'upload_first' })
      }
    }

    checkStudyState()
  }, [userId, isLoaded])

  const handleClick = async () => {
    switch (state.type) {
      case 'flashcards_due':
        // Go to flashcard review mode
        setActiveMode('flashcards')
        break

      case 'continue_document':
        // Load the document and go to chat mode
        try {
          const response = await fetch(`/api/documents/${state.document.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.document) {
              setCurrentDocument({
                id: data.document.id,
                name: data.document.file_name,
                content: data.document.extracted_text || '',
                fileType: data.document.file_type,
                storagePath: data.document.storage_path,
                fileSize: data.document.file_size,
              })
              setActiveMode('chat')
            }
          }
        } catch (error) {
          console.error('[ContinueStudyingWidget] Error loading document:', error)
        }
        break

      case 'upload_first':
        // Go to flashcards mode (which shows upload picker)
        setActiveMode('flashcards')
        break
    }
  }

  if (state.type === 'loading') {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl h-24" />
    )
  }

  const getConfig = () => {
    switch (state.type) {
      case 'flashcards_due':
        return {
          icon: Zap,
          title: `Review ${state.count} card${state.count !== 1 ? 's' : ''}`,
          subtitle: 'Due for review'
        }
      case 'continue_document':
        return {
          icon: BookOpen,
          title: 'Continue studying',
          subtitle: truncateFilename(state.document.file_name, 35)
        }
      case 'upload_first':
        return {
          icon: Upload,
          title: 'Get started',
          subtitle: 'Upload your first document'
        }
    }
  }

  const config = getConfig()
  const IconComponent = config.icon

  const isPrimary = state.type === 'flashcards_due'

  return (
    <button
      onClick={handleClick}
      className={`w-full p-5 rounded-2xl transition-all duration-200 flex items-center justify-between group ${
        isPrimary
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          isPrimary ? 'bg-white/20' : 'bg-white/10 dark:bg-neutral-900/10'
        }`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-base">{config.title}</h3>
          <p className={`text-sm ${isPrimary ? 'text-white/70' : 'text-white/60 dark:text-neutral-500'}`}>
            {config.subtitle}
          </p>
        </div>
      </div>
      <ChevronRight className={`w-5 h-5 ${
        isPrimary ? 'text-white/60' : 'text-white/40 dark:text-neutral-400'
      } group-hover:translate-x-1 transition-transform duration-200`} />
    </button>
  )
}

function truncateFilename(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) return filename

  const extension = filename.includes('.') ? filename.split('.').pop() : ''
  const nameWithoutExt = filename.includes('.')
    ? filename.slice(0, filename.lastIndexOf('.'))
    : filename

  const maxNameLength = maxLength - (extension ? extension.length + 4 : 3) // 4 for "..." and "."
  return `${nameWithoutExt.slice(0, maxNameLength)}...${extension ? `.${extension}` : ''}`
}
