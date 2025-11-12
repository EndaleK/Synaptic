"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  FileText,
  Clock,
  Target,
  Play,
  BarChart3,
  Trophy,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Star,
  Trash2
} from "lucide-react"
import ExamSetupModal from "./ExamSetupModal"
import ExamInterface from "./ExamInterface"
import ExamReviewMode from "./ExamReviewMode"
import ExamAnalytics from "./ExamAnalytics"
import type { Exam, Document } from "@/lib/supabase/types"

type ExamViewMode = 'list' | 'setup' | 'taking' | 'review' | 'analytics'

interface ExamAttempt {
  id: string
  exam_id: string
  user_id: number
  mode: string
  status: string
  total_questions: number
  time_limit_seconds: number | null
  started_at: string
  completed_at: string | null
  time_taken_seconds: number | null
  correct_answers: number | null
  score: number | null
  answers: any[]
}

interface ExamWithAttempts extends Exam {
  latest_attempt?: ExamAttempt
  attempt_count?: number
  best_score?: number
}

export default function ExamView() {
  const [viewMode, setViewMode] = useState<ExamViewMode>('list')
  const [exams, setExams] = useState<ExamWithAttempts[]>([])
  const [selectedExam, setSelectedExam] = useState<ExamWithAttempts | null>(null)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showDocumentSelector, setShowDocumentSelector] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [examToDelete, setExamToDelete] = useState<ExamWithAttempts | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load exams on component mount
  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/exams?includeAttempts=true')
      if (!response.ok) {
        throw new Error('Failed to load exams')
      }

      const data = await response.json()
      setExams(data.exams || [])
    } catch (err) {
      console.error('Error loading exams:', err)
      setError(err instanceof Error ? err.message : 'Failed to load exams')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true)
      const response = await fetch('/api/documents')
      if (!response.ok) {
        throw new Error('Failed to load documents')
      }
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const handleCreateExam = async () => {
    await loadDocuments()
    setShowDocumentSelector(true)
  }

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
    setShowDocumentSelector(false)
    setShowSetupModal(true)
  }

  const handleExamCreated = (exam: Exam) => {
    setShowSetupModal(false)
    setSelectedDocument(null)
    loadExams() // Reload list
  }

  const handleStartExam = (exam: ExamWithAttempts) => {
    setSelectedExam(exam)
    setViewMode('taking')
  }

  const handleExamComplete = (attemptId: string, score: number) => {
    setSelectedAttemptId(attemptId)
    setViewMode('review')
  }

  const handleViewReview = (attemptId: string) => {
    setSelectedAttemptId(attemptId)
    setViewMode('review')
  }

  const handleViewAnalytics = (exam: ExamWithAttempts) => {
    setSelectedExam(exam)
    setViewMode('analytics')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedExam(null)
    setSelectedAttemptId(null)
    loadExams() // Refresh the list
  }

  const handleToggleFavorite = async (exam: ExamWithAttempts, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click

    try {
      const newFavoritedState = !exam.is_favorited

      // Optimistic UI update
      setExams(prevExams =>
        prevExams.map(e => e.id === exam.id ? { ...e, is_favorited: newFavoritedState } : e)
      )

      const response = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorited: newFavoritedState })
      })

      if (!response.ok) {
        // Revert on failure
        setExams(prevExams =>
          prevExams.map(e => e.id === exam.id ? { ...e, is_favorited: exam.is_favorited } : e)
        )
        throw new Error('Failed to toggle favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleDeleteExam = async () => {
    if (!examToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/exams/${examToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete exam')
      }

      // Remove from list
      setExams(prevExams => prevExams.filter(e => e.id !== examToDelete.id))
      setExamToDelete(null)
    } catch (error) {
      console.error('Error deleting exam:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete exam')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  // Render exam taking interface
  if (viewMode === 'taking' && selectedExam) {
    return (
      <ExamInterface
        examId={selectedExam.id}
        onComplete={handleExamComplete}
        onExit={handleBackToList}
      />
    )
  }

  // Render exam review mode
  if (viewMode === 'review' && selectedAttemptId) {
    return (
      <ExamReviewMode
        attemptId={selectedAttemptId}
        onRetake={() => {
          if (selectedExam) {
            setViewMode('taking')
          } else {
            handleBackToList()
          }
        }}
        onExit={handleBackToList}
      />
    )
  }

  // Render analytics view
  if (viewMode === 'analytics' && selectedExam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedExam.title} - Analytics
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Performance insights and question-level analytics
              </p>
            </div>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back to Exams
            </button>
          </div>
          <ExamAnalytics examId={selectedExam.id} />
        </div>
      </div>
    )
  }

  // Render exam list (default view)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mock Exams</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Practice with AI-generated exams from your documents
            </p>
          </div>
          <button
            onClick={handleCreateExam}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
          >
            <Plus className="w-5 h-5" />
            Create New Exam
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading exams...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
              <button
                onClick={loadExams}
                className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && exams.length === 0 && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Exams Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first mock exam from any of your uploaded documents to start practicing.
              </p>
              <button
                onClick={handleCreateExam}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Your First Exam
              </button>
            </div>
          </div>
        )}

        {/* Exam List */}
        {!isLoading && !error && exams.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all"
              >
                {/* Exam Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {exam.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {/* Favorite/Bookmark Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(exam, e)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={exam.is_favorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          exam.is_favorited
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExamToDelete(exam)
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete exam"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>

                    {/* Difficulty Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      exam.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      exam.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      exam.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                      'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                    }`}>
                      {exam.difficulty}
                    </span>
                  </div>
                </div>

                {/* Exam Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Target className="w-4 h-4" />
                    <span>{exam.question_count} questions</span>
                  </div>
                  {exam.time_limit_minutes && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{exam.time_limit_minutes} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(exam.created_at)}</span>
                  </div>
                </div>

                {/* Performance Summary */}
                {exam.attempt_count && exam.attempt_count > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Attempts</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {exam.attempt_count}
                        </p>
                      </div>
                      {exam.best_score !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {exam.best_score.toFixed(1)}%
                          </p>
                        </div>
                      )}
                      {exam.latest_attempt && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Attempt</p>
                          <p className={`text-2xl font-bold ${
                            exam.latest_attempt.score && exam.latest_attempt.score >= 70 ? 'text-green-600 dark:text-green-400' :
                            exam.latest_attempt.score && exam.latest_attempt.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {exam.latest_attempt.score?.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleStartExam(exam)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    {exam.attempt_count && exam.attempt_count > 0 ? 'Retake' : 'Start'} Exam
                  </button>
                  {exam.latest_attempt && (
                    <button
                      onClick={() => handleViewReview(exam.latest_attempt!.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Review
                    </button>
                  )}
                  {exam.attempt_count && exam.attempt_count > 0 && (
                    <button
                      onClick={() => handleViewAnalytics(exam)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <BarChart3 className="w-5 h-5" />
                      Analytics
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Selector Modal */}
      {showDocumentSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select a Document</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose a document to create an exam from
              </p>
            </div>

            <div className="p-6">
              {isLoadingDocuments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No documents found. Upload a document first.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentSelect(doc)}
                      className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                    >
                      <FileText className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {doc.file_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowDocumentSelector(false)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Setup Modal */}
      {selectedDocument && (
        <ExamSetupModal
          isOpen={showSetupModal}
          onClose={() => {
            setShowSetupModal(false)
            setSelectedDocument(null)
          }}
          document={selectedDocument}
          onExamCreated={loadExams}
        />
      )}

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delete Exam
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete <span className="font-semibold">"{examToDelete.title}"</span>?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  This will permanently delete the exam and all associated attempts and analytics data.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setExamToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
