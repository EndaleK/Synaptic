'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  BookOpen,
  Target,
  Calendar,
  AlertCircle,
  Flame,
  Brain,
  FileText,
  Download,
  UserPlus,
  X,
  CheckCircle,
  Library,
} from 'lucide-react'

interface StudentSummary {
  id: number
  name: string
  email: string
  relationship: string
  permissionLevel: string
  currentStreak: number
  longestStreak: number
  totalStudyMinutes: number
  weeklyStudyMinutes: number
  totalFlashcards: number
  flashcardsReviewedWeek: number
  averageAccuracy: number
  assignmentsCompleted: number
  assignmentsPending: number
  averageScore: number | null
  lastActiveAt: string | null
  recentActivity: Array<{
    type: string
    description: string
    timestamp: string
  }>
}

interface AggregateStats {
  totalStudents: number
  totalStudyMinutesAllStudents: number
  totalFlashcardsAllStudents: number
  averageStreakAllStudents: number
  studentsActiveToday: number
}

interface DashboardData {
  success: boolean
  students: StudentSummary[]
  aggregateStats: AggregateStats
  parentName: string
}

export default function ParentDashboardPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [addStudentForm, setAddStudentForm] = useState({
    studentEmail: '',
    relationship: 'guardian',
    permissionLevel: 'view_only',
  })
  const [addStudentLoading, setAddStudentLoading] = useState(false)
  const [addStudentError, setAddStudentError] = useState<string | null>(null)
  const [addStudentSuccess, setAddStudentSuccess] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const res = await fetch('/api/parent/dashboard', { credentials: 'include' })

      if (!res.ok) {
        if (res.status === 404) {
          setError('Profile not found. Please complete your profile setup.')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await res.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    setAddStudentLoading(true)
    setAddStudentError(null)
    setAddStudentSuccess(false)

    try {
      const res = await fetch('/api/student-guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addStudentForm),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to link student')
      }

      setAddStudentSuccess(true)
      setAddStudentForm({
        studentEmail: '',
        relationship: 'guardian',
        permissionLevel: 'view_only',
      })

      // Refresh dashboard data
      setTimeout(() => {
        setShowAddStudentModal(false)
        setAddStudentSuccess(false)
        fetchDashboardData()
      }, 1500)
    } catch (err) {
      setAddStudentError(err instanceof Error ? err.message : 'Failed to link student')
    } finally {
      setAddStudentLoading(false)
    }
  }

  function formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  function getRelationshipDisplay(relationship: string): string {
    const map: Record<string, string> = {
      mother: 'Mother',
      father: 'Father',
      guardian: 'Guardian',
      grandparent: 'Grandparent',
      other: 'Other',
    }
    return map[relationship] || relationship
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Destructure with fallbacks for each property to handle incomplete API responses
  const students = dashboardData?.students ?? []
  const parentName = dashboardData?.parentName ?? 'Parent'
  const aggregateStats: AggregateStats = {
    totalStudents: dashboardData?.aggregateStats?.totalStudents ?? 0,
    totalStudyMinutesAllStudents: dashboardData?.aggregateStats?.totalStudyMinutesAllStudents ?? 0,
    totalFlashcardsAllStudents: dashboardData?.aggregateStats?.totalFlashcardsAllStudents ?? 0,
    averageStreakAllStudents: dashboardData?.aggregateStats?.averageStreakAllStudents ?? 0,
    studentsActiveToday: dashboardData?.aggregateStats?.studentsActiveToday ?? 0,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Parent Dashboard</h1>
              <p className="text-sm text-slate-600">
                Welcome back, {parentName || 'Parent'}
              </p>
            </div>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Link Student
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{aggregateStats.totalStudents}</p>
                <p className="text-sm text-slate-600">Students</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{aggregateStats.studentsActiveToday}</p>
                <p className="text-sm text-slate-600">Active Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{aggregateStats.averageStreakAllStudents}</p>
                <p className="text-sm text-slate-600">Avg Streak</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatTime(aggregateStats.totalStudyMinutesAllStudents)}
                </p>
                <p className="text-sm text-slate-600">Total Study</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {aggregateStats.totalFlashcardsAllStudents}
                </p>
                <p className="text-sm text-slate-600">Flashcards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Students Linked</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Link your children&apos;s accounts to monitor their study progress, view assignments, and track their learning journey.
            </p>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Link Your First Student
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Your Students</h2>

            {students.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Student Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{student.name}</h3>
                        <p className="text-sm text-slate-600">
                          {getRelationshipDisplay(student.relationship)} • {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.lastActiveAt &&
                          new Date(student.lastActiveAt).toDateString() === new Date().toDateString()
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {student.lastActiveAt &&
                         new Date(student.lastActiveAt).toDateString() === new Date().toDateString()
                          ? 'Active Today'
                          : `Last active: ${formatDate(student.lastActiveAt)}`}
                      </span>
                      <button
                        onClick={() => router.push(`/dashboard/parent/${student.id}/reports`)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Reports"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                  {/* Study Streak */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium text-slate-700">Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{student.currentStreak} days</p>
                    <p className="text-xs text-slate-600 mt-1">Best: {student.longestStreak} days</p>
                  </div>

                  {/* Study Time */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Study Time</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatTime(student.weeklyStudyMinutes)}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      This week • Total: {formatTime(student.totalStudyMinutes)}
                    </p>
                  </div>

                  {/* Flashcards */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium text-slate-700">Flashcards</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{student.totalFlashcards}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {student.flashcardsReviewedWeek} reviewed this week
                    </p>
                  </div>

                  {/* Accuracy */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-slate-700">Accuracy</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{student.averageAccuracy}%</p>
                    <p className="text-xs text-slate-600 mt-1">Flashcard review accuracy</p>
                  </div>
                </div>

                {/* Assignments Section (if enrolled in classes) */}
                {(student.assignmentsCompleted > 0 || student.assignmentsPending > 0) && (
                  <div className="border-t border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-slate-900">Assignments</h4>
                      {student.averageScore !== null && (
                        <span className="text-sm text-slate-600">
                          Average Score: <span className="font-semibold">{student.averageScore}%</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold">{student.assignmentsCompleted}</span> completed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold">{student.assignmentsPending}</span> pending
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {student.recentActivity.length > 0 && (
                  <div className="border-t border-slate-100 p-6">
                    <h4 className="font-medium text-slate-900 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {student.recentActivity.slice(0, 3).map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div className="h-2 w-2 bg-indigo-400 rounded-full" />
                          <span className="text-slate-700">{activity.description}</span>
                          <span className="text-slate-400 ml-auto">{formatDate(activity.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {students.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/parent/library')}
              className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                <Library className="h-6 w-6 text-amber-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Curriculum Library</h3>
                <p className="text-sm text-slate-600">Browse shared resources</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => router.push('/dashboard/parent/reports')}
              className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Progress Reports</h3>
                <p className="text-sm text-slate-600">Generate and view progress reports</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => router.push('/dashboard/parent/curriculum')}
              className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Curriculum Progress</h3>
                <p className="text-sm text-slate-600">Track curriculum unit completion</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Link Student Account</h2>
              <button
                onClick={() => {
                  setShowAddStudentModal(false)
                  setAddStudentError(null)
                  setAddStudentSuccess(false)
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              {addStudentSuccess ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Student Linked!</h3>
                  <p className="text-slate-600">The student has been added to your dashboard.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Student&apos;s Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={addStudentForm.studentEmail}
                      onChange={(e) =>
                        setAddStudentForm({ ...addStudentForm, studentEmail: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="student@example.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      The email address used for your child&apos;s Synaptic account
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Your Relationship
                    </label>
                    <select
                      value={addStudentForm.relationship}
                      onChange={(e) =>
                        setAddStudentForm({ ...addStudentForm, relationship: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                      <option value="guardian">Guardian</option>
                      <option value="grandparent">Grandparent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Access Level
                    </label>
                    <select
                      value={addStudentForm.permissionLevel}
                      onChange={(e) =>
                        setAddStudentForm({ ...addStudentForm, permissionLevel: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="view_only">View Only - Basic progress monitoring</option>
                      <option value="view_grades">View Grades - Including assignment scores</option>
                      <option value="full_access">Full Access - Complete visibility</option>
                    </select>
                  </div>

                  {addStudentError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {addStudentError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddStudentModal(false)
                        setAddStudentError(null)
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addStudentLoading}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {addStudentLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Link Student
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
