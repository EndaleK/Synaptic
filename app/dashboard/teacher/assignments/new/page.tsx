'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Headphones,
  Brain,
  ClipboardList,
  GraduationCap,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
} from 'lucide-react'
import type { AssignmentType } from '@/lib/types/institutional'

interface Class {
  id: string
  name: string
  subject: string | null
}

interface Document {
  id: string
  fileName: string
  fileType: string
  createdAt: string
}

const ASSIGNMENT_TYPES: {
  type: AssignmentType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    type: 'flashcards',
    label: 'Flashcard Review',
    description: 'Students review flashcards generated from the document',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    type: 'quiz',
    label: 'Quiz',
    description: 'Auto-generated quiz from document content',
    icon: ClipboardList,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    type: 'podcast',
    label: 'Podcast Listening',
    description: 'Listen to an AI-generated podcast summary',
    icon: Headphones,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    type: 'mindmap',
    label: 'Mind Map Exploration',
    description: 'Explore an interactive mind map of concepts',
    icon: Brain,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    type: 'reading',
    label: 'Reading Assignment',
    description: 'Read and study the provided document',
    icon: FileText,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
  {
    type: 'study_guide',
    label: 'Study Guide',
    description: 'Complete a structured study guide',
    icon: GraduationCap,
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  },
]

type Step = 'type' | 'details' | 'requirements' | 'review'

export default function NewAssignmentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [classes, setClasses] = useState<Class[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedType, setSelectedType] = useState<AssignmentType | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('23:59')
  const [minCardsToReview, setMinCardsToReview] = useState<number>(20)
  const [minScorePercent, setMinScorePercent] = useState<number>(70)
  const [requiredTimeMinutes, setRequiredTimeMinutes] = useState<number | null>(null)
  const [allowLateSubmission, setAllowLateSubmission] = useState(true)
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null)
  const [publishImmediately, setPublishImmediately] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch classes
      const classesRes = await fetch('/api/classes', { credentials: 'include' })
      if (classesRes.ok) {
        const data = await classesRes.json()
        setClasses(data.classes || [])
      }

      // Fetch user's documents
      const docsRes = await fetch('/api/documents', { credentials: 'include' })
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!selectedType || !selectedClass || !title) {
      setError('Please complete all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const dueDateISO = dueDate && dueTime
        ? new Date(`${dueDate}T${dueTime}`).toISOString()
        : null

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: selectedClass,
          title,
          description: description || undefined,
          instructions: instructions || undefined,
          type: selectedType,
          documentId: selectedDocument || undefined,
          dueDate: dueDateISO,
          minCardsToReview: selectedType === 'flashcards' ? minCardsToReview : undefined,
          minScorePercent: ['flashcards', 'quiz'].includes(selectedType) ? minScorePercent : undefined,
          requiredTimeMinutes: requiredTimeMinutes || undefined,
          allowLateSubmission,
          maxAttempts: maxAttempts || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create assignment')
      }

      // If publish immediately, update the assignment
      if (publishImmediately && data.assignment?.id) {
        await fetch(`/api/assignments/${data.assignment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isPublished: true }),
        })
      }

      router.push('/dashboard/teacher')
    } catch (err) {
      console.error('Error creating assignment:', err)
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const steps: Step[] = ['type', 'details', 'requirements', 'review']
  const currentIndex = steps.indexOf(step)

  function nextStep() {
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  function prevStep() {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 'type':
        return selectedType !== null
      case 'details':
        return selectedClass !== '' && title.trim() !== ''
      case 'requirements':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/teacher"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Assignment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set up a new assignment for your class
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i < currentIndex
                    ? 'bg-green-500 text-white'
                    : i === currentIndex
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {i < currentIndex ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-16 md:w-24 lg:w-32 h-1 mx-2 transition-colors ${
                    i < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">Type</span>
          <span className="text-xs text-gray-500">Details</span>
          <span className="text-xs text-gray-500">Requirements</span>
          <span className="text-xs text-gray-500">Review</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {step === 'type' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Choose Assignment Type
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select the type of learning activity for this assignment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ASSIGNMENT_TYPES.map(({ type, label, description, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedType === type
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assignment Details
            </h2>

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.subject ? `(${cls.subject})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Review"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of what students will learn..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructions for Students
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Detailed instructions on how to complete the assignment..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Document Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Linked Document
              </label>
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">No document</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fileName}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Link a document for content generation (flashcards, quiz, etc.)
              </p>
            </div>
          </div>
        )}

        {step === 'requirements' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Requirements & Settings
            </h2>

            {/* Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type-specific requirements */}
            {selectedType === 'flashcards' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Flashcard Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Cards to Review
                    </label>
                    <input
                      type="number"
                      value={minCardsToReview}
                      onChange={(e) => setMinCardsToReview(parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Score (%)
                    </label>
                    <input
                      type="number"
                      value={minScorePercent}
                      onChange={(e) => setMinScorePercent(parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'quiz' && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Quiz Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      value={minScorePercent}
                      onChange={(e) => setMinScorePercent(parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Attempts
                    </label>
                    <input
                      type="number"
                      value={maxAttempts || ''}
                      onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
                      min={1}
                      placeholder="Unlimited"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {['podcast', 'reading'].includes(selectedType || '') && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Completion Requirements
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={requiredTimeMinutes || ''}
                    onChange={(e) => setRequiredTimeMinutes(e.target.value ? parseInt(e.target.value) : null)}
                    min={1}
                    placeholder="Optional"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum time students must spend on this activity
                  </p>
                </div>
              </div>
            )}

            {/* Late submission */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowLate"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="allowLate" className="text-gray-700 dark:text-gray-300">
                Allow late submissions
              </label>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review & Create
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Review your assignment details before creating.
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Assignment Type
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {ASSIGNMENT_TYPES.find(t => t.type === selectedType)?.label}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Class
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {classes.find(c => c.id === selectedClass)?.name || 'Not selected'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Title
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">{title}</p>
                {description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{description}</p>
                )}
              </div>

              {dueDate && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Due Date
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(`${dueDate}T${dueTime}`).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedDocument && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Linked Document
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {documents.find(d => d.id === selectedDocument)?.fileName}
                  </p>
                </div>
              )}

              {/* Publish option */}
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="publishNow"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="publishNow" className="text-gray-700 dark:text-gray-300">
                    Publish immediately (students will see this assignment right away)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step !== 'review' ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Create Assignment
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
