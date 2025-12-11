'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Users,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Trash2,
  AlertCircle,
} from 'lucide-react'

interface ChildAccount {
  id: string
  firstName: string
  lastName: string
  email: string
  gradeLevel: string
  birthYear: string
}

const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
]

export default function ParentOnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [children, setChildren] = useState<ChildAccount[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for new child
  const [newChild, setNewChild] = useState<Omit<ChildAccount, 'id'>>({
    firstName: '',
    lastName: '',
    email: '',
    gradeLevel: '',
    birthYear: '',
  })

  function addChild() {
    if (!newChild.firstName || !newChild.lastName) {
      setError('First name and last name are required')
      return
    }

    setChildren([
      ...children,
      {
        ...newChild,
        id: crypto.randomUUID(),
      },
    ])
    setNewChild({
      firstName: '',
      lastName: '',
      email: '',
      gradeLevel: '',
      birthYear: '',
    })
    setError(null)
  }

  function removeChild(id: string) {
    setChildren(children.filter((c) => c.id !== id))
  }

  async function handleComplete() {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create child accounts if any
      if (children.length > 0) {
        const response = await fetch('/api/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ children }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create child accounts')
        }
      }

      // Mark onboarding as complete
      await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          onboarding_completed: true,
          onboarding_step: 'complete',
        }),
      })

      router.push('/dashboard/parent')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => router.push('/onboarding')}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-6">
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Set Up Your Family
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Add your children to track their learning progress. You can always
            add or remove children later in settings.
          </p>
        </div>

        {/* Children list */}
        {children.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Your Children ({children.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {child.firstName[0]}
                        {child.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {child.gradeLevel || 'No grade set'}
                        {child.email && ` • ${child.email}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeChild(child.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add child form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Add a Child
            </h2>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={newChild.firstName}
                onChange={(e) =>
                  setNewChild({ ...newChild, firstName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={newChild.lastName}
                onChange={(e) =>
                  setNewChild({ ...newChild, lastName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade Level
              </label>
              <select
                value={newChild.gradeLevel}
                onChange={(e) =>
                  setNewChild({ ...newChild, gradeLevel: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select grade</option>
                {GRADE_LEVELS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Birth Year (optional)
              </label>
              <input
                type="text"
                value={newChild.birthYear}
                onChange={(e) =>
                  setNewChild({ ...newChild, birthYear: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., 2015"
                maxLength={4}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (optional - for their own login)
            </label>
            <input
              type="email"
              value={newChild.email}
              onChange={(e) =>
                setNewChild({ ...newChild, email: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="child@example.com"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              If provided, your child can log in with their own account. You'll
              still have access to their progress.
            </p>
          </div>

          <button
            onClick={addChild}
            className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            + Add Child
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              isSubmitting
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Setting up...
              </>
            ) : children.length > 0 ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Complete Setup
              </>
            ) : (
              <>
                Skip for Now
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
          {children.length === 0
            ? "You can add children later from your parent dashboard."
            : `${children.length} ${children.length === 1 ? 'child' : 'children'} will be added to your family.`}
        </p>
      </div>
    </div>
  )
}
