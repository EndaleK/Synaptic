'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  School,
  CreditCard,
  Settings,
  Plus,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  BookOpen,
  BarChart3,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  type: string
  subscriptionTier: string
  maxSeats: number
  currentSeats: number
  createdAt: string
  role: string
}

interface DashboardStats {
  totalMembers: number
  totalSchools: number
  totalClasses: number
  totalStudents: number
  seatsUsed: number
  seatsAvailable: number
}

interface RecentActivity {
  id: string
  type: 'member_joined' | 'class_created' | 'assignment_created'
  description: string
  timestamp: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalSchools: 0,
    totalClasses: 0,
    totalStudents: 0,
    seatsUsed: 0,
    seatsAvailable: 100,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // Fetch user's organizations
      const orgRes = await fetch('/api/organizations', { credentials: 'include' })
      if (!orgRes.ok) {
        throw new Error('Failed to fetch organization')
      }

      const orgData = await orgRes.json()

      if (!orgData.organizations || orgData.organizations.length === 0) {
        // No organization, redirect to setup
        router.push('/dashboard/org/setup')
        return
      }

      // Use first organization (most users will only have one)
      const org = orgData.organizations[0]
      setOrganization({
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        subscriptionTier: org.subscription_tier,
        maxSeats: org.max_seats,
        currentSeats: org.current_seats,
        createdAt: org.created_at,
        role: org.role,
      })

      // Check if user has admin access
      if (org.role !== 'org_admin' && org.role !== 'school_admin') {
        setError('You do not have admin access to this organization')
        return
      }

      // Fetch organization stats
      try {
        const statsRes = await fetch(`/api/organizations/${org.id}/stats`, {
          credentials: 'include',
        })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (err) {
        // Stats API might not exist yet, use defaults
        console.log('Stats API not available, using defaults')
      }

      // Set default stats based on org data
      setStats(prev => ({
        ...prev,
        seatsUsed: org.current_seats || 0,
        seatsAvailable: org.max_seats || 100,
      }))

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
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

  if (!organization) {
    return null
  }

  const seatPercentage = (stats.seatsUsed / stats.seatsAvailable) * 100

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {organization.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="capitalize">{organization.type.replace('_', ' ')}</span>
              <span>•</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full capitalize">
                {organization.subscriptionTier}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/admin/settings')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="h-5 w-5" />
          Settings
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Team Members"
          value={stats.totalMembers}
          icon={Users}
          color="blue"
          onClick={() => router.push('/dashboard/admin/members')}
        />
        <StatCard
          title="Schools"
          value={stats.totalSchools}
          icon={School}
          color="purple"
          onClick={() => router.push('/dashboard/admin/schools')}
        />
        <StatCard
          title="Classes"
          value={stats.totalClasses}
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Seat Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Seat Usage
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.seatsUsed} of {stats.seatsAvailable} seats used
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin/billing')}
            className="flex items-center gap-2 px-4 py-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors text-sm font-medium"
          >
            <CreditCard className="h-4 w-4" />
            Manage Billing
          </button>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              seatPercentage > 90
                ? 'bg-red-500'
                : seatPercentage > 70
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(seatPercentage, 100)}%` }}
          />
        </div>
        {seatPercentage > 80 && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Running low on seats. Consider upgrading your plan.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <QuickActionCard
                title="Invite Team Members"
                description="Add teachers and staff to your organization"
                icon={UserPlus}
                onClick={() => router.push('/dashboard/admin/members?action=invite')}
              />
              <QuickActionCard
                title="Add School"
                description="Create a new school in your organization"
                icon={School}
                onClick={() => router.push('/dashboard/admin/schools/new')}
              />
              <QuickActionCard
                title="View Analytics"
                description="See usage and performance metrics"
                icon={BarChart3}
                onClick={() => router.push('/dashboard/admin/analytics')}
              />
              <QuickActionCard
                title="Manage Billing"
                description="Update payment and subscription"
                icon={CreditCard}
                onClick={() => router.push('/dashboard/admin/billing')}
              />
            </div>
          </div>
        </div>

        {/* Getting Started Checklist */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Getting Started
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <ChecklistItem
              label="Create organization"
              completed={true}
            />
            <ChecklistItem
              label="Add your first school"
              completed={stats.totalSchools > 0}
              onClick={() => router.push('/dashboard/admin/schools/new')}
            />
            <ChecklistItem
              label="Invite team members"
              completed={stats.totalMembers > 1}
              onClick={() => router.push('/dashboard/admin/members?action=invite')}
            />
            <ChecklistItem
              label="Create first class"
              completed={stats.totalClasses > 0}
              onClick={() => router.push('/dashboard/teacher/classes/new')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'purple' | 'green' | 'orange'
  onClick?: () => void
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-left transition-all group"
    >
      <Icon className="h-6 w-6 text-violet-600 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  )
}

function ChecklistItem({
  label,
  completed,
  onClick,
}: {
  label: string
  completed: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        completed
          ? 'bg-green-50 dark:bg-green-900/20'
          : onClick
          ? 'bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
          : 'bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          completed
            ? 'bg-green-500 text-white'
            : 'border-2 border-gray-300 dark:border-gray-600'
        }`}
      >
        {completed && <CheckCircle2 className="w-3 h-3" />}
      </div>
      <span
        className={`text-sm ${
          completed
            ? 'text-green-700 dark:text-green-400 line-through'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </span>
      {!completed && onClick && (
        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
      )}
    </div>
  )
}
