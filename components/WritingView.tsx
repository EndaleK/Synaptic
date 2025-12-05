"use client"

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import { createClient } from '@/lib/supabase/client'
import { parseDocument } from '@/lib/client-document-parser'
import { useToast } from '@/components/ToastContainer'

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
  const toast = useToast()
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
  const [isEditorReady, setIsEditorReady] = useState(false)

  // 📊 Study session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // TipTap Editor
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "Begin writing here..."
      }),
      CharacterCount
    ],
    content: essay?.content || '',
    onCreate: ({ editor }) => {
      console.log('✅ TipTap editor created and ready')
      setIsEditorReady(true)
    },
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
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] text-gray-800 dark:text-gray-200 leading-relaxed font-serif',
        style: 'line-height: 1.8; font-size: 16px;',
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

  // Load essay if ID is provided, otherwise show empty state
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
      // No essayId provided - show empty state, don't auto-create
      setIsLoading(false)
    }
  }, [essayId, user, isLoaded])

  // Update editor content when essay loads
  useEffect(() => {
    if (essay && editor && editor.getHTML() !== essay.content) {
      editor.commands.setContent(essay.content)
    }
  }, [essay?.content, editor])

  // 📊 STATISTICS: Start study session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: documentId,
            sessionType: 'writing',
            plannedDurationMinutes: 60 // Default estimate for writing session (longer than other modes)
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.sessionId)
          sessionStartTime.current = new Date()
          console.log('[WritingView] Study session started:', data.sessionId)
        }
      } catch (error) {
        console.error('[WritingView] Failed to start study session:', error)
      }
    }

    startSession()
  }, [documentId])

  // 📊 STATISTICS: Complete study session when component unmounts
  useEffect(() => {
    return () => {
      // Complete session on unmount using fetch with keepalive
      if (sessionId && sessionStartTime.current) {
        const durationMinutes = Math.round((Date.now() - sessionStartTime.current.getTime()) / 60000)

        // Only record if session lasted at least 1 minute
        if (durationMinutes >= 1) {
          // Use fetch with keepalive: works during page unload and sets proper Content-Type header
          fetch('/api/study-sessions/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              durationMinutes
            }),
            keepalive: true // Ensures request completes even during page unload
          }).then(response => {
            if (response.ok) {
              console.log('[WritingView] Study session completed:', durationMinutes, 'minutes')
            } else {
              console.warn('[WritingView] Failed to complete study session:', response.status)
            }
          }).catch(error => {
            console.error('[WritingView] Error completing study session:', error)
          })
        }
      }
    }
  }, [sessionId])

  const loadEssay = async () => {
    if (!essayId || !user) return

    try {
      setIsLoading(true)

      // Call API to fetch essay (bypasses RLS with service role)
      const response = await fetch(`/api/essays/${essayId}`)

      if (!response.ok) {
        if (response.status === 404) {
          // Essay was deleted or doesn't exist - redirect to fresh writer page
          console.log('Essay not found, redirecting to create new essay')
          window.location.href = '/dashboard/writer'
          return
        }
        const error = await response.json()
        console.error('API error loading essay:', error)
        throw new Error(error.error || 'Failed to load essay')
      }

      const { essay } = await response.json()

      if (!essay) throw new Error('No essay data returned from API')

      setEssay(essay)
      setCitationStyle(essay.citation_style || 'APA')
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

  const handleDeleteEssay = async (deletedEssayId: string) => {
    // When the active essay is deleted, redirect to fresh writer page (no essay)
    if (deletedEssayId === essay?.id) {
      window.location.href = '/dashboard/writer'
    }
  }

  const handleSave = async () => {
    if (!essay || !user || !editor) return

    try {
      setIsSaving(true)
      const content = editor.getHTML()
      const title = essay.title
      const wordCount = editor.storage.characterCount.words()

      // Call API to update essay (bypasses RLS with service role)
      const response = await fetch(`/api/essays/${essay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title,
          word_count: wordCount
        })
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response:', response.status, response.statusText)
        const text = await response.text()
        console.error('Response text:', text.substring(0, 200))
        throw new Error(`API endpoint returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!response.ok) {
        console.error('API error saving essay:', data)
        throw new Error(data.error || 'Failed to save essay')
      }

      setEssay(data.essay)
      toast.success('Essay saved successfully')
    } catch (err) {
      console.error('Error saving essay:', err)
      toast.error('Failed to save essay: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
      toast.error('Failed to export essay')
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
      toast.error('Failed to analyze essay')
    }
  }

  const handleImprove = async () => {
    if (!essay || !editor) return

    try {
      const selection = editor.state.selection
      const selectedText = editor.state.doc.textBetween(selection.from, selection.to)

      if (!selectedText) {
        toast.warning('Please select some text to improve')
        return
      }

      // Map writingTone to API style parameter
      const styleMap: Record<string, string> = {
        'academic': 'academic',
        'casual': 'simplified',
        'professional': 'professional',
        'creative': 'expanded'
      }

      const response = await fetch('/api/writing/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          style: styleMap[writingTone] || 'academic',
          numVariations: 1
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Improvement failed')
      }

      const { variations } = await response.json()

      if (variations && variations.length > 0) {
        // Replace selected text with the first variation
        editor.chain().focus().deleteSelection().insertContent(variations[0]).run()
        toast.success('Text improved successfully')
      } else {
        throw new Error('No improved text returned')
      }
    } catch (err) {
      console.error('Error improving text:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to improve text')
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
    console.log('📝 insertTextAtCursor called with text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))

    if (!editor) {
      console.error('❌ Editor is null or undefined!')
      toast.warning('Editor not ready. Please wait a moment and try again.')
      return
    }

    console.log('✅ Editor exists, attempting insertion...')

    try {
      const success = editor.chain().focus().insertContent(text).run()

      if (success) {
        console.log('✅ Text inserted successfully into editor')
      } else {
        console.error('❌ Editor.run() returned false - insertion failed')
        toast.error('Failed to insert text. Please try clicking in the editor first.')
      }
    } catch (error) {
      console.error('❌ Error inserting text:', error)
      toast.error('Error inserting text: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    const templates: Record<string, { title: string; content: string }> = {
      '5-paragraph': {
        title: '5-Paragraph Essay',
        content: `<h2>Introduction</h2>
<p>Begin with a hook that grabs the reader's attention. Provide background information on your topic and clearly state your thesis statement.</p>
<p><strong>Thesis Statement:</strong> [Your main argument goes here]</p>

<h2>Body Paragraph 1</h2>
<p><strong>Topic Sentence:</strong> [First supporting point]</p>
<p>Provide evidence, examples, and analysis to support your first main point. Use specific details and explain how they relate to your thesis.</p>

<h2>Body Paragraph 2</h2>
<p><strong>Topic Sentence:</strong> [Second supporting point]</p>
<p>Present your second piece of evidence with thorough analysis. Connect this point back to your thesis statement.</p>

<h2>Body Paragraph 3</h2>
<p><strong>Topic Sentence:</strong> [Third supporting point]</p>
<p>Develop your final supporting argument with concrete examples and detailed explanation.</p>

<h2>Conclusion</h2>
<p>Restate your thesis in a new way. Summarize your main points and leave the reader with a final thought or call to action.</p>`
      },
      'research': {
        title: 'Research Paper',
        content: `<h1>Research Paper Title</h1>
<p><em>Your Name</em></p>
<p><em>Course Name and Number</em></p>
<p><em>Date</em></p>

<h2>Abstract</h2>
<p>A brief summary (150-250 words) of your research question, methodology, key findings, and conclusions.</p>

<h2>Introduction</h2>
<p>Present your research question or problem statement. Provide context and background information. State your thesis or research objective clearly.</p>

<h2>Literature Review</h2>
<p>Summarize and analyze existing research on your topic. Identify gaps in current knowledge that your research will address.</p>

<h2>Methodology</h2>
<p>Describe your research methods, data collection processes, and analytical approaches. Explain why these methods are appropriate for your research question.</p>

<h2>Results</h2>
<p>Present your findings objectively. Use tables, figures, and charts where appropriate. Organize results logically.</p>

<h2>Discussion</h2>
<p>Interpret your results and explain their significance. Compare your findings with existing research. Address limitations of your study.</p>

<h2>Conclusion</h2>
<p>Summarize your key findings. Discuss implications for the field. Suggest directions for future research.</p>

<h2>References</h2>
<p>[Your citations in APA, MLA, or Chicago format]</p>`
      },
      'book-review': {
        title: 'Book Review',
        content: `<h1>[Book Title] by [Author Name]</h1>

<h2>Introduction</h2>
<p><strong>Book Details:</strong></p>
<ul>
<li>Author: [Author name]</li>
<li>Publisher: [Publisher name]</li>
<li>Year: [Publication year]</li>
<li>Pages: [Number of pages]</li>
<li>Genre: [Fiction/Non-fiction, specific category]</li>
</ul>
<p>Brief overview of the book's premise and your initial impressions.</p>

<h2>Summary</h2>
<p>Provide a concise summary of the book's main plot points or arguments. Avoid spoilers for major plot twists. Focus on the central themes and key ideas.</p>

<h2>Analysis</h2>
<h3>Strengths</h3>
<p>What did the author do well? Consider writing style, character development, argumentation, research quality, etc.</p>

<h3>Weaknesses</h3>
<p>What could have been improved? Were there gaps in logic, underdeveloped characters, or unclear arguments?</p>

<h3>Themes and Significance</h3>
<p>Discuss the major themes and their relevance. How does this book contribute to its genre or field?</p>

<h2>Personal Reflection</h2>
<p>Share your personal response to the book. What impact did it have on you? Who would you recommend it to?</p>

<h2>Conclusion</h2>
<p>Final assessment and recommendation. Rate the book (if applicable) and summarize your overall opinion.</p>`
      },
      'argumentative': {
        title: 'Argumentative Essay',
        content: `<h2>Introduction</h2>
<p>Present the controversial issue or debate. Provide necessary background information. Clearly state your position with a strong thesis statement.</p>
<p><strong>Thesis:</strong> [Your clear position on the issue]</p>

<h2>Background and Context</h2>
<p>Explain the history or context of the issue. Define key terms. Establish why this topic matters and why readers should care.</p>

<h2>Argument 1: [First Supporting Point]</h2>
<p><strong>Claim:</strong> [State your point clearly]</p>
<p><strong>Evidence:</strong> [Statistics, expert opinions, research findings]</p>
<p><strong>Analysis:</strong> [Explain how this evidence supports your thesis]</p>

<h2>Argument 2: [Second Supporting Point]</h2>
<p><strong>Claim:</strong> [State your point clearly]</p>
<p><strong>Evidence:</strong> [Statistics, expert opinions, research findings]</p>
<p><strong>Analysis:</strong> [Explain how this evidence supports your thesis]</p>

<h2>Argument 3: [Third Supporting Point]</h2>
<p><strong>Claim:</strong> [State your point clearly]</p>
<p><strong>Evidence:</strong> [Statistics, expert opinions, research findings]</p>
<p><strong>Analysis:</strong> [Explain how this evidence supports your thesis]</p>

<h2>Counterargument and Rebuttal</h2>
<p><strong>Opposing View:</strong> [Present the strongest counterargument fairly]</p>
<p><strong>Rebuttal:</strong> [Refute the counterargument with evidence and logic]</p>

<h2>Conclusion</h2>
<p>Restate your thesis powerfully. Summarize your strongest arguments. End with a call to action or thought-provoking statement.</p>`
      }
    }

    const template = templates[templateId]
    if (!template) return

    // If no essay exists, create one with the template
    if (!essay) {
      if (!user) return

      try {
        setIsLoading(true)

        const response = await fetch('/api/essays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: template.title,
            content: template.content,
            writing_type: 'academic',
            citation_style: 'APA',
            word_count: 0,
            status: 'draft',
            document_id: documentId || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create essay with template')
        }

        const { essay: newEssay } = await response.json()
        if (newEssay) {
          // Redirect to the new essay
          window.location.href = `/dashboard/writer?essayId=${newEssay.id}`
        }
      } catch (err) {
        console.error('Error creating essay with template:', err)
        toast.error('Failed to create essay with template')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Essay exists - apply template to current essay
    if (!editor) return

    // Confirm before replacing content if there's existing text
    const currentContent = editor.getText().trim()
    if (currentContent && currentContent !== '') {
      if (!confirm('Applying a template will replace your current content. Continue?')) {
        return
      }
    }

    // Apply template
    editor.commands.setContent(template.content)
    setEssay({ ...essay, title: template.title })
  }

  const handleFilesSelected = async (files: File[]) => {
    if (!editor || !essay) return

    // Confirm before replacing content if there's existing text
    const currentContent = editor.getText().trim()
    if (currentContent && currentContent !== '') {
      if (!confirm('Importing a document will replace your current content. Continue?')) {
        return
      }
    }

    try {
      // Process only the first file for now
      const file = files[0]
      if (!file) return

      // Use the existing parseDocument utility
      const result = await parseDocument(file)

      if (result.error) {
        toast.error(`Failed to parse file: ${result.error}`)
        return
      }

      if (result.html || result.text) {
        // Use HTML if available (preserves structure from DOCX), otherwise convert plain text
        let htmlContent: string
        if (result.html) {
          // Use the structured HTML from mammoth (preserves headings, bold, italic, lists)
          htmlContent = result.html
          console.log('Using structured HTML from document')
        } else {
          // Fallback: Convert plain text to HTML paragraphs
          htmlContent = result.text
            .split('\n\n')
            .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
            .join('')
          console.log('Using converted plain text')
        }

        // Insert into editor
        editor.commands.setContent(htmlContent)

        // Update essay title to file name (remove extension)
        const fileName = file.name.replace(/\.[^/.]+$/, '')
        const newTitle = essay.title === 'Untitled Essay' ? fileName : essay.title

        // Add to uploaded files list for tracking
        const newFile: UploadedFile = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: file.size,
          type: file.type
        }
        setUploadedFiles(prev => [...prev, newFile])

        // Auto-save the imported document
        try {
          setIsSaving(true)
          const wordCount = editor.storage.characterCount.words()

          const saveResponse = await fetch(`/api/essays/${essay.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: htmlContent,
              title: newTitle,
              word_count: wordCount
            })
          })

          if (saveResponse.ok) {
            const { essay: savedEssay } = await saveResponse.json()
            setEssay(savedEssay)
            toast.success('Document imported and saved')
          } else {
            // Update local state even if save failed
            setEssay({ ...essay, title: newTitle, content: htmlContent })
            toast.success('Document imported (save pending)')
          }
        } catch (saveError) {
          console.error('Auto-save error:', saveError)
          setEssay({ ...essay, title: newTitle, content: htmlContent })
          toast.success('Document imported (save pending)')
        } finally {
          setIsSaving(false)
        }
      }
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Failed to extract text from the file. Please try a different file.')
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleVoiceClick = () => {
    if (!isEditorReady) {
      toast.warning('Please wait for the editor to load before using voice dictation.')
      return
    }
    console.log('🎤 Opening voice modal - editor is ready')
    setShowVoiceModal(true)
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

  // Empty state - no essay loaded, show welcome screen with sidebar
  if (!essay) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* Minimal Header for empty state */}
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Writing Assistant</h1>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Document Sidebar - Shows recent docs and templates */}
          <div className="hidden lg:block">
            <DocumentSidebar
              onSelectEssay={(id) => window.location.href = `/dashboard/writer?essayId=${id}`}
              onNewEssay={createNewEssay}
              onSelectTemplate={handleSelectTemplate}
            />
          </div>

          {/* Empty State Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Start Writing
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Create a new document or select a recent one from the sidebar to begin writing.
              </p>
              <button
                onClick={createNewEssay}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Document
              </button>

              {/* Mobile-only: Show templates */}
              <div className="lg:hidden mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                  Or start with a template
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "5-paragraph", name: "5-Paragraph Essay", icon: "📄" },
                    { id: "research", name: "Research Paper", icon: "📊" },
                    { id: "book-review", name: "Book Review", icon: "📖" },
                    { id: "argumentative", name: "Argumentative", icon: "💡" }
                  ].map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      <span>{template.icon}</span>
                      <span className="truncate">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <ModernWritingHeader
        onSave={handleSave}
        onExport={handleExport}
        onShare={() => console.log('Share clicked')}
        onUpload={() => setShowUploadModal(true)}
        isSaving={isSaving}
        showResearch={false}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Document Sidebar - Hidden on mobile, shown on large screens */}
        <div className="hidden lg:block">
          <DocumentSidebar
            activeEssayId={essay.id}
            onSelectEssay={(id) => window.location.href = `/dashboard/writer?essayId=${id}`}
            onNewEssay={createNewEssay}
            onSelectTemplate={handleSelectTemplate}
            onDeleteEssay={handleDeleteEssay}
          />
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Modern Toolbar */}
          <ModernToolbar
            editor={editor}
            onVoiceClick={handleVoiceClick}
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

          {/* Editor + Side Panel - Responsive layout */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Editor Content with Paper Background */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-3 sm:p-6 lg:p-8">
              <div className="max-w-4xl mx-auto">
                {/* Paper Sheet Container */}
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg overflow-hidden min-h-[calc(100vh-10rem)] relative">
                  {/* Paper Texture Overlay */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
                       style={{
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
                       }}
                  />

                  {/* Top Margin Line (like ruled paper) - Hidden on mobile */}
                  <div className="hidden md:block absolute top-24 left-0 right-0 h-px bg-red-200 dark:bg-red-900/30 opacity-20" />

                  {/* Left Margin Line - Hidden on mobile */}
                  <div className="hidden md:block absolute top-0 bottom-0 left-20 w-px bg-red-200 dark:bg-red-900/30 opacity-20" />

                  {/* Content Area - Reduced padding on mobile */}
                  <div className="relative px-2 sm:px-8 md:px-12 lg:px-24 py-4 sm:py-12 lg:py-16">
                    {/* Title Input */}
                    <input
                      type="text"
                      value={essay.title}
                      onChange={(e) => setEssay({ ...essay, title: e.target.value })}
                      className="w-full text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8 bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 font-serif"
                      placeholder="Untitled Essay"
                      style={{ letterSpacing: '0.01em' }}
                    />

                    {/* TipTap Editor with Paper Styling */}
                    <div className="tiptap-editor prose-sm sm:prose lg:prose-lg">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* Bottom Shadow (paper curl effect) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-gray-200/50 dark:from-gray-900/50 to-transparent" />
                </div>
              </div>
            </div>

            {/* Writing Side Panel - Hidden on mobile and tablets, shown on xl screens */}
            <div className="hidden xl:block">
              <WritingSidePanel
                wordCount={editor?.storage.characterCount.words() || 0}
                characterCount={editor?.storage.characterCount.characters() || 0}
                goalWordCount={essay.writing_goals?.target_word_count || 2000}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
                onGenerateOutline={() => console.log('Generate outline')}
                onImproveTone={handleImprove}
                onAddCitations={() => setShowCitations(true)}
              />
            </div>
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

      {/* AI Suggestions Panel (Slide-over) - Responsive width */}
      {showSuggestions && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-base sm:text-lg">AI Suggestions</h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl px-2"
              aria-label="Close"
            >
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

      {/* Citations Panel (Slide-over) - Responsive width */}
      {showCitations && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-base sm:text-lg">Citations</h3>
            <button
              onClick={() => setShowCitations(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl px-2"
              aria-label="Close"
            >
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
