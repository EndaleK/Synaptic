"use client"

import { useState } from 'react'
import { X, Copy, Check, Loader2, RefreshCw } from 'lucide-react'

interface ParaphrasingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  onReplace: (newText: string) => void
}

type ParaphraseStyle = 'academic' | 'simplified' | 'professional' | 'expanded'

interface ParaphraseVariation {
  text: string
  selected: boolean
}

export default function ParaphrasingModal({
  isOpen,
  onClose,
  selectedText,
  onReplace
}: ParaphrasingModalProps) {
  const [style, setStyle] = useState<ParaphraseStyle>('academic')
  const [variations, setVariations] = useState<ParaphraseVariation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const styleDescriptions = {
    academic: 'Formal, scholarly tone with discipline-specific terminology',
    simplified: 'Clear, straightforward language for easier understanding',
    professional: 'Business-appropriate, concise communication',
    expanded: 'More detailed with examples and elaboration'
  }

  const handleParaphrase = async () => {
    if (!selectedText || selectedText.trim().length === 0) {
      setError('No text selected')
      return
    }

    setIsLoading(true)
    setError(null)
    setVariations([])

    try {
      const response = await fetch('/api/writing/paraphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: selectedText,
          style,
          numVariations: 3
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to paraphrase text')
      }

      const data = await response.json()
      setVariations(data.variations.map((text: string) => ({ text, selected: false })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleReplaceWithVariation = (text: string) => {
    onReplace(text)
    onClose()
  }

  // Auto-fetch on style change if we have selected text
  const handleStyleChange = (newStyle: ParaphraseStyle) => {
    setStyle(newStyle)
    if (selectedText && selectedText.trim().length > 0) {
      // Wait a moment then fetch with new style
      setTimeout(() => {
        handleParaphrase()
      }, 100)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Paraphrase Text
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Original Text */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Original Text:
            </p>
            <p className="text-gray-900 dark:text-white leading-relaxed">
              {selectedText}
            </p>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paraphrasing Style:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(styleDescriptions) as ParaphraseStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStyleChange(s)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    style === s
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white capitalize">
                    {s}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {styleDescriptions[s]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          {variations.length === 0 && !isLoading && (
            <button
              onClick={handleParaphrase}
              disabled={isLoading || !selectedText}
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating variations...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Generate Paraphrases
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Generating {style} paraphrases...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 font-medium">
                Error: {error}
              </p>
            </div>
          )}

          {/* Variations */}
          {variations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {variations.length} variations generated
                </p>
                <button
                  onClick={handleParaphrase}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>

              {variations.map((variation, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Variation {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(variation.text, index)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-900 dark:text-white leading-relaxed mb-4">
                    {variation.text}
                  </p>

                  <button
                    onClick={() => handleReplaceWithVariation(variation.text)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Replace Selected Text
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && variations.length === 0 && !error && (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <RefreshCw className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Select a style and click "Generate Paraphrases"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  AI will create 3 variations in your chosen style
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
