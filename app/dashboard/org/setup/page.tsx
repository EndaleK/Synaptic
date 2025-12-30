'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  School,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react'

type OrganizationType = 'school' | 'co-op' | 'tutoring' | 'other'
type Step = 'org-details' | 'school-setup' | 'invite-team' | 'complete'

interface OrganizationData {
  name: string
  type: OrganizationType
  adminEmail: string
  schoolName?: string
  schoolType?: string
}

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'org-details', title: 'Organization', description: 'Basic details' },
  { id: 'school-setup', title: 'School', description: 'Add your school' },
  { id: 'invite-team', title: 'Team', description: 'Invite members' },
  { id: 'complete', title: 'Complete', description: 'Ready to go' },
]

export default function OrganizationSetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('org-details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [orgData, setOrgData] = useState<OrganizationData>({
    name: '',
    type: 'school',
    adminEmail: '',
  })

  const [inviteEmails, setInviteEmails] = useState('')

  // Check if user already has an organization
  useEffect(() => {
    checkExistingOrg()
  }, [])

  async function checkExistingOrg() {
    try {
      const res = await fetch('/api/organizations', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.organizations && data.organizations.length > 0) {
          // User already has an org, redirect to admin dashboard
          router.push('/dashboard/admin')
        }
      }
    } catch (err) {
      console.error('Error checking existing org:', err)
    }
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  async function handleCreateOrganization() {
    if (!orgData.name || !orgData.type) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: orgData.name,
          type: orgData.type,
          adminEmail: orgData.adminEmail || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      setOrganizationId(data.organization.id)
      setCurrentStep('school-setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSchool() {
    if (!orgData.schoolName) {
      // Skip school creation if no school name provided
      setCurrentStep('invite-team')
      return
    }

    if (!organizationId) {
      setError('Organization not created yet')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/organizations/${organizationId}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: orgData.schoolName,
          type: orgData.schoolType || 'other',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create school')
      }

      setSchoolId(data.school.id)
      setCurrentStep('invite-team')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create school')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendInvites() {
    if (!inviteEmails.trim()) {
      // Skip invites if none provided
      setCurrentStep('complete')
      return
    }

    if (!organizationId) {
      setError('Organization not created yet')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const emails = inviteEmails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.includes('@'))

      const res = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emails,
          role: 'teacher',
          schoolId: schoolId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invites')
      }

      setCurrentStep('complete')
    } catch (err) {
      // Don't block on invite failures - still allow completion
      console.error('Invite error:', err)
      setCurrentStep('complete')
    } finally {
      setLoading(false)
    }
  }

  function handleComplete() {
    router.push('/dashboard/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Your Organization
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create your organization to start managing classes and students
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-2 text-gray-600 dark:text-gray-400 hidden sm:block">
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-full h-1 mx-2 rounded ${
                    index < currentStepIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ width: '60px' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {currentStep === 'org-details' && (
            <OrgDetailsStep
              data={orgData}
              onChange={setOrgData}
              onNext={handleCreateOrganization}
              loading={loading}
            />
          )}

          {currentStep === 'school-setup' && (
            <SchoolSetupStep
              data={orgData}
              onChange={setOrgData}
              onNext={handleCreateSchool}
              onBack={() => setCurrentStep('org-details')}
              loading={loading}
            />
          )}

          {currentStep === 'invite-team' && (
            <InviteTeamStep
              inviteEmails={inviteEmails}
              onChange={setInviteEmails}
              onNext={handleSendInvites}
              onBack={() => setCurrentStep('school-setup')}
              loading={loading}
            />
          )}

          {currentStep === 'complete' && (
            <CompleteStep
              orgName={orgData.name}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Step 1: Organization Details
function OrgDetailsStep({
  data,
  onChange,
  onNext,
  loading,
}: {
  data: OrganizationData
  onChange: (data: OrganizationData) => void
  onNext: () => void
  loading: boolean
}) {
  const orgTypes: { id: OrganizationType; label: string; description: string; icon: React.ReactNode }[] = [
    { id: 'school', label: 'School / District', description: 'K-12 school or school district', icon: <School className="w-6 h-6" /> },
    { id: 'co-op', label: 'Homeschool Co-op', description: 'Group of homeschooling families', icon: <Users className="w-6 h-6" /> },
    { id: 'tutoring', label: 'Tutoring Center', description: 'Private tutoring business', icon: <Building2 className="w-6 h-6" /> },
    { id: 'other', label: 'Other', description: 'University, corporate, or other', icon: <Sparkles className="w-6 h-6" /> },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Tell us about your organization
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="e.g., Westview Academy"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Organization Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {orgTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onChange({ ...data, type: type.id })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  data.type === type.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'
                }`}
              >
                <div className={`mb-2 ${data.type === type.id ? 'text-violet-600' : 'text-gray-400'}`}>
                  {type.icon}
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {type.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Admin Email (optional)
          </label>
          <input
            type="email"
            value={data.adminEmail}
            onChange={(e) => onChange({ ...data, adminEmail: e.target.value })}
            placeholder="admin@yourschool.edu"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to use your account email
          </p>
        </div>

        <button
          onClick={onNext}
          disabled={loading || !data.name}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Step 2: School Setup
function SchoolSetupStep({
  data,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  data: OrganizationData
  onChange: (data: OrganizationData) => void
  onNext: () => void
  onBack: () => void
  loading: boolean
}) {
  const schoolTypes = [
    { id: 'elementary', label: 'Elementary School' },
    { id: 'middle', label: 'Middle School' },
    { id: 'high', label: 'High School' },
    { id: 'college', label: 'College/University' },
    { id: 'other', label: 'Other' },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Add Your First School
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        You can add more schools later from the admin dashboard
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            School Name
          </label>
          <input
            type="text"
            value={data.schoolName || ''}
            onChange={(e) => onChange({ ...data, schoolName: e.target.value })}
            placeholder="e.g., Westview High School"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            School Type
          </label>
          <select
            value={data.schoolType || ''}
            onChange={(e) => onChange({ ...data, schoolType: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Select type...</option>
            {schoolTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {data.schoolName ? 'Continue' : 'Skip for Now'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Step 3: Invite Team
function InviteTeamStep({
  inviteEmails,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  inviteEmails: string
  onChange: (emails: string) => void
  onNext: () => void
  onBack: () => void
  loading: boolean
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Invite Your Team
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Add teacher emails to send invitations. You can also do this later.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Teacher Emails
          </label>
          <textarea
            value={inviteEmails}
            onChange={(e) => onChange(e.target.value)}
            placeholder="teacher1@school.edu&#10;teacher2@school.edu&#10;teacher3@school.edu"
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            Enter one email per line, or separate with commas
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {inviteEmails.trim() ? 'Send Invites' : 'Skip for Now'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Step 4: Complete
function CompleteStep({
  orgName,
  onComplete,
}: {
  orgName: string
  onComplete: () => void
}) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        You&apos;re All Set!
      </h2>

      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        <strong>{orgName}</strong> has been created successfully.
        You can now start adding classes and inviting more team members.
      </p>

      <div className="space-y-4">
        <button
          onClick={onComplete}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors"
        >
          Go to Admin Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
