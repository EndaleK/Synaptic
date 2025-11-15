"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileText, BookOpen, AlertCircle, TrendingUp, Lightbulb, X } from 'lucide-react'
import WritingEditor from './WritingEditor'
import WritingSuggestionPanel from './WritingSuggestionPanel'
import CitationManager from './CitationManager'
import WritingStageSelector from './WritingView/WritingStageSelector'
import AIContributionTracker from './WritingView/AIContributionTracker'
import ProgressTracker from './WritingView/ProgressTracker'
import StageSpecificPanel from './WritingView/StageSpecificPanel'
import AccessibilitySettings, { type AccessibilityConfig } from './WritingView/AccessibilitySettings'
import TextToSpeechController from './WritingView/TextToSpeechController'
import OnboardingTutorial from './WritingView/OnboardingTutorial'
import StageTransitionManager from './WritingView/StageTransitionManager'
import { useAccessibilityStyles } from './WritingView/useAccessibilityStyles'
import './WritingView/accessibility.css'
import './WritingView/stage-transitions.css'
import type { WritingType, CitationStyle, WritingSuggestion, Citation, Essay, WritingStage, WritingGoals } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

interface WritingViewProps {
  essayId?: string
  documentId?: string
}

type ActivePanel = 'suggestions' | 'citations' | 'progress' | 'stage-tools'

