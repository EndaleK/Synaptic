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
  Heart,
  BookOpen,
  Shield,
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
  const { isLoaded } = useUser()
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-rose-500/30" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-purple/[0.03] dark:bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-rose-400 to-pink-500 dark:from-rose-800 dark:to-pink-700 opacity-30" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-pink-400 to-rose-500 dark:from-pink-800 dark:to-rose-700 opacity-30" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => router.push('/onboarding')}
          className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-8 animate-fadeIn"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-10 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 mb-6 shadow-xl shadow-rose-500/30">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
            Set Up Your <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">Family</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Add your children to track their learning progress. You can always
            add or remove children later in settings.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Heart className="h-4 w-4 text-rose-500" />
            Progress Tracking
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <BookOpen className="h-4 w-4 text-pink-500" />
            Shared Resources
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Shield className="h-4 w-4 text-rose-500" />
            Compliance Reports
          </div>
        </div>

        {/* Children list */}
        {children.length > 0 && (
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden shadow-lg animate-fadeIn"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-black dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-500" />
                Your Children ({children.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {children.map((child, index) => (
                <div
                  key={child.id}
                  className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                      <span className="text-white font-semibold">
                        {child.firstName[0]}
                        {child.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-black dark:text-white">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {child.gradeLevel || 'No grade set'}
                        {child.email && ` • ${child.email}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeChild(child.id)}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add child form */}
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-lg animate-fadeIn"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30">
              <UserPlus className="h-5 w-5 text-rose-500" />
            </div>
            <h2 className="font-semibold text-black dark:text-white">
              Add a Child
            </h2>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 mb-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newChild.firstName}
                onChange={(e) =>
                  setNewChild({ ...newChild, firstName: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 transition-all"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newChild.lastName}
                onChange={(e) =>
                  setNewChild({ ...newChild, lastName: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 transition-all"
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Level
              </label>
              <select
                value={newChild.gradeLevel}
                onChange={(e) =>
                  setNewChild({ ...newChild, gradeLevel: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-gray-800">Select grade</option>
                {GRADE_LEVELS.map((grade) => (
                  <option key={grade} value={grade} className="bg-white dark:bg-gray-800">
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Birth Year <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={newChild.birthYear}
                onChange={(e) =>
                  setNewChild({ ...newChild, birthYear: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 transition-all"
                placeholder="e.g., 2015"
                maxLength={4}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-gray-400 dark:text-gray-500">(optional - for their own login)</span>
            </label>
            <input
              type="email"
              value={newChild.email}
              onChange={(e) =>
                setNewChild({ ...newChild, email: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 transition-all"
              placeholder="child@example.com"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              If provided, your child can log in with their own account. You'll
              still have access to their progress.
            </p>
          </div>

          <button
            onClick={addChild}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700"
          >
            <UserPlus className="h-5 w-5" />
            Add Child
          </button>
        </div>

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn"
          style={{ animationDelay: '0.5s' }}
        >
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className={`group flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              isSubmitting
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500 shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
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
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        <p
          className="text-center mt-6 text-sm text-gray-500 dark:text-gray-500 animate-fadeIn"
          style={{ animationDelay: '0.6s' }}
        >
          {children.length === 0
            ? "You can add children later from your parent dashboard."
            : `${children.length} ${children.length === 1 ? 'child' : 'children'} will be added to your family.`}
        </p>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
