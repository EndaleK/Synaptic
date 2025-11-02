"use client"

import { useState } from 'react'
import WritingEditor from '@/components/WritingEditor'
import CitationManager from '@/components/CitationManager'
import WritingSuggestionPanel from '@/components/WritingSuggestionPanel'
import type { WritingType, CitationStyle, WritingSuggestion, Citation } from '@/lib/supabase/types'
import { BookOpen, Settings } from 'lucide-react'

export default function WriterPage() {
  const [writingType, setWritingType] = useState<WritingType>('academic')
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [showSettings, setShowSettings] = useState(false)

  const handleSave = async (content: string, title: string) => {
    console.log('Saving essay:', { title, content })
    // TODO: Implement save to Supabase
    alert('Essay saved successfully!')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
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
                Professional academic writing with real-time grammar checking and citations
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-7xl mx-auto mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editor (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <WritingEditor
            writingType={writingType}
            citationStyle={citationStyle}
            onSave={handleSave}
            onAnalyze={handleAnalyze}
            onExport={handleExport}
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

      {/* Quick Tips */}
      <div className="max-w-7xl mx-auto mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Quick Tips:
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li>• <strong>Live Mode:</strong> Toggle the ⚡ button for real-time analysis as you type</li>
          <li>• <strong>Visual Indicators:</strong> Red underlines = grammar/spelling, Blue = structure, Yellow = citations needed</li>
          <li>• <strong>Auto-Citations:</strong> Enter a DOI or URL in the Citation Manager to auto-fill citation details</li>
          <li>• <strong>Click Suggestions:</strong> Click on underlined text to see detailed explanations</li>
        </ul>
      </div>
    </div>
  )
}
