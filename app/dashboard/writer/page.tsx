"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import WritingEditor from '@/components/WritingEditor'
import CitationManager from '@/components/CitationManager'
import FloatingSuggestionBadge from '@/components/FloatingSuggestionBadge'
import EssaySidebar, { type EssaySidebarRef } from '@/components/EssaySidebar'
import UploadModal from '@/components/UploadModal'
import type { WritingType, CitationStyle, WritingSuggestion, Citation, Essay } from '@/lib/supabase/types'
import { Menu, Settings } from 'lucide-react'

export default function WriterPage() {
  const [writingType, setWritingType] = useState<WritingType>('academic')
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true) // Open by default on desktop
  const [currentEssay, setCurrentEssay] = useState<Essay | null>(null)
  const [essayContent, setEssayContent] = useState('')
  const [essayTitle, setEssayTitle] = useState('Untitled Essay')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const sidebarRef = useRef<EssaySidebarRef>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save every 2 minutes
  useEffect(() => {
    if (hasUnsavedChanges && currentEssay) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(essayContent, essayTitle)
      }, 120000) // 2 minutes
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasUnsavedChanges, currentEssay, essayContent, essayTitle])

  const handleEssaySelect = useCallback((essay: Essay) => {
    setCurrentEssay(essay)
    setEssayContent(essay.content)
    setEssayTitle(essay.title)
    setWritingType(essay.writing_type || 'academic')
    setCitationStyle(essay.citation_style || 'APA')
    setHasUnsavedChanges(false)
    setShowUploadModal(false)
  }, [])

  const handleUploadSuccess = useCallback((essayId: string, title: string, content: string) => {
    // Create essay object from upload
    const uploadedEssay: Essay = {
      id: essayId,
      user_id: '', // Will be populated from DB
      title,
      content,
      word_count: 0,
      writing_type: 'academic',
      citation_style: 'APA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setCurrentEssay(uploadedEssay)
    setEssayContent(content)
    setEssayTitle(title)
    setShowUploadModal(false)
    setHasUnsavedChanges(false)

    // Refresh sidebar to show new essay
    sidebarRef.current?.onRefresh?.()
  }, [])

  const handleContentChange = useCallback((content: string, title: string) => {
    setEssayContent(content)
    setEssayTitle(title)
    setHasUnsavedChanges(true)
  }, [])

  const handleSave = async (content: string, title: string) => {
    try {
      // If no current essay, create a new one
      if (!currentEssay) {
        const response = await fetch('/api/essays/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            writingType,
            citationStyle
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create essay')
        }

        const data = await response.json()

        // Set the newly created essay as current
        setCurrentEssay(data.essay)
        setHasUnsavedChanges(false)

        // Refresh sidebar to show new essay
        sidebarRef.current?.onRefresh?.()

        alert(`Essay created successfully!`)
      } else {
        // Update existing essay
        const response = await fetch('/api/essays/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essayId: currentEssay.id,
            title,
            content,
            writingType,
            citationStyle
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save essay')
        }

        const data = await response.json()

        setHasUnsavedChanges(false)
        alert(`Essay saved successfully! (Version ${data.versionNumber})`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save essay. Please try again.')
    }
  }

  const handleAnalyze = async (content: string) => {
    console.log('Analyzing content:', content)
    // The WritingEditor already handles analysis via real-time hook
    // This is for manual analysis button
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    console.log('Exporting as:', format)
    // TODO: Implement export functionality
    alert(`Export as ${format.toUpperCase()} coming soon!`)
  }

  const handleEssayDelete = useCallback((essayId: string) => {
    if (currentEssay?.id === essayId) {
      setCurrentEssay(null)
      setEssayContent('')
      setEssayTitle('Untitled Essay')
      setHasUnsavedChanges(false)
    }
  }, [currentEssay])

  const handleNewEssay = useCallback(async () => {
    // Create a new essay in the database immediately
    try {
      const response = await fetch('/api/essays/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Essay',
          content: '',
          writingType: 'academic',
          citationStyle: 'APA'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create new essay')
      }

      const data = await response.json()

      // Set the newly created essay as current
      setCurrentEssay(data.essay)
      setEssayContent('')
      setEssayTitle('Untitled Essay')
      setHasUnsavedChanges(false)
      setWritingType('academic')
      setCitationStyle('APA')

      // Refresh sidebar to show new essay
      sidebarRef.current?.onRefresh?.()
    } catch (error) {
      console.error('Error creating new essay:', error)
      alert('Failed to create new essay. Please try again.')
    }
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-green-900/10">
      {/* Essay Sidebar - Always rendered, responsive positioning */}
      <EssaySidebar
        ref={sidebarRef}
        isOpen={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
        currentEssayId={currentEssay?.id}
        onEssaySelect={handleEssaySelect}
        onEssayDelete={handleEssayDelete}
        onNewEssay={handleNewEssay}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={(error) => alert(error)}
      />

      {/* Main Content - Adjusts with sidebar on desktop */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header - Clean & Minimal */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                title="Toggle document list"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <input
                  type="text"
                  value={essayTitle}
                  onChange={(e) => {
                    setEssayTitle(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full max-w-md"
                  placeholder="Untitled Essay"
                />
                {hasUnsavedChanges && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">Unsaved changes</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Writing Type & Citation Style Inline */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={writingType}
                  onChange={(e) => setWritingType(e.target.value as WritingType)}
                  className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium border-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="academic">Academic</option>
                  <option value="professional">Professional</option>
                  <option value="creative">Creative</option>
                </select>

                <select
                  value={citationStyle}
                  onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                  className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium border-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="Harvard">Harvard</option>
                  <option value="IEEE">IEEE</option>
                  <option value="Vancouver">Vancouver</option>
                </select>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>


        {/* Main Content - Distraction-Free Editor */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <WritingEditor
              initialContent={essayContent}
              initialTitle={essayTitle}
              writingType={writingType}
              citationStyle={citationStyle}
              onSave={handleSave}
              onAnalyze={handleAnalyze}
              onExport={handleExport}
              onContentChange={handleContentChange}
              suggestions={suggestions}
            />
          </div>
        </div>

        {/* Floating Suggestion Badge (Grammarly-style) */}
        <FloatingSuggestionBadge
          suggestions={suggestions}
          onApplySuggestion={(suggestion) => {
            console.log('Applying suggestion:', suggestion)
            // TODO: Implement suggestion application
          }}
          onDismissSuggestion={(suggestionId) => {
            setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
          }}
        />
      </div>
    </div>
  )
}
