"use client"

import { useState } from "react"
import { X, Loader2, Sparkles, Zap, Map } from "lucide-react"
import { useRouter } from "next/navigation"
import PageTopicSelector, { SelectionData } from "./PageTopicSelector"
import { Document } from "@/lib/supabase/types"

interface ContentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document
  generationType: 'flashcards' | 'podcast' | 'mindmap'
}

const generationConfig = {
  flashcards: {
    icon: Sparkles,
    color: 'from-accent-primary to-accent-secondary',
    title: 'Generate Flashcards',
    description: 'Create study flashcards from your selected content',
    emoji: '🎯'
  },
  podcast: {
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    title: 'Generate Podcast',
    description: 'Convert your content into an AI-narrated audio lesson',
    emoji: '🎙️'
  },
  mindmap: {
    icon: Map,
    color: 'from-blue-500 to-cyan-500',
    title: 'Generate Mind Map',
    description: 'Create a visual concept map from your content',
    emoji: '🗺️'
  }
}

export default function ContentSelectionModal({
  isOpen,
  onClose,
  document,
  generationType
}: ContentSelectionModalProps) {
  const router = useRouter()
  const [selection, setSelection] = useState<SelectionData>({ type: 'full' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = generationConfig[generationType]
  const Icon = config.icon

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      let response
      let apiEndpoint = ''
      let requestBody: any = {
        documentId: document.id,
        selection
      }

      // Call appropriate API based on generation type
      switch (generationType) {
        case 'flashcards':
          apiEndpoint = '/api/generate-flashcards-rag'
          requestBody.count = 10 // Default count
          break

        case 'podcast':
          apiEndpoint = '/api/generate-podcast'
          requestBody.format = 'deep-dive'
          requestBody.targetDuration = 10
          break

        case 'mindmap':
          apiEndpoint = '/api/generate-mindmap'
          // Mind map uses auto-detected params, but accepts selection
          break
      }

      console.log(`🚀 Generating ${generationType} from ${selection.type}...`)

      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to generate ${generationType}`)
      }

      console.log(`✅ ${generationType} generated successfully!`)

      // Close modal
      onClose()

      // Navigate to dashboard with appropriate mode
      router.push(`/dashboard?mode=${generationType}`)

      // Show success message (could add toast notification here)
    } catch (err) {
      console.error(`Error generating ${generationType}:`, err)
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setSelection({ type: 'full' })
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  {config.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {document.file_name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.description}
          </p>

          {/* Content Selection */}
          {document.metadata?.page_count ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Select Content
              </h3>
              <PageTopicSelector
                documentId={document.id}
                totalPages={document.metadata.page_count}
                onSelectionChange={setSelection}
              />
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Full document will be used (page information not available)
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Selection Summary */}
          {!isGenerating && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Ready to generate from:
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selection.type === 'full' && '📄 Full Document'}
                {selection.type === 'pages' && `📖 Pages ${selection.pageRange?.start}-${selection.pageRange?.end}`}
                {selection.type === 'topic' && `📑 ${selection.topic?.title}`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (selection.type === 'topics' && !selection.topic)}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${config.color} text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span className="text-xl">{config.emoji}</span>
                Generate {generationType === 'flashcards' ? 'Flashcards' : generationType === 'podcast' ? 'Podcast' : 'Mind Map'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
