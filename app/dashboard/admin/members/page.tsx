'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Trash2,
  Shield,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react'
import type { OrganizationRole } from '@/lib/types/institutional'

interface Member {
  id: string
  userId: string
  email: string
  fullName: string | null
  role: OrganizationRole
  schoolId: string | null
  schoolName: string | null
  isActive: boolean
  acceptedAt: string | null
  createdAt: string
}

interface Invite {
  id: string
  email: string
  role: OrganizationRole
  schoolId: string | null
  expiresAt: string
  createdAt: string
}

const ROLE_LABELS: Record<OrganizationRole, string> = {
  org_admin: 'Organization Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  teaching_assistant: 'Teaching Assistant',
  parent: 'Parent',
  student: 'Student',
}

const ROLE_COLORS: Record<OrganizationRole, string> = {
  org_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  school_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  teacher: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  teaching_assistant: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  parent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  student: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

function MembersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showInviteModal = searchParams.get('action') === 'invite'

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<OrganizationRole | 'all'>('all')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(showInviteModal)

  useEffect(() => {
    fetchOrganizationAndMembers()
  }, [])

  useEffect(() => {
    if (showInviteModal) {
      setIsInviteModalOpen(true)
    }
  }, [showInviteModal])

  async function fetchOrganizationAndMembers() {
    try {
      setLoading(true)

      // Get user's organization
      const orgRes = await fetch('/api/organizations', { credentials: 'include' })
      if (!orgRes.ok) throw new Error('Failed to fetch organization')

      const orgData = await orgRes.json()
      if (!orgData.organizations?.length) {
        router.push('/dashboard/org/setup')
        return
      }

      const org = orgData.organizations[0]
      setOrganizationId(org.id)

      // Fetch members
      const membersRes = await fetch(`/api/organizations/${org.id}/members`, {
        credentials: 'include',
      })

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
        setPendingInvites(membersData.pendingInvites || [])
      }
    } catch (err) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.fullName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  async function handleRemoveMember(memberId: string) {
    if (!organizationId) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!res.ok) throw new Error('Failed to remove member')

      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error('Error removing member:', err)
      alert('Failed to remove member')
    }
  }

  async function handleChangeRole(memberId: string, newRole: OrganizationRole) {
    if (!organizationId) return

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (!res.ok) throw new Error('Failed to update role')

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
    } catch (err) {
      console.error('Error updating role:', err)
      alert('Failed to update role')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your organization&apos;s team members and invitations
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Members
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as OrganizationRole | 'all')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Pending Invitations ({pendingInvites.length})
          </h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-amber-200 dark:divide-amber-800">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invite.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invited as {ROLE_LABELS[invite.role]}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || roleFilter !== 'all'
                ? 'No members match your filters'
                : 'No team members yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onRemove={() => handleRemoveMember(member.id)}
                onChangeRole={(role) => handleChangeRole(member.id, role)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && organizationId && (
        <InviteModal
          organizationId={organizationId}
          onClose={() => {
            setIsInviteModalOpen(false)
            router.replace('/dashboard/admin/members')
          }}
          onSuccess={() => {
            setIsInviteModalOpen(false)
            router.replace('/dashboard/admin/members')
            fetchOrganizationAndMembers()
          }}
        />
      )}
    </div>
  )
}

function MemberRow({
  member,
  onRemove,
  onChangeRole,
}: {
  member: Member
  onRemove: () => void
  onChangeRole: (role: OrganizationRole) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-semibold">
          {member.fullName?.[0] || member.email[0].toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {member.fullName || member.email}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {member.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {member.schoolName && (
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {member.schoolName}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]} flex items-center gap-1`}
          >
            {ROLE_LABELS[member.role]}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showRoleMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowRoleMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                {(Object.entries(ROLE_LABELS) as [OrganizationRole, string][]).map(
                  ([role, label]) => (
                    <button
                      key={role}
                      onClick={() => {
                        onChangeRole(role)
                        setShowRoleMenu(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        role === member.role
                          ? 'text-violet-600 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    window.location.href = `mailto:${member.email}`
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onRemove()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Member
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteModal({
  organizationId,
  onClose,
  onSuccess,
}: {
  organizationId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<OrganizationRole>('teacher')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))

    if (emailList.length === 0) {
      setError('Please enter at least one valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emails: emailList,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitations')
      }

      setSuccess(true)
      setTimeout(onSuccess, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invitations Sent!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Team members will receive an email to join your organization.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Invite Team Members
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="teacher1@school.edu&#10;teacher2@school.edu"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  One email per line, or separate with commas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as OrganizationRole)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="teacher">Teacher</option>
                  <option value="teaching_assistant">Teaching Assistant</option>
                  <option value="school_admin">School Admin</option>
                  <option value="org_admin">Organization Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !emails.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Send Invitations
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    }>
      <MembersPageContent />
    </Suspense>
  )
}
