'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  Timer,
  Target,
  ChevronRight,
} from 'lucide-react'
import type { AssignmentType } from '@/lib/types/institutional'

interface Assignment {
  id: string
  title: string
  description: string | null
  instructions: string | null
  type: AssignmentType
  dueDate: string | null
  minCardsToReview: number | null
  minScorePercent: number | null
  requiredTimeMinutes: number | null
  allowLateSubmission: boolean
  maxAttempts: number | null
  class: {
    id: string
    name: string
    subject: string | null
  }
  document: {
    id: string
    fileName: string
  } | null
}

interface Submission {
  id: string
  status: string
  startedAt: string | null
  submittedAt: string | null
  timeSpentSeconds: number
  scorePercent: number | null
  cardsReviewed: number | null
  cardsMastered: number | null
  attemptNumber: number
  feedback: string | null
  gradedAt: string | null
}

const TYPE_LABELS: Record<AssignmentType, string> = {
  flashcards: 'Flashcard Review',
  quiz: 'Quiz',
  exam: 'Exam',
  reading: 'Reading Assignment',
  podcast: 'Podcast Listening',
  mindmap: 'Mind Map Exploration',
  study_guide: 'Study Guide',
}

const TYPE_ACTIONS: Record<AssignmentType, { label: string; route: string }> = {
  flashcards: { label: 'Start Review', route: '/dashboard?mode=flashcards' },
  quiz: { label: 'Start Quiz', route: '/dashboard?mode=quiz' },
  exam: { label: 'Start Exam', route: '/dashboard?mode=quiz' },
  reading: { label: 'Read Document', route: '/dashboard?mode=chat' },
  podcast: { label: 'Listen to Podcast', route: '/dashboard?mode=podcast' },
  mindmap: { label: 'Explore Mind Map', route: '/dashboard?mode=mindmap' },
  study_guide: { label: 'Open Study Guide', route: '/dashboard?mode=chat' },
}

export default function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = use(params)
  const router = useRouter()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchAssignment()
  }, [assignmentId])

  async function fetchAssignment() {
    try {
      setLoading(true)

      const res = await fetch(`/api/assignments/${assignmentId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 404) {
          setError('Assignment not found')
          return
        }
        throw new Error('Failed to fetch assignment')
      }

      const data = await res.json()
      setAssignment(data.assignment)
      setSubmission(data.mySubmission)
    } catch (err) {
      console.error('Error fetching assignment:', err)
      setError('Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }

  async function handleStartAssignment() {
    if (!assignment) return

    setStarting(true)

    try {
      // Create or update submission to mark as started
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignmentId: assignment.id,
          action: 'start',
        }),
      })

      if (res.ok) {
        // Navigate to the appropriate study mode
        const action = TYPE_ACTIONS[assignment.type]
        const documentParam = assignment.document?.id
          ? `&documentId=${assignment.document.id}`
          : ''
        router.push(`${action.route}${documentParam}&assignmentId=${assignment.id}`)
      }
    } catch (err) {
      console.error('Error starting assignment:', err)
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
          <p>{error || 'Assignment not found'}</p>
        </div>
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 mt-4 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date()
  const canSubmit = !isPastDue || assignment.allowLateSubmission
  const isCompleted = submission?.status === 'submitted' || submission?.status === 'graded'
  const action = TYPE_ACTIONS[assignment.type]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link
          href="/dashboard/student"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignment.title}
            </h1>
            {isCompleted && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                Completed
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {assignment.class.name} • {TYPE_LABELS[assignment.type]}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {isPastDue && !isCompleted && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          assignment.allowLateSubmission
            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">
              {assignment.allowLateSubmission
                ? 'This assignment is past due but late submissions are accepted.'
                : 'This assignment is past due and no longer accepts submissions.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Assignment Details */}
        <div className="p-6 space-y-6">
          {assignment.description && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Description
              </h2>
              <p className="text-gray-900 dark:text-white">
                {assignment.description}
              </p>
            </div>
          )}

          {assignment.instructions && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Instructions
              </h2>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>
          )}

          {/* Requirements Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {assignment.dueDate && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Due Date</span>
                </div>
                <p className={`text-sm font-medium ${isPastDue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {assignment.minCardsToReview && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-medium">Cards Required</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {assignment.minCardsToReview} cards
                </p>
              </div>
            )}

            {assignment.minScorePercent && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Min. Score</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {assignment.minScorePercent}%
                </p>
              </div>
            )}

            {assignment.requiredTimeMinutes && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Timer className="h-4 w-4" />
                  <span className="text-xs font-medium">Time Required</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {assignment.requiredTimeMinutes} min
                </p>
              </div>
            )}
          </div>

          {/* Document Link */}
          {assignment.document && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {assignment.document.fileName}
                  </p>
                  <p className="text-xs text-gray-500">Study material for this assignment</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submission Status */}
        {submission && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/30">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Your Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {submission.cardsReviewed || 0}
                </p>
                <p className="text-xs text-gray-500">Cards Reviewed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {submission.scorePercent !== null ? `${submission.scorePercent}%` : '-'}
                </p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(submission.timeSpentSeconds / 60) || 0}
                </p>
                <p className="text-xs text-gray-500">Minutes Spent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  #{submission.attemptNumber}
                </p>
                <p className="text-xs text-gray-500">Attempt</p>
              </div>
            </div>

            {submission.feedback && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Teacher Feedback
                </p>
                <p className="text-gray-900 dark:text-white">{submission.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          {isCompleted ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Assignment Completed</span>
              </div>
              {assignment.maxAttempts === null || (submission && submission.attemptNumber < (assignment.maxAttempts || 1)) ? (
                <button
                  onClick={handleStartAssignment}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Try Again
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : canSubmit ? (
            <button
              onClick={handleStartAssignment}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {starting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {submission?.status === 'in_progress' ? 'Continue' : action.label}
                </>
              )}
            </button>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              This assignment is no longer accepting submissions.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
