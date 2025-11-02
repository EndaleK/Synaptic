"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import WritingEditor from '@/components/WritingEditor'
import CitationManager from '@/components/CitationManager'
import WritingSuggestionPanel from '@/components/WritingSuggestionPanel'
import EssaySidebar from '@/components/EssaySidebar'
import EssayUploader from '@/components/EssayUploader'
import type { WritingType, CitationStyle, WritingSuggestion, Citation, Essay } from '@/lib/supabase/types'
import { BookOpen, Settings, Upload, X } from 'lucide-react'

export default function WriterPage() {
  const [writingType, setWritingType] = useState<WritingType>('academic')
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
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
    setShowUploader(false)
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Essay Sidebar */}
      <EssaySidebar
        currentEssayId={currentEssay?.id}
        onEssaySelect={handleEssaySelect}
        onEssayDelete={handleEssayDelete}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                  AI Writing Assistant
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentEssay ? `Editing: ${currentEssay.title}` : 'Upload or select an essay to begin'}
                  {hasUnsavedChanges && <span className="ml-2 text-orange-500">(Unsaved changes)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:opacity-90 transition-all"
              >
                {showUploader ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {showUploader ? 'Cancel' : 'Upload Essay'}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Upload Panel */}
        {showUploader && (
          <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Upload Essay
            </h3>
            <EssayUploader
              onUploadSuccess={handleUploadSuccess}
              onUploadError={(error) => alert(error)}
            />
          </div>
        )}

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
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
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
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
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

        {/* Main Content Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Editor (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
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

            {/* Right Column: Suggestions & Citations (1/3 width) */}
            <div className="space-y-6">
              {/* Suggestions Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Writing Suggestions
                </h3>
                <WritingSuggestionPanel
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

              {/* Citation Manager */}
              <CitationManager
                citations={citations}
                citationStyle={citationStyle}
                onCitationsChange={setCitations}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
