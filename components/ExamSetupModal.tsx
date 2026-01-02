"use client"

import { useState, useEffect } from "react"
import { X, Loader2, GraduationCap, Plus, Minus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Document } from "@/lib/supabase/types"
import type { QuestionType, ExamDifficulty } from "@/lib/supabase/types"
import UpgradeModal from "./UpgradeModal"
import PageTopicSelector, { SelectionData } from "./PageTopicSelector"

interface ExamSetupModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document
  onExamCreated?: () => void
}

const difficultyOptions: { value: ExamDifficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Fundamental concepts and recall' },
  { value: 'medium', label: 'Medium', description: 'Application and analysis' },
  { value: 'hard', label: 'Hard', description: 'Synthesis and critical thinking' },
  { value: 'mixed', label: 'Mixed', description: 'Variety of difficulty levels' }
]

const questionTypeOptions: { value: QuestionType; label: string; description: string }[] = [
  { value: 'mcq', label: 'Multiple Choice', description: '4 answer options' },
  { value: 'true_false', label: 'True/False', description: 'Binary questions' },
  { value: 'short_answer', label: 'Short Answer', description: 'Written responses' }
]

export default function ExamSetupModal({
  isOpen,
  onClose,
  document,
  onExamCreated
}: ExamSetupModalProps) {
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState(`${document.file_name} - Practice Exam`)
  const [description, setDescription] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('mixed')
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['mcq', 'true_false', 'short_answer'])
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null)
  const [includeExplanations, setIncludeExplanations] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [selection, setSelection] = useState<SelectionData>({ type: 'full' })

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [usageLimitReached, setUsageLimitReached] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number }>({ used: 0, limit: 3 })

  // Reset form when modal opens with new document
  useEffect(() => {
    if (isOpen) {
      setTitle(`${document.file_name} - Practice Exam`)
      setDescription('')
      setQuestionCount(10)
      setDifficulty('mixed')
      setSelectedQuestionTypes(['mcq', 'true_false', 'short_answer'])
      setTimeLimitMinutes(null)
      setIncludeExplanations(true)
      setTags([])
      setTagInput('')
      setSelection({ type: 'full' })
      setError(null)
      setShowAdvanced(false)
    }
  }, [isOpen, document.file_name])

  const handleQuestionTypeToggle = (type: QuestionType) => {
    if (selectedQuestionTypes.includes(type)) {
      // Must have at least one question type selected
      if (selectedQuestionTypes.length > 1) {
        setSelectedQuestionTypes(prev => prev.filter(t => t !== type))
      }
    } else {
      setSelectedQuestionTypes(prev => [...prev, type])
    }
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const handleGenerate = async () => {
    // Validation
    if (!title.trim()) {
      setError('Please enter an exam title')
      return
    }

    if (questionCount < 1 || questionCount > 200) {
      setError('Question count must be between 1 and 200')
      return
    }

    if (selectedQuestionTypes.length === 0) {
      setError('Please select at least one question type')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const requestBody = {
        document_id: document.id,
        title: title.trim(),
        description: description.trim() || undefined,
        question_count: questionCount,
        difficulty,
        question_types: selectedQuestionTypes,
        time_limit_minutes: timeLimitMinutes,
        include_explanations: includeExplanations,
        tags,
        selection
      }

      console.log('🎓 Generating exam with config:', requestBody)

      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // Parse response with error handling
      let data: any
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Server returned an invalid response. Please try again.')
      }

      if (!response.ok) {
        // Check if it's a usage limit error (403)
        if (response.status === 403 && data.message) {
          setUsageInfo({ used: data.used || 0, limit: data.limit || 3 })
          setUsageLimitReached(true)
          setShowUpgradeModal(true)
          setIsGenerating(false)
          return
        }

        // Check if document is still being processed (202)
        if (response.status === 202) {
          setError(data.details || 'Document is still being processed. Please try again in a few minutes.')
          setIsGenerating(false)
          return
        }

        // Build a helpful error message
        let errorMsg = data.error || 'Failed to generate exam'
        if (data.suggestion) {
          errorMsg += `. ${data.suggestion}`
        } else if (data.details) {
          errorMsg += `: ${data.details}`
        }
        throw new Error(errorMsg)
      }

      console.log('✅ Exam generated successfully!', {
        examId: data.exam.id,
        questionCount: data.questionCount,
        provider: data.aiProvider
      })

      // Trigger refresh of exam list
      if (onExamCreated) {
        onExamCreated()
      }

      // Close modal
      onClose()

      // Small delay to ensure database transaction commits
      await new Promise(resolve => setTimeout(resolve, 500))

      // Navigate to exam interface with exam ID
      router.push(`/dashboard?mode=exam&examId=${data.exam.id}`)

    } catch (err) {
      console.error('Error generating exam:', err)

      let errorMessage = 'Failed to generate exam. Please try again.'

      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()

        if (errMsg.includes('no readable text') || errMsg.includes('no text content')) {
          errorMessage = 'This document has no readable text content. Please upload a text-based document.'
        } else if (errMsg.includes('rate limit')) {
          errorMessage = 'Rate limit reached. Please wait a few moments and try again.'
        } else if (errMsg.includes('timeout')) {
          errorMessage = 'Generation timed out. Try reducing the number of questions.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl border-t border-gray-200 dark:border-gray-800 sm:border border-gray-200 dark:border-gray-800 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white">
                  Create Practice Exam
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {document.file_name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Exam Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Exam Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Biology Chapter 3 - Cell Structure"
              disabled={isGenerating}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this exam covers..."
              rows={2}
              disabled={isGenerating}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
          </div>

          {/* Content Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Content Selection
            </label>
            <PageTopicSelector
              documentId={document.id}
              totalPages={document.metadata?.page_count || 0}
              onSelectionChange={setSelection}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
            />
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Number of Questions
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuestionCount(Math.max(1, questionCount - 5))}
                disabled={isGenerating || questionCount <= 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                min={1}
                max={200}
                disabled={isGenerating}
                className="w-24 text-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={() => setQuestionCount(Math.min(200, questionCount + 5))}
                disabled={isGenerating || questionCount >= 200}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                (1-200 questions)
              </span>
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">
              Difficulty Level
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDifficulty(option.value)}
                  disabled={isGenerating}
                  className={`p-2.5 sm:p-3 border-2 rounded-lg transition-all disabled:opacity-50 active:scale-95 ${
                    difficulty === option.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">
              Question Types
            </label>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {questionTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuestionTypeToggle(option.value)}
                  disabled={isGenerating}
                  className={`p-2.5 sm:p-3 border-2 rounded-lg transition-all disabled:opacity-50 text-left active:scale-95 ${
                    selectedQuestionTypes.includes(option.value)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                        {option.description}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedQuestionTypes.includes(option.value)
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedQuestionTypes.includes(option.value) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
              {/* Time Limit */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Time Limit (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={timeLimitMinutes || ''}
                    onChange={(e) => setTimeLimitMinutes(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No limit"
                    min={1}
                    disabled={isGenerating}
                    className="w-32 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                </div>
              </div>

              {/* Include Explanations */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExplanations}
                    onChange={(e) => setIncludeExplanations(e.target.checked)}
                    disabled={isGenerating}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Include Explanations
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Add detailed explanations for correct answers
                    </div>
                  </div>
                </label>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Tags (Optional)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add a tag..."
                    disabled={isGenerating}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={isGenerating || !tagInput.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          disabled={isGenerating}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Generation Summary */}
          {!isGenerating && !error && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                Ready to generate:
              </p>
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {questionCount} questions • {difficulty} difficulty • {selectedQuestionTypes.map(t =>
                  questionTypeOptions.find(opt => opt.value === t)?.label
                ).join(', ')}
                {timeLimitMinutes ? ` • ${timeLimitMinutes} min limit` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm sm:text-base"
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !title.trim() || selectedQuestionTypes.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm sm:text-base"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  Generate Exam
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="exams"
        used={usageInfo.used}
        limit={usageInfo.limit}
      />
    </div>
  )
}
