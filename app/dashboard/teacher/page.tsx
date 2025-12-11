'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  GraduationCap,
  FileText,
  Calendar,
  AlertCircle,
  Library,
} from 'lucide-react'

interface Class {
  id: string
  name: string
  subject: string | null
  gradeLevel: string | null
  sectionCode: string | null
  joinCode: string
  enrollmentCount: number
  maxStudents: number
  school: {
    name: string
  } | null
}

interface Assignment {
  id: string
  title: string
  type: string
  dueDate: string | null
  isPublished: boolean
  class: {
    id: string
    name: string
  }
}

interface DashboardStats {
  totalStudents: number
  activeClasses: number
  pendingSubmissions: number
  avgPerformance: number
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeClasses: 0,
    pendingSubmissions: 0,
    avgPerformance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // Fetch classes
      const classesRes = await fetch('/api/classes', { credentials: 'include' })
      if (!classesRes.ok) {
        if (classesRes.status === 403) {
          setError('You need to be part of an organization to access the teacher dashboard.')
          return
        }
        throw new Error('Failed to fetch classes')
      }
      const classesData = await classesRes.json()
      setClasses(classesData.classes || [])

      // Calculate stats from classes
      const totalStudents = classesData.classes?.reduce(
        (sum: number, c: Class) => sum + c.enrollmentCount,
        0
      ) || 0

      setStats({
        totalStudents,
        activeClasses: classesData.classes?.length || 0,
        pendingSubmissions: 0, // Would come from assignments API
        avgPerformance: 0, // Would come from analytics API
      })

      // Fetch assignments
      const assignmentsRes = await fetch('/api/assignments?status=upcoming', {
        credentials: 'include',
      })
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.assignments || [])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
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
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Contact your school administrator to get set up with an institutional account.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Teacher Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your classes and track student progress
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/classes/new')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Class
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Classes"
          value={stats.activeClasses}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingSubmissions}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Avg Performance"
          value={stats.avgPerformance > 0 ? `${stats.avgPerformance}%` : '-'}
          icon={TrendingUp}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Classes
            </h2>
            <button
              onClick={() => router.push('/dashboard/teacher/classes')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View All
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No classes yet. Create your first class to get started.
              </p>
              <button
                onClick={() => router.push('/dashboard/teacher/classes/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Create Class
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {classes.slice(0, 5).map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/teacher/classes/${cls.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cls.subject || 'No subject'} • {cls.sectionCode || 'No section'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {cls.enrollmentCount}/{cls.maxStudents}
                        </p>
                        <p className="text-xs text-gray-500">students</p>
                      </div>
                      <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                        {cls.joinCode}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Assignments */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Due Dates
              </h2>
            </div>

            {assignments.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No upcoming assignments</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {assignment.class.name}
                        </p>
                        {assignment.dueDate && (
                          <p className="text-xs text-orange-600 mt-1">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickActionButton
                label="Create Assignment"
                icon={FileText}
                onClick={() => router.push('/dashboard/teacher/assignments/new')}
              />
              <QuickActionButton
                label="Shared Library"
                icon={Library}
                onClick={() => router.push('/dashboard/teacher/library')}
              />
              <QuickActionButton
                label="View Analytics"
                icon={TrendingUp}
                onClick={() => router.push('/dashboard/teacher/analytics')}
              />
              <QuickActionButton
                label="Manage Students"
                icon={Users}
                onClick={() => router.push('/dashboard/teacher/students')}
              />
            </div>
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
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'purple' | 'orange' | 'green'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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

function QuickActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </button>
  )
}
