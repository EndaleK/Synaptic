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
  Users,
  BookOpen,
  BarChart3,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-blue-500/30" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-purple/[0.03] dark:bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-blue-400 to-cyan-500 dark:from-blue-800 dark:to-cyan-700 opacity-30" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-cyan-400 to-blue-500 dark:from-cyan-800 dark:to-blue-700 opacity-30" />
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 mb-6 shadow-xl shadow-blue-500/30">
            <School className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
            Set Up Your <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">Teaching Space</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Join an existing organization or create a new one. You can also skip
            this for now and start teaching independently.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Users className="h-4 w-4 text-blue-500" />
            Class Management
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <BookOpen className="h-4 w-4 text-cyan-500" />
            Assignments
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Student Analytics
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fadeIn">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Choice cards */}
        {!choice && (
          <div className="space-y-4 mb-8 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            {/* Join existing org */}
            <button
              onClick={() => setChoice('join_org')}
              className="group w-full p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-500/50 text-left transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-cyan-600 transition-all">
                  <Key className="h-6 w-6 text-blue-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                    Join an Organization
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    I have an invite code from my school or organization
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            {/* Create new org */}
            <button
              onClick={() => setChoice('create_org')}
              className="group w-full p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-500/50 text-left transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 group-hover:bg-gradient-to-br group-hover:from-cyan-500 group-hover:to-blue-600 transition-all">
                  <Plus className="h-6 w-6 text-cyan-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                    Create an Organization
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    I want to set up my own school, co-op, or tutoring practice
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            {/* Skip */}
            <button
              onClick={() => setChoice('skip')}
              className="group w-full p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-left transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-all">
                  <ArrowRight className="h-6 w-6 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                    Skip for Now
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    I'll set up an organization later
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Join org form */}
        {choice === 'join_org' && (
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-lg animate-fadeIn"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30">
                <Key className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="font-semibold text-black dark:text-white">
                Enter Invite Code
              </h2>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-mono text-lg tracking-wider"
                placeholder="XXXXXX"
                maxLength={10}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Enter the code provided by your organization administrator
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinOrg}
                disabled={isSubmitting || !inviteCode.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isSubmitting || !inviteCode.trim()
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
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
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-lg animate-fadeIn"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30">
                <Building2 className="h-5 w-5 text-cyan-500" />
              </div>
              <h2 className="font-semibold text-black dark:text-white">
                Create Organization
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Name <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                  placeholder="e.g., Springfield High School"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Type
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as typeof orgType)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="school" className="bg-white dark:bg-gray-800">School</option>
                  <option value="co-op" className="bg-white dark:bg-gray-800">Homeschool Co-op</option>
                  <option value="tutoring" className="bg-white dark:bg-gray-800">Tutoring Practice</option>
                  <option value="other" className="bg-white dark:bg-gray-800">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={isSubmitting || !orgName.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isSubmitting || !orgName.trim()
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
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
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-lg animate-fadeIn"
          >
            <p className="text-gray-600 dark:text-gray-400 mb-5">
              You can still create classes and manage students without an
              organization. You can join or create one later from your teacher
              dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setChoice(null)}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isSubmitting
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
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
