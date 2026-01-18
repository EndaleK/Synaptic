'use client'

import { useState, useEffect } from 'react'
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
  Zap,
  BookOpen,
  Brain,
} from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface RoleOption {
  id: UserRole
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  nextStep: string
  accentColor: string
  borderColor: string
  bgColor: string
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
    accentColor: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-300 dark:border-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
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
    accentColor: 'from-rose-500 to-pink-500',
    borderColor: 'border-rose-300 dark:border-rose-700',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
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
    accentColor: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-300 dark:border-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
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
    accentColor: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-300 dark:border-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoaded } = useUser()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Read pre-selected role from localStorage (set during sign-up)
  useEffect(() => {
    const pendingRole = localStorage.getItem('pending_onboarding_role')
    if (pendingRole && ['learner', 'parent', 'educator', 'institution'].includes(pendingRole)) {
      setSelectedRole(pendingRole as UserRole)
      // Clear after reading so it doesn't persist on refresh
      localStorage.removeItem('pending_onboarding_role')
    }
  }, [])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-purple-500/30" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black relative overflow-hidden">
      {/* Background decoration - matching landing page */}
      <div className="absolute inset-0 bg-grid-purple/[0.03] dark:bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-purple-400 to-pink-500 dark:from-purple-800 dark:to-pink-700 opacity-30" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-pink-400 to-purple-500 dark:from-pink-800 dark:to-purple-700 opacity-30" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-purple-600 dark:text-purple-400 text-sm font-medium mb-5 shadow-sm animate-fadeIn"
            style={{ animationDelay: '0.1s' }}
          >
            <Sparkles className="h-4 w-4" />
            Welcome to Synaptic
          </div>

          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 animate-fadeIn"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="text-black dark:text-white">How will you use </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600">
              Synaptic
            </span>
            <span className="text-black dark:text-white">?</span>
          </h1>

          <p
            className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed animate-fadeIn"
            style={{ animationDelay: '0.3s' }}
          >
            Choose the option that best describes you. You can always add more
            roles later in settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {roleOptions.map((role, index) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`group relative p-4 md:p-5 rounded-xl text-left transition-all duration-300 animate-fadeIn ${
                  isSelected
                    ? `bg-white dark:bg-gray-800 border-2 ${role.borderColor} shadow-2xl scale-[1.02]`
                    : 'bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl hover:scale-[1.01]'
                }`}
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                )}

                {/* Icon and title */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`relative p-2.5 rounded-lg transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-br ${role.accentColor} shadow-lg`
                        : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-base md:text-lg font-bold text-black dark:text-white mb-0.5">
                      {role.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {role.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 ml-1">
                  {role.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <span
                        className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 transition-all duration-300 ${
                          isSelected
                            ? `bg-gradient-to-r ${role.accentColor}`
                            : 'bg-gray-400 dark:bg-gray-600'
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Continue Button */}
        <div
          className="flex justify-center animate-fadeIn"
          style={{ animationDelay: '0.8s' }}
        >
          <button
            onClick={handleContinue}
            disabled={!selectedRole || isSubmitting}
            className={`group flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-base transition-all duration-300 ${
              selectedRole && !isSubmitting
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <div
          className="text-center mt-4 animate-fadeIn"
          style={{ animationDelay: '0.9s' }}
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline-offset-4 hover:underline"
          >
            Skip for now
          </button>
        </div>

        {/* Feature highlights */}
        <div
          className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-800 animate-fadeIn"
          style={{ animationDelay: '1s' }}
        >
          <div className="flex flex-wrap justify-center gap-5 md:gap-8 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Synaptic Powered Learning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
              <span>10+ Learning Modes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Spaced Repetition</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p
          className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500 animate-fadeIn"
          style={{ animationDelay: '1.1s' }}
        >
          © 2025 Synaptic. All rights reserved. ካንእ
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
