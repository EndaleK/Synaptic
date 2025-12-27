'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Upload, Sparkles, ChevronRight, Zap } from 'lucide-react'
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

  // Determine styling based on state
  const getStyles = () => {
    switch (state.type) {
      case 'flashcards_due':
        return {
          gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
          hoverGradient: 'hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600',
          icon: Zap,
          title: `Review ${state.count} Flashcard${state.count !== 1 ? 's' : ''}`,
          subtitle: 'Keep your streak going!',
          iconBg: 'bg-white/20'
        }
      case 'continue_document':
        return {
          gradient: 'from-blue-500 via-cyan-500 to-teal-500',
          hoverGradient: 'hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600',
          icon: BookOpen,
          title: 'Continue Studying',
          subtitle: truncateFilename(state.document.file_name, 40),
          iconBg: 'bg-white/20'
        }
      case 'upload_first':
        return {
          gradient: 'from-emerald-500 via-green-500 to-lime-500',
          hoverGradient: 'hover:from-emerald-600 hover:via-green-600 hover:to-lime-600',
          icon: Upload,
          title: 'Upload Your First Document',
          subtitle: 'Start your learning journey',
          iconBg: 'bg-white/20'
        }
    }
  }

  const styles = getStyles()
  const IconComponent = styles.icon

  return (
    <button
      onClick={handleClick}
      className={`
        w-full p-5 rounded-2xl
        bg-gradient-to-r ${styles.gradient} ${styles.hoverGradient}
        text-white shadow-lg
        transform transition-all duration-300
        hover:scale-[1.02] hover:shadow-xl
        active:scale-[0.98]
        flex items-center justify-between
        group
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${styles.iconBg} backdrop-blur-sm`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-lg">{styles.title}</h3>
          <p className="text-sm text-white/80">{styles.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state.type === 'flashcards_due' && (
          <Sparkles className="w-5 h-5 opacity-80" />
        )}
        <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
      </div>
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
