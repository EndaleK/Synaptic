'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  Clock,
  Calendar,
  TrendingUp,
  ChevronRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  Timer,
  Users,
  GraduationCap,
} from 'lucide-react'

interface Class {
  id: string
  name: string
  subject: string | null
  teacher: {
    name: string | null
  } | null
  enrollmentCount: number
}

interface Assignment {
  id: string
  title: string
  type: string
  dueDate: string | null
  class: {
    id: string
    name: string
  }
  submission: {
    status: string
    score: number | null
  } | null
}

interface DashboardStats {
  enrolledClasses: number
  pendingAssignments: number
  completedToday: number
  currentStreak: number
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flashcards: BookOpen,
  quiz: FileText,
  exam: FileText,
  reading: FileText,
  podcast: Timer,
  mindmap: TrendingUp,
  study_guide: GraduationCap,
}

export default function StudentDashboardPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    enrolledClasses: 0,
    pendingAssignments: 0,
    completedToday: 0,
    currentStreak: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // Fetch enrolled classes
      const classesRes = await fetch('/api/student/classes', { credentials: 'include' })
      if (!classesRes.ok) {
        if (classesRes.status === 403) {
          setError('You need to be enrolled in a class to view the student dashboard.')
          return
        }
        throw new Error('Failed to fetch classes')
      }
      const classesData = await classesRes.json()
      setClasses(classesData.classes || [])

      // Fetch assignments
      const assignmentsRes = await fetch('/api/student/assignments?status=pending', {
        credentials: 'include',
      })
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.assignments || [])
      }

      // Calculate stats
      const pendingCount = (assignmentsData?.assignments || []).filter(
        (a: Assignment) => !a.submission || a.submission.status !== 'submitted'
      ).length

      setStats({
        enrolledClasses: classesData.classes?.length || 0,
        pendingAssignments: pendingCount,
        completedToday: 0, // Would come from activity API
        currentStreak: 0, // Would come from streak API
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  function getDueStatus(dueDate: string | null): { label: string; color: string } {
    if (!dueDate) return { label: 'No due date', color: 'text-gray-500' }

    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: 'Overdue', color: 'text-red-600' }
    if (diffDays === 0) return { label: 'Due today', color: 'text-orange-600' }
    if (diffDays === 1) return { label: 'Due tomorrow', color: 'text-yellow-600' }
    if (diffDays <= 7) return { label: `Due in ${diffDays} days`, color: 'text-blue-600' }
    return { label: `Due ${due.toLocaleDateString()}`, color: 'text-gray-600' }
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
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-6 w-6" />
          <p>{error}</p>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Ask your teacher for a class join code to get started.
        </p>
        <Link
          href="/dashboard/student/join"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Users className="h-4 w-4" />
          Join a Class
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Student Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your classes and complete assignments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Enrolled Classes"
          value={stats.enrolledClasses}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Pending Assignments"
          value={stats.pendingAssignments}
          icon={FileText}
          color="orange"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Day Streak"
          value={stats.currentStreak}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Assignments */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Assignments
              </h2>
              <Link
                href="/dashboard/student/assignments"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View All
              </Link>
            </div>

            {assignments.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  All caught up! No pending assignments.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {assignments.slice(0, 5).map((assignment) => {
                  const Icon = TYPE_ICONS[assignment.type] || FileText
                  const dueStatus = getDueStatus(assignment.dueDate)

                  return (
                    <Link
                      key={assignment.id}
                      href={`/dashboard/student/assignments/${assignment.id}`}
                      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {assignment.class.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${dueStatus.color}`}>
                            {dueStatus.label}
                          </span>
                          {assignment.submission?.status === 'submitted' && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                              Submitted
                            </span>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* My Classes */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                My Classes
              </h2>
              <Link
                href="/dashboard/student/classes"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View All
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="p-6 text-center">
                <GraduationCap className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  You're not enrolled in any classes yet.
                </p>
                <Link
                  href="/dashboard/student/join"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  Join a Class
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {classes.slice(0, 5).map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/dashboard/student/classes/${cls.id}`}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {cls.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {cls.teacher?.name || 'Unknown Teacher'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Quick Join */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/dashboard/student/join"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Users className="h-4 w-4" />
                Join Another Class
              </Link>
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
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'purple' | 'orange' | 'green' | 'blue'
}) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
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
