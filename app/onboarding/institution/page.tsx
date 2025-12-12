'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Globe,
  MapPin,
  Users,
  BookOpen,
  Shield,
} from 'lucide-react'

export default function InstitutionOnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Organization details
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<'school' | 'co-op' | 'umbrella' | 'tutoring' | 'other'>('school')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')

  async function handleCreateOrg() {
    if (!orgName.trim()) {
      setError('Organization name is required')
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
          description: description.trim() || undefined,
          website: website.trim() || undefined,
          location: location.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      // Update user role to institution admin
      await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          primary_role: 'institution',
          roles: ['institution'],
          onboarding_completed: true,
          onboarding_step: 'complete',
        }),
      })

      // Redirect to organization admin dashboard
      router.push('/dashboard/admin')
    } catch (err) {
      console.error('Error creating organization:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-amber-500/30" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-gray-900 dark:via-purple-950 dark:to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-purple/[0.03] dark:bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-amber-400 to-orange-500 dark:from-amber-800 dark:to-orange-700 opacity-30" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-orange-400 to-amber-500 dark:from-orange-800 dark:to-amber-700 opacity-30" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-xl shadow-amber-500/30">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
            Create Your <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Organization</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Set up your institution to start inviting teachers, managing
            curriculum, and tracking student progress.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Users className="h-4 w-4 text-amber-500" />
            Teacher Management
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <BookOpen className="h-4 w-4 text-orange-500" />
            Curriculum Sharing
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Shield className="h-4 w-4 text-amber-500" />
            Compliance Reports
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fadeIn">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Organization form */}
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg animate-fadeIn"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-all"
                placeholder="e.g., ABC Homeschool Association"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Type
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as typeof orgType)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-all appearance-none cursor-pointer"
              >
                <option value="school" className="bg-white dark:bg-gray-800">School / Academy</option>
                <option value="co-op" className="bg-white dark:bg-gray-800">Homeschool Co-op</option>
                <option value="umbrella" className="bg-white dark:bg-gray-800">Umbrella School</option>
                <option value="tutoring" className="bg-white dark:bg-gray-800">Tutoring Center</option>
                <option value="other" className="bg-white dark:bg-gray-800">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-all resize-none"
                placeholder="Brief description of your organization..."
              />
            </div>

            {/* Website */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="h-4 w-4 text-amber-500" />
                Website <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-all"
                placeholder="https://www.example.com"
              />
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Location <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-all"
                placeholder="City, State/Province"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleCreateOrg}
              disabled={isSubmitting || !orgName.trim()}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                isSubmitting || !orgName.trim()
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  Creating Organization...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Create Organization
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <p
          className="text-center mt-6 text-sm text-gray-500 dark:text-gray-500 animate-fadeIn"
          style={{ animationDelay: '0.4s' }}
        >
          After creating your organization, you'll be able to invite teachers
          and set up classes.
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
