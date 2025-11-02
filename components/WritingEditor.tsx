"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  FileDown,
  Sparkles,
  Zap
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRealTimeAnalysis } from './WritingEditor/useRealTimeAnalysis'
import type { WritingType, CitationStyle, WritingSuggestion } from '@/lib/supabase/types'

interface WritingEditorProps {
  essayId?: string
  initialContent?: string
  initialTitle?: string
  writingType?: WritingType
  citationStyle?: CitationStyle
  onSave?: (content: string, title: string) => void
  onAnalyze?: (content: string) => void
  onExport?: (format: 'pdf' | 'docx') => void
  suggestions?: WritingSuggestion[]
}

export default function WritingEditor({
  initialContent = '',
  initialTitle = 'Untitled Essay',
  writingType = 'academic',
  citationStyle = 'APA',
  onSave,
  onAnalyze,
  onExport,
  suggestions = []
}: WritingEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your essay...'
      }),
      CharacterCount
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6'
      }
    },
    onUpdate: ({ editor }) => {
      // Auto-save could be triggered here with debouncing
    }
  })

  // Calculate reading time (average 200 words per minute)
  const wordCount = editor?.storage.characterCount.words() || 0
  const readingTime = Math.ceil(wordCount / 200)

  // Get character count
  const characterCount = editor?.storage.characterCount.characters() || 0

  // Real-time analysis hook
  const {
    suggestions: realTimeSuggestions,
    isAnalyzing: isRealTimeAnalyzing,
    triggerAnalysis
  } = useRealTimeAnalysis({
    content: editor?.getText() || '',
    writingType,
    citationStyle,
    enabled: realTimeEnabled
  })

  // Combine manual suggestions (from Analyze button) with real-time suggestions
  const allSuggestions = realTimeEnabled ? realTimeSuggestions : suggestions

  const handleSave = async () => {
    if (!editor || !onSave) return

    setIsSaving(true)
    try {
      const content = editor.getHTML()
      await onSave(content, title)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnalyze = async () => {
    if (!editor || !onAnalyze) return

    setIsAnalyzing(true)
    try {
      const content = editor.getText()
      await onAnalyze(content)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-black dark:text-white flex-1"
            placeholder="Essay Title"
          />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                realTimeEnabled
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={realTimeEnabled ? 'Real-time analysis ON' : 'Real-time analysis OFF'}
            >
              <Zap className={`w-4 h-4 ${isRealTimeAnalyzing ? 'animate-pulse' : ''}`} />
              {realTimeEnabled ? 'Live' : 'Off'}
            </button>

            <button
              onClick={realTimeEnabled ? triggerAnalysis : handleAnalyze}
              disabled={isAnalyzing || wordCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
              title={realTimeEnabled ? "Re-analyze now" : "Analyze with AI"}
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing || isRealTimeAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing || isRealTimeAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Save Essay"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => onExport?.('pdf')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Export as PDF"
            >
              <FileDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Format & Metadata */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
              {writingType.charAt(0).toUpperCase() + writingType.slice(1)}
            </span>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
              {citationStyle}
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            <span>{wordCount} words</span>
            <span>{characterCount} characters</span>
            <span>~{readingTime} min read</span>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="h-full text-black dark:text-white"
        />
      </div>

      {/* Suggestions Badge */}
      {allSuggestions.length > 0 && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
          {allSuggestions.length} suggestions
        </div>
      )}
    </div>
  )
}
