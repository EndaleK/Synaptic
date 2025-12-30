'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  Send,
  XCircle,
  BarChart3,
  Eye,
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
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
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

interface SubmissionStats {
  totalStudents: number
  submitted: number
  graded: number
  inProgress: number
  notStarted: number
}

interface Submission {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  status: string
  submittedAt: string | null
  scorePercent: number | null
  cardsReviewed: number | null
  timeSpentSeconds: number
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

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = use(params)
  const router = useRouter()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchAssignment()
  }, [assignmentId])

  async function fetchAssignment() {
    try {
      setLoading(true)

      // Fetch assignment details
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
      setStats(data.submissionStats)

      // Fetch submissions
      const submissionsRes = await fetch(
        `/api/assignments/${assignmentId}/submissions`,
        { credentials: 'include' }
      )
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json()
        setSubmissions(submissionsData.submissions || [])
      }
    } catch (err) {
      console.error('Error fetching assignment:', err)
      setError('Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish() {
    if (!assignment) return

    setPublishing(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !assignment.isPublished }),
      })

      if (res.ok) {
        setAssignment({
          ...assignment,
          isPublished: !assignment.isPublished,
          publishedAt: !assignment.isPublished ? new Date().toISOString() : null,
        })
      }
    } catch (err) {
      console.error('Error updating assignment:', err)
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        router.push('/dashboard/teacher')
      }
    } catch (err) {
      console.error('Error deleting assignment:', err)
    } finally {
      setDeleting(false)
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
          href="/dashboard/teacher"
          className="inline-flex items-center gap-2 mt-4 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/teacher"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {assignment.title}
              </h1>
              {assignment.isPublished ? (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                  Published
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
                  Draft
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {assignment.class.name} • {TYPE_LABELS[assignment.type]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              assignment.isPublished
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {publishing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : assignment.isPublished ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {assignment.isPublished ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Students"
            value={stats.totalStudents}
            color="gray"
          />
          <StatCard
            label="Not Started"
            value={stats.notStarted}
            color="gray"
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            color="yellow"
          />
          <StatCard
            label="Submitted"
            value={stats.submitted}
            color="blue"
          />
          <StatCard
            label="Graded"
            value={stats.graded}
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Details */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Details
            </h2>

            {assignment.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </h3>
                <p className="text-gray-900 dark:text-white">
                  {assignment.description}
                </p>
              </div>
            )}

            {assignment.instructions && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Instructions
                </h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {assignment.instructions}
                </p>
              </div>
            )}

            {assignment.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className={`${isPastDue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  Due: {new Date(assignment.dueDate).toLocaleString()}
                </span>
              </div>
            )}

            {assignment.minCardsToReview && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  Min. Cards: {assignment.minCardsToReview}
                </span>
              </div>
            )}

            {assignment.minScorePercent && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  Min. Score: {assignment.minScorePercent}%
                </span>
              </div>
            )}

            {assignment.document && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Linked Document
                </h3>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {assignment.document.fileName}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(assignment.createdAt).toLocaleString()}
              </div>
              {assignment.publishedAt && (
                <div>
                  <span className="font-medium">Published:</span>{' '}
                  {new Date(assignment.publishedAt).toLocaleString()}
                </div>
              )}
              <div>
                <span className="font-medium">Late Submissions:</span>{' '}
                {assignment.allowLateSubmission ? 'Allowed' : 'Not Allowed'}
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Submissions
              </h2>
            </div>

            {submissions.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No submissions yet
                </p>
                {!assignment.isPublished && (
                  <p className="text-sm text-gray-500 mt-2">
                    Publish the assignment for students to submit
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {submission.studentName?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {submission.studentName || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {submission.studentEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <StatusBadge status={submission.status} />

                        {submission.scorePercent !== null && (
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.scorePercent}%
                            </p>
                            <p className="text-xs text-gray-500">Score</p>
                          </div>
                        )}

                        <Link
                          href={`/dashboard/teacher/assignments/${assignmentId}/submissions/${submission.id}`}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>

                    {submission.submittedAt && (
                      <p className="text-xs text-gray-500 mt-2 ml-13">
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Assignment?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete "{assignment.title}" and all student
              submissions. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'gray' | 'yellow' | 'blue' | 'green'
}) {
  const colorClasses = {
    gray: 'bg-gray-100 dark:bg-gray-700',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
  }

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4`}>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    not_started: {
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      label: 'Not Started',
    },
    in_progress: {
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      label: 'In Progress',
    },
    submitted: {
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      label: 'Submitted',
    },
    graded: {
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      label: 'Graded',
    },
  }

  const config = statusConfig[status] || statusConfig.not_started

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
