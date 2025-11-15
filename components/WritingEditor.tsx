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
  Zap,
  Type,
  FileText,
  Maximize,
  Eye,
  AlignCenter,
  X,
  Mic
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useRealTimeAnalysis } from './WritingEditor/useRealTimeAnalysis'
import { WritingSuggestionsExtension } from './WritingEditor/WritingSuggestionsExtension'
import './WritingEditor/writing-suggestions.css'
import type { WritingType, CitationStyle, WritingSuggestion, WritingStage } from '@/lib/supabase/types'
import ParaphrasingModal from './ParaphrasingModal'
import ThesisAnalysisPanel from './ThesisAnalysisPanel'
import SuggestionsPanel from './SuggestionsPanel'
import WritingStatsBar from './WritingStatsBar'
import InlineSuggestion from './InlineSuggestion'
import VoiceDictation from './WritingView/VoiceDictation'

interface WritingEditorProps {
  essayId?: string
  initialContent?: string
  initialTitle?: string
  writingType?: WritingType
  citationStyle?: CitationStyle
  writingStage?: WritingStage
  onSave?: (content: string, title: string) => void
  onAnalyze?: (content: string) => void
  onExport?: (format: 'pdf' | 'docx') => void
  suggestions?: WritingSuggestion[]
  onContentChange?: (content: string, title: string) => void
}

