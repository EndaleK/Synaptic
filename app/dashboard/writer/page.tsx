"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import WritingEditor from '@/components/WritingEditor'
import CitationManager from '@/components/CitationManager'
import FloatingSuggestionBadge from '@/components/FloatingSuggestionBadge'
import EssaySidebar from '@/components/EssaySidebar'
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
  const [showSidebar, setShowSidebar] = useState(false)
  const [currentEssay, setCurrentEssay] = useState<Essay | null>(null)
  const [essayContent, setEssayContent] = useState('')
  const [essayTitle, setEssayTitle] = useState('Untitled Essay')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const sidebarRef = useRef<{ onRefresh?: () => void }>(null)
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
    setShowUploader(false)
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
    if (!currentEssay) {
      alert('No essay loaded. Please upload or select an essay first.')
      return
    }

    try {
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-green-900/10">
      {/* Essay Sidebar */}
      <EssaySidebar
        isOpen={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
        currentEssayId={currentEssay?.id}
        onEssaySelect={handleEssaySelect}
        onEssayDelete={handleEssayDelete}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={(error) => alert(error)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Clean & Minimal */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Toggle essay list"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentEssay ? currentEssay.title : 'New Essay'}
                </h1>
                {hasUnsavedChanges && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">Unsaved changes</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                Upload
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Writing Settings
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Writing Type
                </label>
                <select
                  value={writingType}
                  onChange={(e) => setWritingType(e.target.value as WritingType)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="academic">Academic</option>
                  <option value="professional">Professional</option>
                  <option value="creative">Creative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Citation Style
                </label>
                <select
                  value={citationStyle}
                  onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="Harvard">Harvard</option>
                  <option value="IEEE">IEEE</option>
                  <option value="Vancouver">Vancouver</option>
                </select>
              </div>
            </div>
          </div>
        )}

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
