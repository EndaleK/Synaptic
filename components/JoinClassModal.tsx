'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Loader2, Users, BookOpen, CheckCircle, AlertCircle } from 'lucide-react'

interface ClassPreview {
  id: string
  name: string
  subject?: string
  gradeLevel?: string
  description?: string
  teacherName: string
  enrollmentCount: number
  maxStudents: number
  isFull: boolean
}

interface JoinClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (classId: string) => void
}

export default function JoinClassModal({
  isOpen,
  onClose,
  onSuccess
}: JoinClassModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [preview, setPreview] = useState<ClassPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(['', '', '', '', '', ''])
      setPreview(null)
      setError(null)
      setSuccess(false)
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [isOpen])

  // Check for preview when code is complete
  useEffect(() => {
    const fullCode = code.join('')
    if (fullCode.length === 6) {
      fetchPreview(fullCode)
    } else {
      setPreview(null)
      setError(null)
    }
  }, [code])

  const fetchPreview = async (joinCode: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/classes/join?code=${joinCode}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      setPreview(data.class)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find class')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!preview) return

    setJoining(true)
    setError(null)

    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: code.join('') })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join class')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.(preview.id)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join class')
    } finally {
      setJoining(false)
    }
  }

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1)

    const newCode = [...code]
    newCode[index] = char
    setCode(newCode)

    // Move to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const newCode = [...code]
    pasted.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char
    })
    setCode(newCode)
    // Focus last filled input
    const lastIndex = Math.min(pasted.length, 5)
    inputRefs.current[lastIndex]?.focus()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Join a Class
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-character code from your teacher
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Code Input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((char, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                maxLength={1}
                value={char}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold font-mono uppercase rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading || joining || success}
              />
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Looking up class...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && !success && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {preview.name}
              </h3>

              {preview.subject && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {preview.subject}
                    {preview.gradeLevel && ` - ${preview.gradeLevel}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <Users className="w-4 h-4" />
                <span>
                  {preview.enrollmentCount} / {preview.maxStudents} students
                </span>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Taught by <span className="font-medium text-gray-700 dark:text-gray-300">{preview.teacherName}</span>
              </p>

              {preview.isFull && (
                <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This class is currently full
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                You're in!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome to {preview?.name}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && !success && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={joining || preview.isFull}
              className="px-6 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Class'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
