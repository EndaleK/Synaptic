'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function JoinClassPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ className: string; teacherName: string } | null>(null)

  async function handleJoin() {
    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join class')
      }

      setSuccess({
        className: data.class?.name || 'the class',
        teacherName: data.class?.teacher || 'your teacher',
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/student')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join class')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/student"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Join a Class
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter the code from your teacher
          </p>
        </div>
      </div>

      {success ? (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-8 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to {success.className}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You've successfully joined the class. Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Join Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Class Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              maxLength={10}
              className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest uppercase rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Ask your teacher for the class join code
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleJoin}
            disabled={loading || !joinCode.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Join Class
              </>
            )}
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Can't find your code? Ask your teacher for the class join code.</p>
        <p className="mt-2">
          Join codes are typically 6-8 characters like <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ABC123</code>
        </p>
      </div>
    </div>
  )
}
