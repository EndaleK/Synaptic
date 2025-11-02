"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileText, BookOpen, AlertCircle } from 'lucide-react'
import WritingEditor from './WritingEditor'
import WritingSuggestionPanel from './WritingSuggestionPanel'
import CitationManager from './CitationManager'
import type { WritingType, CitationStyle, WritingSuggestion, Citation, Essay } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'

interface WritingViewProps {
  essayId?: string
  documentId?: string
}

type ActivePanel = 'suggestions' | 'citations'

export default function WritingView({ essayId, documentId }: WritingViewProps) {
  const { user } = useUser()
  const [essay, setEssay] = useState<Essay | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('suggestions')
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load essay from database
  useEffect(() => {
    if (essayId) {
      loadEssay()
    } else {
      // Create new essay
      createNewEssay()
    }
  }, [essayId])

  const loadEssay = async () => {
    if (!essayId || !user) return

    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get user profile (created by middleware)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!profile || profileError) {
        // Profile should have been created by middleware
        // If it doesn't exist, refresh the page to trigger middleware again
        console.error('User profile not found, refreshing page...', profileError)
        window.location.reload()
        return
      }

      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('id', essayId)
        .eq('user_id', profile.id)
        .single()

      if (error) throw error
      setEssay(data)
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
      const supabase = createClient()

      // Get user profile (created by middleware)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!profile || profileError) {
        // Profile should have been created by middleware
        // If it doesn't exist, refresh the page to trigger middleware again
        console.error('User profile not found, refreshing page...', profileError)
        window.location.reload()
        return
      }

      // Create new essay
      const newEssay: Partial<Essay> = {
        user_id: profile.id,
        document_id: documentId || undefined,
        title: 'Untitled Essay',
        content: '',
        writing_type: 'academic',
        citation_style: 'APA',
        word_count: 0,
        status: 'draft',
        ai_suggestions: [],
        cited_sources: [],
        version_history: []
      }

      const { data, error } = await supabase
        .from('essays')
        .insert(newEssay)
        .select()
        .single()

      if (error) throw error
      setEssay(data)
    } catch (err) {
      console.error('Error creating essay:', err)
      setError(err instanceof Error ? err.message : 'Failed to create essay')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (content: string, title: string) => {
    if (!essay || !user) return

    try {
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
          version_history: [...essay.version_history, newVersion]
        })
        .eq('id', essay.id)

      if (error) throw error

      // Update local state
      setEssay({
        ...essay,
        content,
        title,
        version_history: [...essay.version_history, newVersion]
      })
    } catch (err) {
      console.error('Error saving essay:', err)
      alert('Failed to save essay')
    }
  }

  const handleAnalyze = async (content: string) => {
    if (!essay) return

    try {
      const response = await fetch('/api/writing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          writingType: essay.writing_type,
          citationStyle: essay.citation_style
        })
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const { suggestions } = await response.json()

      // Update essay with suggestions
      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({ ai_suggestions: suggestions })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({ ...essay, ai_suggestions: suggestions })
      setActivePanel('suggestions')
      setIsPanelOpen(true)
    } catch (err) {
      console.error('Error analyzing essay:', err)
      alert('Failed to analyze essay')
    }
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!essay) return

    try {
      const response = await fetch('/api/writing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayId: essay.id,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${essay.title}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting essay:', err)
      alert('Failed to export essay')
    }
  }

  const handleAcceptSuggestion = (suggestionId: string) => {
    if (!essay) return

    // Find the suggestion
    const suggestion = essay.ai_suggestions.find(s => s.id === suggestionId)
    if (!suggestion || !suggestion.replacement) return

    // Apply the suggestion to content
    // This is a simplified version - in production, you'd need proper text manipulation
    console.log('Accepting suggestion:', suggestion)

    // Remove suggestion from list
    const updatedSuggestions = essay.ai_suggestions.filter(s => s.id !== suggestionId)
    setEssay({ ...essay, ai_suggestions: updatedSuggestions })
  }

  const handleAddCitation = async (citation: Omit<Citation, 'id'>) => {
    if (!essay) return

    try {
      const newCitation: Citation = {
        ...citation,
        id: crypto.randomUUID()
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({
          cited_sources: [...essay.cited_sources, newCitation]
        })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({
        ...essay,
        cited_sources: [...essay.cited_sources, newCitation]
      })
    } catch (err) {
      console.error('Error adding citation:', err)
      alert('Failed to add citation')
    }
  }

  const handleDeleteCitation = async (citationId: string) => {
    if (!essay) return

    try {
      const updatedCitations = essay.cited_sources.filter(c => c.id !== citationId)

      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({ cited_sources: updatedCitations })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({ ...essay, cited_sources: updatedCitations })
    } catch (err) {
      console.error('Error deleting citation:', err)
      alert('Failed to delete citation')
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading essay...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Error Loading Essay</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!essay) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Essay not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Main Editor Area */}
      <div className={`flex-1 transition-all duration-300 ${isPanelOpen ? 'mr-96' : 'mr-0'}`}>
        <WritingEditor
          essayId={essay.id}
          initialContent={essay.content}
          initialTitle={essay.title}
          writingType={essay.writing_type}
          citationStyle={essay.citation_style}
          onSave={handleSave}
          onAnalyze={handleAnalyze}
          onExport={handleExport}
          suggestions={essay.ai_suggestions}
        />
      </div>

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ marginTop: '64px' }} // Account for header height
      >
        {/* Panel Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute -left-10 top-4 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-lg shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {isPanelOpen ? (
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Panel Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActivePanel('suggestions')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-colors ${
              activePanel === 'suggestions'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Suggestions
            {essay.ai_suggestions.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                {essay.ai_suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePanel('citations')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-colors ${
              activePanel === 'citations'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Citations
            {essay.cited_sources.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-500 text-white rounded-full text-xs font-bold">
                {essay.cited_sources.length}
              </span>
            )}
          </button>
        </div>

        {/* Panel Content */}
        <div className="h-[calc(100%-49px)] overflow-hidden">
          {activePanel === 'suggestions' ? (
            <WritingSuggestionPanel
              suggestions={essay.ai_suggestions}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={(id) => {
                const updated = essay.ai_suggestions.filter(s => s.id !== id)
                setEssay({ ...essay, ai_suggestions: updated })
              }}
            />
          ) : (
            <CitationManager
              citations={essay.cited_sources}
              citationStyle={essay.citation_style || 'APA'}
              onAddCitation={handleAddCitation}
              onDeleteCitation={handleDeleteCitation}
            />
          )}
        </div>
      </div>
    </div>
  )
}
