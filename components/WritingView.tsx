"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'

// Modern UI Components
import ModernWritingHeader from './writing/ModernWritingHeader'
import DocumentSidebar from './writing/DocumentSidebar'
import ModernToolbar from './writing/ModernToolbar'
import WritingSidePanel from './writing/WritingSidePanel'
import VoiceModal from './writing/VoiceModal'
import FileUploadModal from './writing/FileUploadModal'

// Existing Components (Preserved)
import WritingSuggestionPanel from './WritingSuggestionPanel'
import CitationManager from './CitationManager'

import type { Essay, CitationStyle, WritingSuggestion, Citation } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface WritingViewProps {
  essayId?: string
  documentId?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
}

export default function WritingView({ essayId, documentId }: WritingViewProps) {
  const { user, isLoaded } = useUser()
  const [essay, setEssay] = useState<Essay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI State
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [writingTone, setWritingTone] = useState('academic')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCitations, setShowCitations] = useState(false)

  // TipTap Editor
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "Start writing your essay here... 📝 Or use voice-to-text and file upload above!"
      }),
      CharacterCount
    ],
    content: essay?.content || '',
    onUpdate: ({ editor }) => {
      // Auto-update word count
      const content = editor.getHTML()
      if (essay) {
        const wordCount = editor.storage.characterCount.words()
        setEssay({ ...essay, content, word_count: wordCount })
      }
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-8 bg-gray-50 dark:bg-gray-900',
      },
    },
  })

  // Helper function to ensure profile exists
  const ensureProfileExists = async () => {
    try {
      const response = await fetch('/api/user/ensure-profile', { method: 'POST' })

      if (!response.ok) {
        const text = await response.text()
        console.error('Profile API error response:', text)

        try {
          const error = JSON.parse(text)
          throw new Error(error.error || 'Failed to create user profile')
        } catch {
          throw new Error(`Failed to create user profile: ${response.status} ${response.statusText}`)
        }
      }

      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch (e) {
        console.error('Invalid JSON response from ensure-profile:', text)
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error in ensureProfileExists:', error)
      throw error
    }
  }

  // Load or create essay
  useEffect(() => {
    if (!isLoaded) {
      // Wait for Clerk to finish loading
      return
    }

    if (!user) {
      // User not authenticated (shouldn't happen in protected route)
      setIsLoading(false)
      setError('Please sign in to use the writing tool')
      return
    }

    if (essayId) {
      loadEssay()
    } else {
      createNewEssay()
    }
  }, [essayId, user, isLoaded])

  // Update editor content when essay loads
  useEffect(() => {
    if (essay && editor && editor.getHTML() !== essay.content) {
      editor.commands.setContent(essay.content)
    }
  }, [essay?.content, editor])

  const loadEssay = async () => {
    if (!essayId || !user) return

    try {
      setIsLoading(true)
      const profileResponse = await ensureProfileExists()
      const profile = profileResponse.profile

      if (!profile?.id) throw new Error('User profile not found')

      const supabase = createClient()

      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('id', essayId)
        .eq('user_id', profile.id)
        .single()

      if (error) throw error
      setEssay(data)
      setCitationStyle(data.citation_style || 'APA')
    } catch (err) {
      console.error('Error loading essay:', err)
      setError(err instanceof Error ? err.message : 'Failed to load essay')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewEssay = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Call API to create essay (bypasses RLS with service role)
      const response = await fetch('/api/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Essay',
          content: '',
          writing_type: 'academic',
          citation_style: 'APA',
          word_count: 0,
          status: 'draft',
          document_id: documentId || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API error creating essay:', error)
        throw new Error(error.error || 'Failed to create essay')
      }

      const { essay } = await response.json()

      if (!essay) throw new Error('No essay data returned from API')

      setEssay(essay)
    } catch (err) {
      console.error('Error creating essay:', err)
      setError(err instanceof Error ? err.message : 'Failed to create essay')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!essay || !user || !editor) return

    try {
      setIsSaving(true)
      const content = editor.getHTML()
      const title = essay.title
      const wordCount = editor.storage.characterCount.words()

      const supabase = createClient()

      // Create version snapshot
      const newVersion = {
        version_number: essay.version_history.length + 1,
        content: essay.content,
        timestamp: new Date().toISOString(),
        word_count: essay.word_count
      }

      const { error } = await supabase
        .from('essays')
        .update({
          content,
          title,
          word_count: wordCount,
          version_history: [...essay.version_history, newVersion],
          updated_at: new Date().toISOString()
        })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({
        ...essay,
        content,
        title,
        word_count: wordCount,
        version_history: [...essay.version_history, newVersion]
      })
    } catch (err) {
      console.error('Error saving essay:', err)
      alert('Failed to save essay')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    if (!essay) return

    try {
      const response = await fetch('/api/writing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayId: essay.id,
          format: 'pdf'
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${essay.title}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting essay:', err)
      alert('Failed to export essay')
    }
  }

  const handleAnalyze = async () => {
    if (!essay || !editor) return

    try {
      const content = editor.getHTML()
      const response = await fetch('/api/writing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          writingType: essay.writing_type,
          citationStyle: essay.citation_style
        })
      })

      if (!response.ok) throw new Error('Analysis failed')

      const { suggestions } = await response.json()

      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({ ai_suggestions: suggestions })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({ ...essay, ai_suggestions: suggestions })
      setShowSuggestions(true)
    } catch (err) {
      console.error('Error analyzing essay:', err)
      alert('Failed to analyze essay')
    }
  }

  const handleImprove = async () => {
    if (!essay || !editor) return

    try {
      const selection = editor.state.selection
      const selectedText = editor.state.doc.textBetween(selection.from, selection.to)

      if (!selectedText) {
        alert('Please select some text to improve')
        return
      }

      const response = await fetch('/api/writing/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          tone: writingTone
        })
      })

      if (!response.ok) throw new Error('Improvement failed')

      const { paraphrased } = await response.json()

      // Replace selected text
      editor.chain().focus().deleteSelection().insertContent(paraphrased).run()
    } catch (err) {
      console.error('Error improving text:', err)
      alert('Failed to improve text')
    }
  }

  const handleAddCitation = async (citation: Citation) => {
    if (!essay) return

    const updatedCitations = [...essay.cited_sources, citation]

    const supabase = createClient()
    const { error } = await supabase
      .from('essays')
      .update({ cited_sources: updatedCitations })
      .eq('id', essay.id)

    if (error) {
      console.error('Error adding citation:', error)
      return
    }

    setEssay({ ...essay, cited_sources: updatedCitations })
  }

  const handleDeleteCitation = async (citationId: string) => {
    if (!essay) return

    const updatedCitations = essay.cited_sources.filter(c => c.id !== citationId)

    const supabase = createClient()
    const { error } = await supabase
      .from('essays')
      .update({ cited_sources: updatedCitations })
      .eq('id', essay.id)

    if (error) {
      console.error('Error deleting citation:', error)
      return
    }

    setEssay({ ...essay, cited_sources: updatedCitations })
  }

  const insertTextAtCursor = (text: string) => {
    if (editor) {
      editor.chain().focus().insertContent(text).run()
    }
  }

  const handleFilesSelected = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type
    }))
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading essay...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!essay) return null

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <ModernWritingHeader
        onSave={handleSave}
        onExport={handleExport}
        onShare={() => console.log('Share clicked')}
        isSaving={isSaving}
        showResearch={false}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Document Sidebar */}
        <DocumentSidebar
          activeEssayId={essay.id}
          onSelectEssay={(id) => window.location.href = `/dashboard/writer?essayId=${id}`}
          onNewEssay={createNewEssay}
          onSelectTemplate={(template) => console.log('Template selected:', template)}
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Modern Toolbar */}
          <ModernToolbar
            editor={editor}
            onVoiceClick={() => setShowVoiceModal(true)}
            onUploadClick={() => setShowUploadModal(true)}
            onAnalyze={handleAnalyze}
            onImprove={handleImprove}
            citationStyle={citationStyle}
            onCitationStyleChange={(style) => {
              setCitationStyle(style as CitationStyle)
              if (essay) {
                const supabase = createClient()
                supabase.from('essays').update({ citation_style: style }).eq('id', essay.id)
              }
            }}
            writingTone={writingTone}
            onWritingToneChange={setWritingTone}
          />

          {/* Editor + Side Panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto py-8 px-6">
                {/* Title Input */}
                <input
                  type="text"
                  value={essay.title}
                  onChange={(e) => setEssay({ ...essay, title: e.target.value })}
                  className="w-full text-3xl font-bold mb-6 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Essay Title"
                />

                {/* TipTap Editor */}
                <div className="tiptap-editor">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* Writing Side Panel */}
            <WritingSidePanel
              wordCount={editor?.storage.characterCount.words() || 0}
              characterCount={editor?.storage.characterCount.characters() || 0}
              goalWordCount={essay.writing_goals?.target_word_count || 2000}
              uploadedFiles={uploadedFiles}
              onRemoveFile={handleRemoveFile}
              onGenerateOutline={() => console.log('Generate outline')}
              onImproveTone={handleImprove}
              onCheckPlagiarism={() => console.log('Check plagiarism')}
              onAddCitations={() => setShowCitations(true)}
            />
          </div>
        </div>
      </div>

      {/* Voice Modal */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onInsertText={insertTextAtCursor}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesSelected={handleFilesSelected}
      />

      {/* AI Suggestions Panel (Slide-over) */}
      {showSuggestions && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-lg">AI Suggestions</h3>
            <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          <WritingSuggestionPanel
            suggestions={essay.ai_suggestions}
            onAcceptSuggestion={(id) => {
              const updated = essay.ai_suggestions.filter(s => s.id !== id)
              setEssay({ ...essay, ai_suggestions: updated })
            }}
            onRejectSuggestion={(id) => {
              const updated = essay.ai_suggestions.filter(s => s.id !== id)
              setEssay({ ...essay, ai_suggestions: updated })
            }}
          />
        </div>
      )}

      {/* Citations Panel (Slide-over) */}
      {showCitations && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-lg">Citations</h3>
            <button onClick={() => setShowCitations(false)} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          <CitationManager
            citations={essay.cited_sources}
            citationStyle={essay.citation_style || 'APA'}
            onAddCitation={handleAddCitation}
            onDeleteCitation={handleDeleteCitation}
          />
        </div>
      )}
    </div>
  )
}
