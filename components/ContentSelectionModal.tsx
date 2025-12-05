"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Sparkles, Save, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import PageTopicSelector, { SelectionData } from "./PageTopicSelector"
import { Document } from "@/lib/supabase/types"

interface ContentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document
  generationType: 'flashcards'
}

const generationConfig = {
  flashcards: {
    icon: Sparkles,
    color: 'from-accent-primary to-accent-secondary',
    title: 'Generate Flashcards',
    description: 'Create study flashcards from your selected content',
    emoji: '🎯'
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

  // Flashcard count selection
  const [flashcardCount, setFlashcardCount] = useState<number>(20) // Default 20 cards
  const [useAutoCount, setUseAutoCount] = useState<boolean>(true) // Auto-calculate by default

  // Preset saving state
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [isSavingPreset, setIsSavingPreset] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const config = generationConfig[generationType]
  const Icon = config.icon

  // Log when modal opens with different document
  useEffect(() => {
    if (isOpen) {
      console.log(`📖 ContentSelectionModal opened for:`, {
        documentId: document.id,
        fileName: document.file_name,
        generationType
      })
    }
  }, [isOpen, document.id, document.file_name, generationType])

  // Calculate smart default flashcard count based on document length
  useEffect(() => {
    if (generationType === 'flashcards' && document.extracted_text) {
      const wordCount = document.extracted_text.split(/\s+/).length
      // ~1 card per 250 words, min 10, max 30 for auto-calc
      const calculatedCount = Math.max(10, Math.min(Math.floor(wordCount / 250), 30))
      setFlashcardCount(calculatedCount)
      console.log(`📊 Calculated flashcard count: ${calculatedCount} from ${wordCount} words`)
    }
  }, [generationType, document.extracted_text])

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

      // Check if document is RAG-indexed
      const isRAGIndexed = document.rag_indexed === true
      const isLargeDocument = document.file_size > 10 * 1024 * 1024

      // Use RAG endpoint for large/indexed documents, regular endpoint for small documents
      apiEndpoint = (isRAGIndexed || isLargeDocument) ? '/api/generate-flashcards-rag' : '/api/generate-flashcards'
      // Pass user-selected count, or undefined for auto-calculation
      requestBody.count = useAutoCount ? undefined : flashcardCount

      console.log(`🚀 Generating ${generationType} from ${selection.type}...`)
      console.log('[ContentSelectionModal] ⚠️ Request body:', JSON.stringify(requestBody, null, 2))

      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // Check if response is SSE stream (for podcast generation)
      const contentType = response.headers.get('content-type')
      let data: any = null

      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('Failed to get response reader')
        }

        let buffer = ''
        let receivedData = false
        let eventCount = 0

        console.log('[ContentSelectionModal] Starting SSE stream reading for', generationType)

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log('[ContentSelectionModal] SSE stream ended', { eventCount, receivedData })
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const eventData = line.substring(6)

              // Skip heartbeat messages
              if (eventData.trim() === '' || eventData === ': heartbeat') continue

              try {
                const event = JSON.parse(eventData)
                eventCount++

                if (event.type === 'progress') {
                  // Could update UI with progress here if needed
                  console.log(`[ContentSelectionModal] Progress: ${event.progress}% - ${event.message}`)
                } else if (event.type === 'complete') {
                  console.log('[ContentSelectionModal] Received complete event:', {
                    hasData: !!event.data,
                    dataKeys: event.data ? Object.keys(event.data) : []
                  })
                  data = event.data
                  receivedData = true
                } else if (event.type === 'error') {
                  console.error('[ContentSelectionModal] Received error event:', event.error)
                  throw new Error(event.error)
                }
              } catch (parseError) {
                console.error('Failed to parse SSE message:', parseError, 'Data:', eventData)
                // Only rethrow if it's not a JSON parse error
                if (parseError instanceof SyntaxError === false) {
                  throw parseError
                }
              }
            }
          }
        }

        if (!receivedData || !data) {
          console.error('[ContentSelectionModal] SSE stream ended without complete event', {
            receivedData,
            data,
            generationType,
            responseStatus: response.status,
            responseHeaders: Object.fromEntries(response.headers.entries())
          })
          throw new Error('No data received from stream')
        }
      } else {
        // Regular JSON response
        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Failed to generate ${generationType}`)
        }
      }

      console.log(`✅ ${generationType} generated successfully!`, {
        documentId: document.id,
        flashcardCount: data.flashcards?.length,
        response: data
      })

      // Close modal
      onClose()

      // Small delay to ensure database transaction commits
      await new Promise(resolve => setTimeout(resolve, 500))

      // Navigate to dashboard with appropriate mode and documentId
      router.push(`/dashboard?mode=${generationType}&documentId=${document.id}`)

      // Show success message (could add toast notification here)
    } catch (err) {
      console.error(`Error generating ${generationType}:`, err)

      // Create helpful error message based on error type
      let errorMessage = 'Generation failed. Please try again.'

      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()

        if (errMsg.includes('no content') || errMsg.includes('insufficient')) {
          errorMessage = `${err.message} Try selecting "Full Document" or a larger page range for better results.`
        } else if (errMsg.includes('page range') || errMsg.includes('pages')) {
          errorMessage = `${err.message} Try using "Manual Selection" with a custom page range instead.`
        } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
          errorMessage = 'Generation timed out. Try selecting a smaller section of the document.'
        } else if (errMsg.includes('rate limit')) {
          errorMessage = 'Rate limit reached. Please wait a few moments and try again.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setSelection({ type: 'full' })
      setError(null)
      setShowSavePreset(false)
      setPresetName('')
      setSaveSuccess(false)
      onClose()
    }
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) return

    setIsSavingPreset(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${document.id}/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetName: presetName.trim(),
          selectionData: selection
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preset')
      }

      console.log('✅ Preset saved successfully:', data.preset)

      // Show success state
      setSaveSuccess(true)

      // Reset after a moment
      setTimeout(() => {
        setShowSavePreset(false)
        setPresetName('')
        setSaveSuccess(false)
      }, 1500)

    } catch (err) {
      console.error('Error saving preset:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preset')
    } finally {
      setIsSavingPreset(false)
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
                key={document.id} // Force new component instance when document changes
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

          {/* Flashcard Count Selector (only shown for flashcards) */}
          {generationType === 'flashcards' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Number of Flashcards
              </h3>

              {/* Auto vs Manual Toggle */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setUseAutoCount(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                    useAutoCount
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Auto (Recommended)
                </button>
                <button
                  onClick={() => setUseAutoCount(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                    !useAutoCount
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Count Slider (only shown when manual mode) */}
              {!useAutoCount && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Flashcards to generate:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{flashcardCount}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={flashcardCount}
                    onChange={(e) => setFlashcardCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>5 cards</span>
                    <span>50 cards</span>
                  </div>
                </div>
              )}

              {/* Auto Mode Info */}
              {useAutoCount && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ℹ️ Auto mode generates ~{flashcardCount} flashcards based on your document length (1 card per 250 words)
                  </p>
                </div>
              )}
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
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900 space-y-3">
          {/* Save Preset Section */}
          {showSavePreset && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Save this selection as a preset
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && presetName.trim()) {
                      handleSavePreset()
                    } else if (e.key === 'Escape') {
                      setShowSavePreset(false)
                      setPresetName('')
                    }
                  }}
                  placeholder="Enter preset name..."
                  disabled={isSavingPreset || saveSuccess}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  autoFocus
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim() || isSavingPreset || saveSuccess}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : isSavingPreset ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false)
                    setPresetName('')
                  }}
                  disabled={isSavingPreset}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {/* Save Selection Button - Only show if a selection is made and not full document */}
            {selection.type !== 'full' && !showSavePreset && !isGenerating && (
              <button
                onClick={() => setShowSavePreset(true)}
                className="flex items-center gap-2 px-6 py-3 border border-blue-500 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Selection
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                (selection.type === 'topic' && !selection.topic)
              }
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
                  Generate Flashcards
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
