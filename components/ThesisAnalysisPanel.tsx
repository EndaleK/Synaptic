"use client"

import { useState } from 'react'
import { X, CheckCircle2, AlertCircle, XCircle, Loader2, TrendingUp, FileText, List } from 'lucide-react'
import type { ThesisAnalysisResponse } from '@/app/api/writing/thesis-analyze/route'

interface ThesisAnalysisPanelProps {
  isOpen: boolean
  onClose: () => void
  essayContent: string
}

export default function ThesisAnalysisPanel({
  isOpen,
  onClose,
  essayContent
}: ThesisAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<ThesisAnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!essayContent || essayContent.trim().length === 0) {
      setError('No content to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/writing/thesis-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: essayContent })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze thesis')
      }

      const data: ThesisAnalysisResponse = await response.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-analyze when panel opens
  useState(() => {
    if (isOpen && !analysis && !isLoading && essayContent) {
      handleAnalyze()
    }
  })

  const getQualityColor = (quality: 'strong' | 'weak' | 'missing') => {
    switch (quality) {
      case 'strong':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'weak':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'missing':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    }
  }

  const getQualityIcon = (quality: 'strong' | 'weak' | 'missing') => {
    switch (quality) {
      case 'strong':
        return <CheckCircle2 className="w-5 h-5" />
      case 'weak':
        return <AlertCircle className="w-5 h-5" />
      case 'missing':
        return <XCircle className="w-5 h-5" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Essay Structure Analysis
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive analysis of your thesis, structure, and argument strength
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Analyzing your essay structure...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 font-medium">
                Error: {error}
              </p>
              <button
                onClick={handleAnalyze}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !isLoading && (
            <div className="space-y-6">
              {/* Thesis Statement Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Thesis Statement
                  </h3>
                </div>

                <div className={`flex items-start gap-3 p-4 rounded-lg mb-4 ${getQualityColor(analysis.thesisQuality)}`}>
                  {getQualityIcon(analysis.thesisQuality)}
                  <div className="flex-1">
                    <p className="font-medium capitalize mb-2">{analysis.thesisQuality} Thesis</p>
                    {analysis.thesisStatement && (
                      <p className="text-sm italic mb-3 border-l-4 border-current pl-3">
                        "{analysis.thesisStatement}"
                      </p>
                    )}
                    <p className="text-sm">{analysis.thesisFeedback}</p>
                  </div>
                </div>

                {/* Thesis Characteristics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg ${analysis.isArgumentative ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Argumentative</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.isArgumentative ? 'Yes' : 'No'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.isSpecific ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Specific</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.isSpecific ? 'Yes' : 'No'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.isClearlyStated ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Clear</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.isClearlyStated ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">Suggestions:</p>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Topic Sentences Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <List className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Topic Sentences
                  </h3>
                </div>

                <div className="space-y-3">
                  {analysis.topicSentences.map((topic, index) => (
                    <div key={index} className={`p-4 rounded-lg ${getQualityColor(topic.quality)}`}>
                      <div className="flex items-start gap-2 mb-2">
                        {getQualityIcon(topic.quality)}
                        <div className="flex-1">
                          <p className="font-medium">Paragraph {topic.paragraph}</p>
                          {topic.sentence && (
                            <p className="text-sm italic mt-1">"{topic.sentence}"</p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm ml-7">{topic.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Structure Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Overall Structure
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className={`p-3 rounded-lg ${analysis.overallStructure.hasIntroduction ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Introduction</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.overallStructure.hasIntroduction ? 'Present' : 'Missing'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.overallStructure.hasBody ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Body</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.overallStructure.hasBody ? 'Present' : 'Missing'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.overallStructure.hasConclusion ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Conclusion</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.overallStructure.hasConclusion ? 'Present' : 'Missing'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Paragraphs</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.overallStructure.paragraphCount}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {analysis.overallStructure.feedback}
                </p>
              </div>

              {/* Argument Strength Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Argument Strength
                  </h3>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Score</span>
                    <span className={`text-3xl font-bold ${getScoreColor(analysis.argumentStrength.score)}`}>
                      {analysis.argumentStrength.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        analysis.argumentStrength.score >= 80
                          ? 'bg-green-500'
                          : analysis.argumentStrength.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${analysis.argumentStrength.score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className={`p-3 rounded-lg ${analysis.argumentStrength.hasEvidence ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Evidence</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.argumentStrength.hasEvidence ? 'Present' : 'Missing'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.argumentStrength.hasCounterarguments ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Counter-args</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.argumentStrength.hasCounterarguments ? 'Present' : 'Missing'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${analysis.argumentStrength.hasAnalysis ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Analysis</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{analysis.argumentStrength.hasAnalysis ? 'Present' : 'Missing'}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {analysis.argumentStrength.feedback}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!analysis && !isLoading && !error && (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Click "Analyze Structure" to get comprehensive feedback
                </p>
                <button
                  onClick={handleAnalyze}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:opacity-90 transition-all"
                >
                  Analyze Structure
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
