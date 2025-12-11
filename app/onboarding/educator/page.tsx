'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  School,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Plus,
  AlertCircle,
  Key,
} from 'lucide-react'

type OnboardingChoice = 'create_org' | 'join_org' | 'skip'

export default function EducatorOnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [choice, setChoice] = useState<OnboardingChoice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Join org state
  const [inviteCode, setInviteCode] = useState('')

  // Create org state
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<'school' | 'co-op' | 'tutoring' | 'other'>('school')

  async function handleJoinOrg() {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: inviteCode.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid invite code')
      }

      const data = await response.json()

      // Join the organization
      const joinResponse = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: inviteCode.trim() }),
      })

      if (!joinResponse.ok) {
        const joinData = await joinResponse.json()
        throw new Error(joinData.error || 'Failed to join organization')
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

      router.push('/dashboard/teacher')
    } catch (err) {
      console.error('Error joining organization:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) {
      setError('Please enter an organization name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: orgName.trim(),
          type: orgType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
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

      router.push('/dashboard/teacher')
    } catch (err) {
      console.error('Error creating organization:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSkip() {
    setIsSubmitting(true)

    try {
      await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          onboarding_completed: true,
          onboarding_step: 'complete',
        }),
      })

      router.push('/dashboard/teacher')
    } catch (err) {
      console.error('Error completing onboarding:', err)
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
            <School className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Set Up Your Teaching Space
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Join an existing organization or create a new one. You can also skip
            this for now and start teaching independently.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Choice cards */}
        {!choice && (
          <div className="space-y-4 mb-8">
            {/* Join existing org */}
            <button
              onClick={() => setChoice('join_org')}
              className="w-full p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Join an Organization
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    I have an invite code from my school or organization
                  </p>
                </div>
              </div>
            </button>

            {/* Create new org */}
            <button
              onClick={() => setChoice('create_org')}
              className="w-full p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Create an Organization
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    I want to set up my own school, co-op, or tutoring practice
                  </p>
                </div>
              </div>
            </button>

            {/* Skip */}
            <button
              onClick={() => setChoice('skip')}
              className="w-full p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Skip for Now
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    I'll set up an organization later
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Join org form */}
        {choice === 'join_org' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Enter Invite Code
              </h2>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg tracking-wider"
                placeholder="XXXXXX"
                maxLength={10}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the code provided by your organization administrator
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinOrg}
                disabled={isSubmitting || !inviteCode.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  isSubmitting || !inviteCode.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Organization
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Create org form */}
        {choice === 'create_org' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Create Organization
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Springfield High School"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Type
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as typeof orgType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="school">School</option>
                  <option value="co-op">Homeschool Co-op</option>
                  <option value="tutoring">Tutoring Practice</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={isSubmitting || !orgName.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  isSubmitting || !orgName.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Create Organization
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Skip confirmation */}
        {choice === 'skip' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You can still create classes and manage students without an
              organization. You can join or create one later from your teacher
              dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  isSubmitting
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
