'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface ClassPreview {
  name: string
  subject: string | null
  gradeLevel: string | null
  description: string | null
  teacherName: string
  schoolName: string
  organizationName: string
  enrollmentCount: number
  maxStudents: number
  isFull: boolean
  allowSelfEnrollment: boolean
}

function JoinClassContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [joinCode, setJoinCode] = useState(codeFromUrl || '')
  const [classPreview, setClassPreview] = useState<ClassPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [joinedClassId, setJoinedClassId] = useState<string | null>(null)

  // Auto-lookup if code in URL
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 6) {
      lookupClass(codeFromUrl)
    }
  }, [codeFromUrl])

  async function lookupClass(code: string) {
    if (code.length !== 6) return

    try {
      setLoading(true)
      setError(null)
      setClassPreview(null)

      const res = await fetch(`/api/classes/join?code=${code}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Class not found')
        return
      }

      const data = await res.json()
      setClassPreview(data.class)
    } catch (err) {
      setError('Failed to look up class')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!classPreview) return

    try {
      setJoining(true)
      setError(null)

      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join class')
        return
      }

      setSuccess(true)
      setJoinedClassId(data.class.id)
    } catch (err) {
      setError('Failed to join class')
    } finally {
      setJoining(false)
    }
  }

  function handleCodeChange(value: string) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setJoinCode(cleaned)
    setError(null)
    setClassPreview(null)

    if (cleaned.length === 6) {
      lookupClass(cleaned)
    }
  }

  if (success && joinedClassId) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Successfully Joined!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You&apos;re now enrolled in <strong>{classPreview?.name}</strong>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(false)
                setJoinCode('')
                setClassPreview(null)
              }}
              className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Join Another Class
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Join a Class
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enter the 6-character code from your teacher
          </p>
        </div>

        {/* Code Input */}
        <div className="p-6">
          <div className="mb-6">
            <label
              htmlFor="joinCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Class Code
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono uppercase border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Looking up class...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Class Preview */}
          {classPreview && !loading && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {classPreview.name}
              </h3>
              {classPreview.subject && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {classPreview.subject}
                  {classPreview.gradeLevel && ` • Grade ${classPreview.gradeLevel}`}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Taught by {classPreview.teacherName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {classPreview.schoolName} • {classPreview.organizationName}
              </p>

              <div className="flex items-center gap-1 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>
                  {classPreview.enrollmentCount}/{classPreview.maxStudents} students
                </span>
              </div>

              {classPreview.isFull && (
                <p className="text-sm text-red-600 mt-2">This class is full</p>
              )}

              {!classPreview.allowSelfEnrollment && (
                <p className="text-sm text-yellow-600 mt-2">
                  Self-enrollment is disabled. Contact your teacher.
                </p>
              )}
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={
              !classPreview ||
              loading ||
              joining ||
              classPreview.isFull ||
              !classPreview.allowSelfEnrollment
            }
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Class'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JoinClassPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      }
    >
      <JoinClassContent />
    </Suspense>
  )
}
