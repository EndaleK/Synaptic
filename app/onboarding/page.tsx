'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  GraduationCap,
  Users,
  School,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface RoleOption {
  id: UserRole
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  nextStep: string
}

const roleOptions: RoleOption[] = [
  {
    id: 'learner',
    title: 'Individual Learner',
    description: 'I want to study and learn on my own',
    icon: GraduationCap,
    features: [
      'Upload documents and generate flashcards',
      'AI-powered podcasts and mind maps',
      'Spaced repetition learning',
      'Track your study progress',
    ],
    nextStep: '/dashboard',
  },
  {
    id: 'parent',
    title: 'Homeschool Parent',
    description: 'I educate my children at home',
    icon: Users,
    features: [
      'Manage multiple children',
      'Track learning progress for each child',
      'Generate compliance reports',
      'Access shared curriculum resources',
    ],
    nextStep: '/onboarding/parent',
  },
  {
    id: 'educator',
    title: 'Educator / Tutor',
    description: 'I teach students in a school or tutoring',
    icon: School,
    features: [
      'Create and manage classes',
      'Assign content to students',
      'Track student performance',
      'Grade assignments and provide feedback',
    ],
    nextStep: '/onboarding/educator',
  },
  {
    id: 'institution',
    title: 'Institution Admin',
    description: 'I manage a school, co-op, or umbrella organization',
    icon: Building2,
    features: [
      'Create and manage your organization',
      'Invite teachers and administrators',
      'Share curriculum across all members',
      'Generate aggregate analytics',
    ],
    nextStep: '/onboarding/institution',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleContinue() {
    if (!selectedRole) return

    setIsSubmitting(true)

    try {
      // Update user profile with selected role
      const response = await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          primary_role: selectedRole,
          roles: [selectedRole],
          onboarding_step: 'role_selected',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      // Find the next step for this role
      const roleOption = roleOptions.find((r) => r.id === selectedRole)
      if (roleOption) {
        // For learner role, mark onboarding as complete
        if (selectedRole === 'learner') {
          await fetch('/api/user/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              onboarding_completed: true,
              onboarding_step: 'complete',
            }),
          })
        }
        router.push(roleOption.nextStep)
      }
    } catch (error) {
      console.error('Error updating role:', error)
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
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Welcome to Synaptic
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How will you use Synaptic?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the option that best describes you. You can always add more
            roles later in settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {roleOptions.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="h-6 w-6 text-purple-500" />
                  </div>
                )}

                {/* Icon and title */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {role.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {role.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 ml-1">
                  {role.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isSelected ? 'bg-purple-500' : 'bg-gray-400'
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selectedRole || isSubmitting}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              selectedRole && !isSubmitting
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Skip option for existing users */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
