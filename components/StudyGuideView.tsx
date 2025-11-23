"use client"

import { useState, useEffect } from "react"
import { BookOpen, Loader2, AlertCircle, Download, FileText, Trash2, Calendar, Target, BookMarked, Sparkles } from "lucide-react"
import { useToast } from "./ToastContainer"
import { useRouter } from "next/navigation"
import type { StudyDuration, DifficultyLevel } from "@/lib/study-guide-generator"

interface StudyGuideViewProps {
  documentId: string
  documentName: string
}

interface StudyGuideData {
  id: string
  title: string
  pdfUrl: string
  pdfSize: number
  studyDuration: string
  difficultyLevel: string
  conceptCount: number
  questionCount: number
  created_at: string
}

export default function StudyGuideView({ documentId, documentName }: StudyGuideViewProps) {
  const toast = useToast()
  const router = useRouter()

  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [studyGuides, setStudyGuides] = useState<StudyGuideData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')

  // Setup modal state
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [studyDuration, setStudyDuration] = useState<StudyDuration>('2weeks')
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('intermediate')
  const [customInstructions, setCustomInstructions] = useState('')

  // Fetch existing study guides
  useEffect(() => {
    const fetchStudyGuides = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/study-guides')

        if (!response.ok) {
          // Handle different HTTP error codes
          if (response.status === 401) {
            setError('You must be logged in to view study guides')
            return
          } else if (response.status === 404) {
            setError('Study guides feature not found. Please contact support.')
            return
          } else if (response.status === 500) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Server error fetching study guides:', errorData)

            // Check if it's a database table error
            if (errorData.error?.includes('relation') || errorData.error?.includes('table')) {
              setError('Database setup incomplete. Please run the study_guides migration.')
              console.error('💡 Run migration: supabase/migrations/20251122_create_study_guides_table.sql')
            } else {
              setError(`Server error: ${errorData.error || 'Failed to fetch study guides'}`)
            }
            return
          } else {
            setError(`Failed to load study guides (Error ${response.status})`)
            return
          }
        }

        const data = await response.json()
        const filtered = data.studyGuides.filter((sg: any) => sg.document_id === documentId)
        setStudyGuides(filtered.map((sg: any) => ({
          id: sg.id,
          title: sg.title,
          pdfUrl: sg.pdf_url,
          pdfSize: sg.pdf_size,
          studyDuration: sg.study_duration,
          difficultyLevel: sg.difficulty_level,
          conceptCount: sg.content.keyConcepts?.length || 0,
          questionCount: (sg.content.practiceQuestions?.multipleChoice?.length || 0) +
            (sg.content.practiceQuestions?.shortAnswer?.length || 0) +
            (sg.content.practiceQuestions?.essay?.length || 0),
          created_at: sg.created_at
        })))
      } catch (err) {
        console.error('Failed to fetch study guides:', err)
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(`Error loading study guides: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudyGuides()
  }, [documentId])

  const handleGenerate = async () => {
    if (!documentId) {
      toast.error("No document selected")
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setProgressMessage('')
    setShowSetupModal(false)

    try {
      const eventSource = new EventSource(
        '/api/generate-study-guide?' +
        new URLSearchParams({
          documentId,
          studyDuration,
          difficultyLevel,
          customInstructions: customInstructions || ''
        })
      )

      eventSource.addEventListener('message', (e) => {
        const data = JSON.parse(e.data)

        if (data.type === 'progress') {
          setProgress(data.progress)
          setProgressMessage(data.message)
        } else if (data.type === 'complete') {
          const newGuide: StudyGuideData = {
            id: data.data.id,
            title: data.data.title,
            pdfUrl: data.data.pdfUrl,
            pdfSize: data.data.pdfSize,
            studyDuration,
            difficultyLevel,
            conceptCount: data.data.conceptCount,
            questionCount: data.data.questionCount,
            created_at: new Date().toISOString()
          }

          setStudyGuides(prev => [newGuide, ...prev])
          setProgress(100)
          setProgressMessage('Study guide generated successfully!')

          toast.success('Study guide generated! Click to download PDF.')

          eventSource.close()

          setTimeout(() => {
            setIsGenerating(false)
            setProgress(0)
            setProgressMessage('')
          }, 2000)
        } else if (data.type === 'error') {
          setError(data.error)
          setIsGenerating(false)
          toast.error(`Generation failed: ${data.error}`)
          eventSource.close()
        }
      })

      eventSource.addEventListener('error', () => {
        setError('Connection lost. Please try again.')
        setIsGenerating(false)
        toast.error('Generation failed. Please try again.')
        eventSource.close()
      })

    } catch (err) {
      console.error('Study guide generation error:', err)
      setError(err instanceof Error ? err.message : 'Generation failed')
      setIsGenerating(false)
      toast.error('Failed to generate study guide')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study guide?')) {
      return
    }

    try {
      const response = await fetch(`/api/study-guides/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setStudyGuides(prev => prev.filter(sg => sg.id !== id))
        toast.success('Study guide deleted')
      } else {
        toast.error('Failed to delete study guide')
      }
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete study guide')
    }
  }

  const formatDuration = (duration: string) => {
    const map: Record<string, string> = {
      '1week': '1 Week',
      '2weeks': '2 Weeks',
      '1month': '1 Month',
      '3months': '3 Months',
      'semester': 'Semester',
      'year': 'Year',
      'custom': 'Custom'
    }
    return map[duration] || duration
  }

  const formatDifficulty = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-accent-primary" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Study Guides
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Generate comprehensive study guides with practice questions, key concepts, and study schedules
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => setShowSetupModal(true)}
        disabled={isGenerating}
        className="w-full mb-6 bg-gradient-to-r from-accent-primary to-accent-secondary text-white py-4 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Study Guide
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progressMessage}
            </span>
            <span className="text-sm font-medium text-accent-primary">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-accent-primary to-accent-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Study Guides List */}
      {studyGuides.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No study guides yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Generate your first study guide to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {studyGuides.map((guide) => (
            <div
              key={guide.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-accent-primary dark:hover:border-accent-primary transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {guide.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDuration(guide.studyDuration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {formatDifficulty(guide.difficultyLevel)}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookMarked className="w-4 h-4" />
                      {guide.conceptCount} concepts, {guide.questionCount} questions
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={guide.pdfUrl}
                  download
                  className="flex-1 bg-accent-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-accent-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF ({(guide.pdfSize / 1024).toFixed(0)} KB)
                </a>
                <button
                  onClick={() => handleDelete(guide.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete study guide"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Study Guide Setup
              </h2>

              <div className="space-y-4">
                {/* Study Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Study Duration
                  </label>
                  <select
                    value={studyDuration}
                    onChange={(e) => setStudyDuration(e.target.value as StudyDuration)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="1week">1 Week</option>
                    <option value="2weeks">2 Weeks</option>
                    <option value="1month">1 Month</option>
                    <option value="3months">3 Months</option>
                    <option value="semester">Semester</option>
                    <option value="year">Year</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* Custom Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="E.g., Focus on practical examples, include coding exercises..."
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