export default function WritingView({ essayId, documentId }: WritingViewProps) {
  const { user } = useUser()
  const [essay, setEssay] = useState<Essay | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('stage-tools')
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mobile state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Accessibility state
  const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilityConfig>({
    ttsEnabled: false,
    ttsRate: 1.0,
    ttsVoice: '',
    dyslexicFont: false,
    fontSize: 100,
    lineSpacing: 1.5,
    letterSpacing: 0,
    highContrast: false,
    readingGuide: false,
    focusMode: false
  })

  // Stage transition tracking
  const [previousStage, setPreviousStage] = useState<WritingStage | null>(null)

  // Apply accessibility styles
  useAccessibilityStyles(accessibilityConfig)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keyboard navigation - WCAG 2.1 AA
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in editor
      const target = e.target as HTMLElement
      if (target.closest('.ProseMirror') || target.closest('.tiptap')) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+1-4: Switch panels
      if (isMod && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const panels: ActivePanel[] = ['stage-tools', 'progress', 'suggestions', 'citations']
        const index = parseInt(e.key) - 1
        setActivePanel(panels[index])
        if (!isPanelOpen) setIsPanelOpen(true)
      }

      // Cmd/Ctrl+B: Toggle panel
      if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setIsPanelOpen(!isPanelOpen)
      }

      // Escape: Close mobile drawer
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        e.preventDefault()
        setIsMobileDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPanelOpen, isMobileDrawerOpen])

  // Helper function to ensure profile exists (calls API endpoint)
  const ensureProfileExists = async () => {
    const response = await fetch('/api/user/ensure-profile', { method: 'POST' })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create user profile')
    }
    return await response.json()
  }

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

      // Ensure profile exists (creates it server-side if needed)
      await ensureProfileExists()

      const supabase = createClient()

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!profile || profileError) {
        console.error('User profile not found after creation attempt:', profileError)
        throw new Error('Failed to load user profile')
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

      // Ensure profile exists (creates it server-side if needed)
      await ensureProfileExists()

      const supabase = createClient()

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!profile || profileError) {
        console.error('User profile not found after creation attempt:', profileError)
        throw new Error('Failed to load user profile')
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
        writing_stage: 'planning', // Start at planning stage
        ai_contribution_percentage: 0,
        original_word_count: 0,
        ai_assisted_word_count: 0,
        writing_goals: {},
        submission_metadata: {},
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

      // Calculate word counts for AI contribution tracking
      const newWordCount = content.split(/\s+/).filter(w => w.length > 0).length
      const oldWordCount = essay.content.split(/\s+/).filter(w => w.length > 0).length
      const wordCountDiff = newWordCount - oldWordCount

      // Update AI contribution tracking
      // For now, assume manual typing (student's original work)
      // When AI suggestions are accepted, this will be updated separately
      const newOriginalWordCount = essay.original_word_count + Math.max(0, wordCountDiff)

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
          word_count: newWordCount,
          original_word_count: newOriginalWordCount,
          version_history: [...essay.version_history, newVersion]
        })
        .eq('id', essay.id)

      if (error) throw error

      // Update local state
      setEssay({
        ...essay,
        content,
        title,
        word_count: newWordCount,
        original_word_count: newOriginalWordCount,
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

  const handleStageChange = async (newStage: WritingStage) => {
    if (!essay) return

    try {
      // Track previous stage for transition animation
      setPreviousStage(essay.writing_stage)

      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({ writing_stage: newStage })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({ ...essay, writing_stage: newStage })

      // Switch to stage-specific panel when stage changes
      setActivePanel('stage-tools')
    } catch (err) {
      console.error('Error updating stage:', err)
      alert('Failed to update writing stage')
    }
  }

  const handleGoalsUpdate = async (goals: WritingGoals) => {
    if (!essay) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('essays')
        .update({ writing_goals: goals })
        .eq('id', essay.id)

      if (error) throw error

      setEssay({ ...essay, writing_goals: goals })
    } catch (err) {
      console.error('Error updating goals:', err)
      alert('Failed to update writing goals')
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900" role="main" aria-label="Writing workspace">
      {/* Skip to main content link - WCAG 2.1 AA */}
      <a href="#writing-editor" className="skip-to-main">
        Skip to editor
      </a>

      {/* Writing Stage Selector - Desktop */}
      {!isMobile && (
        <nav aria-label="Writing stage navigation" className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" data-onboarding="stage-selector">
          <WritingStageSelector
            currentStage={essay.writing_stage}
            onStageChange={handleStageChange}
            completedStages={[]}
          />
        </nav>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300 accessibility-enabled",
          !isMobile && isPanelOpen ? 'mr-96' : 'mr-0',
          accessibilityConfig.dyslexicFont && 'dyslexic-font'
        )}>
          {/* Text-to-Speech Controller */}
          {accessibilityConfig.ttsEnabled && (
            <div className="px-4 pt-4">
              <TextToSpeechController
                content={essay.content}
                enabled={accessibilityConfig.ttsEnabled}
                rate={accessibilityConfig.ttsRate}
                voiceName={accessibilityConfig.ttsVoice}
              />
            </div>
          )}

          {/* Editor */}
          <div id="writing-editor" className="flex-1 editor-container" role="article" aria-label="Essay editor" data-onboarding="editor">
            <WritingEditor
              essayId={essay.id}
              initialContent={essay.content}
              initialTitle={essay.title}
              writingType={essay.writing_type}
              citationStyle={essay.citation_style}
              writingStage={essay.writing_stage}
              onSave={handleSave}
              onAnalyze={handleAnalyze}
              onExport={handleExport}
              suggestions={essay.ai_suggestions}
            />
          </div>
        </div>

      {/* Side Panel - Desktop Only */}
      {!isMobile && (
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
          <div role="tablist" aria-label="Writing tools" className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              role="tab"
              aria-selected={activePanel === 'stage-tools'}
              aria-controls="panel-stage-tools"
              onClick={() => setActivePanel('stage-tools')}
              data-onboarding="stage-tools-tab"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                activePanel === 'stage-tools'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
              Stage Tools
            </button>

            <button
              role="tab"
              aria-selected={activePanel === 'progress'}
              aria-controls="panel-progress"
              onClick={() => setActivePanel('progress')}
              data-onboarding="progress-tab"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                activePanel === 'progress'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              Progress
            </button>

            <button
              role="tab"
              aria-selected={activePanel === 'suggestions'}
              aria-controls="panel-suggestions"
              onClick={() => setActivePanel('suggestions')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                activePanel === 'suggestions'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              Suggestions
              {essay.ai_suggestions.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold" aria-label={`${essay.ai_suggestions.length} suggestions`}>
                  {essay.ai_suggestions.length}
                </span>
              )}
            </button>

            <button
              role="tab"
              aria-selected={activePanel === 'citations'}
              aria-controls="panel-citations"
              onClick={() => setActivePanel('citations')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                activePanel === 'citations'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Citations
              {essay.cited_sources.length > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-500 text-white rounded-full text-xs font-bold" aria-label={`${essay.cited_sources.length} citations`}>
                  {essay.cited_sources.length}
                </span>
              )}
            </button>
          </div>

        {/* Panel Content */}
        <div className="h-[calc(100%-49px)] overflow-hidden">
          {activePanel === 'stage-tools' && (
            <div id="panel-stage-tools" role="tabpanel" aria-labelledby="tab-stage-tools">
              <StageSpecificPanel
                currentStage={essay.writing_stage}
                essayTopic={essay.title}
                essayContent={essay.content}
                writingType={essay.writing_type}
                targetWordCount={essay.writing_goals?.target_word_count}
                versions={essay.version_history}
                onOutlineGenerated={(outline) => {
                  // Insert outline at cursor position in editor
                  console.log('Outline generated:', outline)
                }}
              />
            </div>
          )}

          {activePanel === 'progress' && (
            <div id="panel-progress" role="tabpanel" aria-labelledby="tab-progress" className="h-full overflow-y-auto p-6 space-y-6">
              <AIContributionTracker
                aiContributionPercentage={essay.ai_contribution_percentage}
                originalWordCount={essay.original_word_count}
                aiAssistedWordCount={essay.ai_assisted_word_count}
                totalWordCount={essay.word_count}
                showDetails={true}
              />

              <ProgressTracker
                writingGoals={essay.writing_goals}
                currentWordCount={essay.word_count}
                currentStreak={0} // TODO: Calculate from writing_sessions
                milestones={[]} // TODO: Load from writing_milestones table
                onGoalsUpdate={handleGoalsUpdate}
              />

              <AccessibilitySettings
                onSettingsChange={setAccessibilityConfig}
              />
            </div>
          )}

          {activePanel === 'suggestions' && (
            <div id="panel-suggestions" role="tabpanel" aria-labelledby="tab-suggestions">
              <WritingSuggestionPanel
                suggestions={essay.ai_suggestions}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={(id) => {
                  const updated = essay.ai_suggestions.filter(s => s.id !== id)
                  setEssay({ ...essay, ai_suggestions: updated })
                }}
              />
            </div>
          )}

          {activePanel === 'citations' && (
            <div id="panel-citations" role="tabpanel" aria-labelledby="tab-citations">
              <CitationManager
                citations={essay.cited_sources}
                citationStyle={essay.citation_style || 'APA'}
                onAddCitation={handleAddCitation}
                onDeleteCitation={handleDeleteCitation}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Mobile Bottom Drawer */}
      {isMobile && (
        <>
          {/* Mobile Floating Action Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all z-40"
          >
            {isMobileDrawerOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Lightbulb className="w-6 h-6" />
            )}
          </button>

          {/* Mobile Drawer Overlay */}
          {isMobileDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
          )}

          {/* Mobile Drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-300 z-50",
              "max-h-[80vh] rounded-t-2xl",
              isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
            )}
          >
            {/* Drawer Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Writing Stage Selector - Mobile */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 pb-2">
              <WritingStageSelector
                currentStage={essay.writing_stage}
                onStageChange={handleStageChange}
                completedStages={[]}
              />
            </div>

            {/* Mobile Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              <button
                onClick={() => setActivePanel('stage-tools')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                  activePanel === 'stage-tools'
                    ? 'text-accent-primary border-b-2 border-accent-primary'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <Lightbulb className="w-4 h-4" />
                Tools
              </button>

              <button
                onClick={() => setActivePanel('progress')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                  activePanel === 'progress'
                    ? 'text-accent-primary border-b-2 border-accent-primary'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Progress
              </button>

              <button
                onClick={() => setActivePanel('suggestions')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                  activePanel === 'suggestions'
                    ? 'text-accent-primary border-b-2 border-accent-primary'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <FileText className="w-4 h-4" />
                AI
                {essay.ai_suggestions.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                    {essay.ai_suggestions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActivePanel('citations')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-medium transition-colors text-sm whitespace-nowrap",
                  activePanel === 'citations'
                    ? 'text-accent-primary border-b-2 border-accent-primary'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <BookOpen className="w-4 h-4" />
                Refs
                {essay.cited_sources.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-gray-500 text-white rounded-full text-xs font-bold">
                    {essay.cited_sources.length}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Panel Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
              {activePanel === 'stage-tools' && (
                <StageSpecificPanel
                  currentStage={essay.writing_stage}
                  essayTopic={essay.title}
                  essayContent={essay.content}
                  writingType={essay.writing_type}
                  targetWordCount={essay.writing_goals?.target_word_count}
                  versions={essay.version_history}
                  onOutlineGenerated={(outline) => {
                    console.log('Outline generated:', outline)
                  }}
                />
              )}

              {activePanel === 'progress' && (
                <div className="p-4 space-y-6">
                  <AIContributionTracker
                    aiContributionPercentage={essay.ai_contribution_percentage}
                    originalWordCount={essay.original_word_count}
                    aiAssistedWordCount={essay.ai_assisted_word_count}
                    totalWordCount={essay.word_count}
                    showDetails={false}
                  />

                  <ProgressTracker
                    writingGoals={essay.writing_goals}
                    currentWordCount={essay.word_count}
                    currentStreak={0}
                    milestones={[]}
                    onGoalsUpdate={handleGoalsUpdate}
                  />

                  <AccessibilitySettings
                    onSettingsChange={setAccessibilityConfig}
                  />
                </div>
              )}

              {activePanel === 'suggestions' && (
                <WritingSuggestionPanel
                  suggestions={essay.ai_suggestions}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={(id) => {
                    const updated = essay.ai_suggestions.filter(s => s.id !== id)
                    setEssay({ ...essay, ai_suggestions: updated })
                  }}
                />
              )}

              {activePanel === 'citations' && (
                <CitationManager
                  citations={essay.cited_sources}
                  citationStyle={essay.citation_style || 'APA'}
                  onAddCitation={handleAddCitation}
                  onDeleteCitation={handleDeleteCitation}
                />
              )}
            </div>
          </div>
        </>
      )}
      </div>

      {/* Onboarding Tutorial */}
      <OnboardingTutorial />

      {/* Stage Transition Manager */}
      {essay && (
        <StageTransitionManager
          previousStage={previousStage}
          currentStage={essay.writing_stage}
        />
      )}
    </div>
  )
}