export default function WritingEditor({
  initialContent = '',
  initialTitle = 'Untitled Essay',
  writingType = 'academic',
  citationStyle = 'APA',
  writingStage = 'drafting',
  onSave,
  onAnalyze,
  onExport,
  suggestions = [],
  onContentChange
}: WritingEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Grammar checking should be disabled during drafting stage (Process Writing Theory)
  // This helps students focus on getting ideas down without worrying about correctness
  const isDraftingStage = writingStage === 'drafting'
  const [realTimeEnabled, setRealTimeEnabled] = useState(!isDraftingStage)
  const [selectedSuggestion, setSelectedSuggestion] = useState<WritingSuggestion | null>(null)
  const [hasLoadedContent, setHasLoadedContent] = useState(false)
  const [isParaphraseModalOpen, setIsParaphraseModalOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [isThesisAnalysisPanelOpen, setIsThesisAnalysisPanelOpen] = useState(false)
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined)
  const [activeSuggestionPopup, setActiveSuggestionPopup] = useState<WritingSuggestion | null>(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const [showVoiceDictation, setShowVoiceDictation] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)

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
      CharacterCount.configure({
        mode: 'textSize', // Count all characters including spaces
      }),
      WritingSuggestionsExtension.configure({
        suggestions: [],
        onSuggestionClick: (suggestion) => {
          // Calculate position for popup
          if (editor && suggestion.start_position !== undefined) {
            const coords = editor.view.coordsAtPos(suggestion.start_position)
            const editorRect = editorContainerRef.current?.getBoundingClientRect()

            if (editorRect) {
              setPopupPosition({
                top: coords.top - editorRect.top + 20,
                left: coords.left - editorRect.left
              })
            }
          }
          setActiveSuggestionPopup(suggestion)
          setSelectedSuggestion(suggestion)
        }
      })
    ],
    content: initialContent,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6'
      }
    },
    onUpdate: ({ editor }) => {
      // Notify parent of content changes
      if (onContentChange && hasLoadedContent) {
        onContentChange(editor.getHTML(), title)
      }
    }
  })

  // Load initial content when it changes (e.g., when a new essay is selected)
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      // Always update content when initialContent changes, even if empty
      editor.commands.setContent(initialContent || '')
      setHasLoadedContent(true)
    }
  }, [editor, initialContent])

  // Update title when it changes from props
  useEffect(() => {
    // Always update title when initialTitle changes
    setTitle(initialTitle)
  }, [initialTitle])

  // Automatically disable real-time analysis during drafting stage
  useEffect(() => {
    if (writingStage === 'drafting') {
      setRealTimeEnabled(false)
    } else if (writingStage === 'editing' && !realTimeEnabled) {
      // Automatically enable when entering editing stage (if not already enabled)
      setRealTimeEnabled(true)
    }
  }, [writingStage])

  // Keyboard shortcuts for writing modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process shortcuts if user is typing in an editable element
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable ||
                      target.closest('[contenteditable]') ||
                      target.closest('.ProseMirror') ||
                      target.closest('.tiptap')

      // For regular typing (non-modifier keys), let the editor handle it
      if (isTyping && !e.metaKey && !e.ctrlKey) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+Shift+F: Zen Mode
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setZenMode(prev => !prev)
      }

      // Cmd/Ctrl+D: Focus Mode
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setFocusMode(prev => !prev)
      }

      // Cmd/Ctrl+T: Typewriter Mode
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        setTypewriterMode(prev => !prev)
      }

      // Escape: Exit Zen Mode
      if (e.key === 'Escape' && zenMode) {
        e.preventDefault()
        setZenMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zenMode])

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

  // Update extension configuration when suggestions change
  useEffect(() => {
    if (editor && allSuggestions) {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'writingSuggestions'
      )

      if (extension) {
        extension.options.suggestions = allSuggestions
        // Force editor to re-render decorations
        editor.view.dispatch(editor.state.tr)
      }
    }
  }, [allSuggestions, editor])

  const handleSave = async () => {
    if (!editor || !onSave) return

    setIsSaving(true)
    try {
      const content = editor.getHTML()
      await onSave(content, title)
      setLastSaved(new Date())
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

  const handleParaphrase = () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')

    if (text.trim().length === 0) {
      alert('Please select some text to paraphrase')
      return
    }

    setSelectedText(text)
    setIsParaphraseModalOpen(true)
  }

  const handleReplaceText = (newText: string) => {
    if (!editor) return

    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt({ from, to }, newText).run()
  }

  const handleApplySuggestion = (suggestionId: string) => {
    if (!editor) return

    // Find the suggestion
    const suggestion = allSuggestions.find(s => s.id === suggestionId)
    if (!suggestion || !suggestion.start_position || !suggestion.end_position) return

    // Use suggested text if available
    const replacement = suggestion.suggestedText || suggestion.suggestion || ''
    if (!replacement) return

    // Replace the text at the suggestion's position
    editor
      .chain()
      .focus()
      .setTextSelection({
        from: suggestion.start_position,
        to: suggestion.end_position
      })
      .insertContent(replacement)
      .run()

    // Close the popup
    setActiveSuggestionPopup(null)

    // Note: In a real implementation, you'd want to remove this suggestion
    // from the suggestions array and trigger a re-analysis
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setActiveSuggestionPopup(null)
    // In a real implementation, you might want to mark this suggestion as dismissed
  }

  const handleVoiceText = (text: string) => {
    if (!editor) return
    // Insert the transcribed text at the current cursor position
    editor.chain().focus().insertContent(text).run()
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Zen Mode wrapper
  if (zenMode) {
    return (
      <div className="zen-mode animate-zen-in">
        {/* Minimal Zen Mode Toolbar */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {wordCount} words
          </span>
          <button
            onClick={() => setZenMode(false)}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Exit Zen Mode (Esc)"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Zen Mode Editor */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <EditorContent
            editor={editor}
            className={`text-black dark:text-white ${typewriterMode ? 'typewriter-mode' : ''}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        {/* Top Actions Row */}
        <div className="flex items-center justify-end gap-2 mb-2">
          <button
            onClick={() => !isDraftingStage && setRealTimeEnabled(!realTimeEnabled)}
            disabled={isDraftingStage}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
              realTimeEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : isDraftingStage
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 cursor-not-allowed'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={
              isDraftingStage
                ? 'Grammar checking disabled during drafting - Focus on getting your ideas down!'
                : realTimeEnabled
                ? 'Real-time analysis ON'
                : 'Real-time analysis OFF'
            }
          >
            <Zap className={`w-3.5 h-3.5 ${isRealTimeAnalyzing ? 'animate-pulse' : ''}`} />
            {isDraftingStage ? 'Drafting' : realTimeEnabled ? 'Live' : 'Off'}
          </button>

          <button
            onClick={realTimeEnabled ? triggerAnalysis : handleAnalyze}
            disabled={isAnalyzing || wordCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
            title={realTimeEnabled ? "Re-analyze now" : "Analyze with AI"}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing || isRealTimeAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing || isRealTimeAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Save Essay"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-pulse' : ''}`} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => onExport?.('pdf')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Export as PDF"
          >
            <FileDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={() => setShowVoiceDictation(!showVoiceDictation)}
            className={`p-1.5 rounded-lg transition-colors ${
              showVoiceDictation
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            title="Voice Dictation"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Voice Dictation Panel */}
        {showVoiceDictation && (
          <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
            <VoiceDictation onTextReceived={handleVoiceText} />
          </div>
        )}

        {/* Formatting Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

            <button
              onClick={handleParaphrase}
              className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-600 dark:text-blue-400"
              title="Paraphrase Selected Text"
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsThesisAnalysisPanelOpen(true)}
              disabled={wordCount === 0}
              className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-purple-600 dark:text-purple-400 disabled:opacity-30"
              title="Analyze Thesis & Structure"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Writing Modes */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZenMode(!zenMode)}
              className={`p-1.5 rounded transition-colors ${
                zenMode
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Zen Mode (Cmd/Ctrl+Shift+F)"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`p-1.5 rounded transition-colors ${
                focusMode
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Focus Mode (Cmd/Ctrl+D)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTypewriterMode(!typewriterMode)}
              className={`p-1.5 rounded transition-colors ${
                typewriterMode
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Typewriter Mode (Cmd/Ctrl+T)"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div ref={editorContainerRef} className={`flex-1 overflow-y-auto relative ${typewriterMode ? 'typewriter-mode' : ''}`}>
        <EditorContent
          editor={editor}
          className={`h-full text-black dark:text-white ${focusMode ? 'focus-mode-active' : ''}`}
        />

        {/* Inline Suggestion Popup */}
        {activeSuggestionPopup && (
          <InlineSuggestion
            suggestion={activeSuggestionPopup}
            onApply={handleApplySuggestion}
            onDismiss={handleDismissSuggestion}
            position={popupPosition}
          />
        )}
      </div>

      {/* Suggestions Badge */}
      {allSuggestions.length > 0 && (
        <button
          onClick={() => setIsSuggestionsPanelOpen(true)}
          className="absolute top-4 right-4 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition-colors cursor-pointer"
        >
          {allSuggestions.length} suggestion{allSuggestions.length === 1 ? '' : 's'}
        </button>
      )}

      {/* Paraphrasing Modal */}
      <ParaphrasingModal
        isOpen={isParaphraseModalOpen}
        onClose={() => setIsParaphraseModalOpen(false)}
        selectedText={selectedText}
        onReplace={handleReplaceText}
      />

      {/* Thesis Analysis Panel */}
      <ThesisAnalysisPanel
        isOpen={isThesisAnalysisPanelOpen}
        onClose={() => setIsThesisAnalysisPanelOpen(false)}
        essayContent={editor?.getText() || ''}
      />

      {/* Suggestions Panel */}
      <SuggestionsPanel
        isOpen={isSuggestionsPanelOpen}
        onClose={() => setIsSuggestionsPanelOpen(false)}
        suggestions={allSuggestions}
        onSuggestionClick={(suggestion) => {
          setSelectedSuggestion(suggestion)
          // Scroll to the suggestion in the editor
          if (editor && suggestion.start_position !== undefined) {
            editor.commands.focus()
            editor.commands.setTextSelection({
              from: suggestion.start_position,
              to: suggestion.end_position
            })
          }
        }}
        onApplySuggestion={handleApplySuggestion}
      />

      {/* Writing Stats Bar */}
      <WritingStatsBar
        wordCount={wordCount}
        characterCount={characterCount}
        readingTime={readingTime}
        lastSaved={lastSaved}
        isSaving={isSaving}
      />
    </div>
  )
}
