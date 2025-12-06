'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  FileText,
  Settings,
  Copy,
  CheckCircle,
  Plus,
  BarChart3,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Archive,
  UserMinus,
} from 'lucide-react'

interface ClassDetail {
  id: string
  name: string
  subject: string | null
  gradeLevel: string | null
  sectionCode: string | null
  description: string | null
  joinCode: string
  maxStudents: number
  allowSelfEnrollment: boolean
  isArchived: boolean
  academicYear: string | null
  semester: string | null
  enrollmentCount: number
  assignmentCount: number
  teacher: {
    id: string
    fullName: string
    email: string
  } | null
  school: {
    id: string
    name: string
  } | null
}

interface Student {
  enrollmentId: string
  enrolledAt: string
  status: string
  student: {
    id: string
    fullName: string
    email: string
  }
  stats: {
    cardsReviewed: number
    accuracy: number
  }
}

interface Assignment {
  id: string
  title: string
  type: string
  dueDate: string | null
  isPublished: boolean
  class: { id: string; name: string }
}

type Tab = 'students' | 'assignments' | 'analytics' | 'settings'

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = use(params)
  const router = useRouter()

  const [classData, setClassData] = useState<ClassDetail | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('students')
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    fetchClassData()
  }, [classId])

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents()
    } else if (activeTab === 'assignments') {
      fetchAssignments()
    }
  }, [activeTab, classId])

  async function fetchClassData() {
    try {
      setLoading(true)
      const res = await fetch(`/api/classes/${classId}`, { credentials: 'include' })

      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have access to this class')
        } else if (res.status === 404) {
          setError('Class not found')
        } else {
          setError('Failed to load class')
        }
        return
      }

      const data = await res.json()
      setClassData(data.class)
    } catch (err) {
      setError('Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudents() {
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (err) {
      console.error('Error fetching students:', err)
    }
  }

  async function fetchAssignments() {
    try {
      const res = await fetch(`/api/assignments?classId=${classId}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }
  }

  async function removeStudent(studentId: string) {
    if (!confirm('Remove this student from the class?')) return

    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId }),
      })

      if (res.ok) {
        setStudents(prev => prev.filter(s => s.student.id !== studentId))
      }
    } catch (err) {
      console.error('Error removing student:', err)
    }
  }

  function copyJoinCode() {
    if (!classData) return
    navigator.clipboard.writeText(classData.joinCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !classData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <p>{error || 'Class not found'}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/classes')}
          className="mt-4 text-purple-600 hover:text-purple-700"
        >
          Back to Classes
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/teacher/classes')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {classData.name}
              </h1>
              {classData.isArchived && (
                <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                  Archived
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {[classData.subject, classData.sectionCode, classData.gradeLevel ? `Grade ${classData.gradeLevel}` : null]
                .filter(Boolean)
                .join(' • ') || 'No details'}
            </p>
            {classData.school && (
              <p className="text-sm text-gray-500 mt-1">{classData.school.name}</p>
            )}
          </div>

          {/* Join Code */}
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Join Code</p>
            <button
              onClick={copyJoinCode}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {copiedCode ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-mono">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-lg tracking-wider">
                    {classData.joinCode}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Students"
          value={`${classData.enrollmentCount}/${classData.maxStudents}`}
          icon={Users}
        />
        <StatCard
          label="Assignments"
          value={classData.assignmentCount}
          icon={FileText}
        />
        <StatCard
          label="Semester"
          value={classData.semester || '-'}
          icon={Calendar}
        />
        <StatCard
          label="Year"
          value={classData.academicYear || '-'}
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-6">
          <TabButton
            active={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            icon={Users}
            label="Students"
            count={classData.enrollmentCount}
          />
          <TabButton
            active={activeTab === 'assignments'}
            onClick={() => setActiveTab('assignments')}
            icon={FileText}
            label="Assignments"
            count={classData.assignmentCount}
          />
          <TabButton
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            icon={BarChart3}
            label="Analytics"
          />
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={Settings}
            label="Settings"
          />
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <StudentsTab
          students={students}
          onRemoveStudent={removeStudent}
          classId={classId}
        />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTab
          assignments={assignments}
          classId={classId}
          router={router}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab classId={classId} students={students} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab classData={classData} onUpdate={fetchClassData} />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
        active
          ? 'border-purple-600 text-purple-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && (
        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
          {count}
        </span>
      )}
    </button>
  )
}

function StudentsTab({
  students,
  onRemoveStudent,
  classId,
}: {
  students: Student[]
  onRemoveStudent: (id: string) => void
  classId: string
}) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">No students enrolled yet</p>
        <p className="text-sm text-gray-500">Share the join code with your students</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                Student
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                Email
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                Cards Reviewed
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                Accuracy
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {students.map((enrollment) => (
              <tr
                key={enrollment.enrollmentId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {enrollment.student.fullName || 'Unknown'}
                  </p>
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {enrollment.student.email}
                </td>
                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                  {enrollment.stats.cardsReviewed}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      enrollment.stats.accuracy >= 80
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : enrollment.stats.accuracy >= 60
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {enrollment.stats.accuracy}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onRemoveStudent(enrollment.student.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove student"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssignmentsTab({
  assignments,
  classId,
  router,
}: {
  assignments: Assignment[]
  classId: string
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => router.push(`/dashboard/teacher/assignments/new?classId=${classId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          New Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No assignments yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              onClick={() => router.push(`/dashboard/teacher/assignments/${assignment.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {assignment.title}
                    </h3>
                    {!assignment.isPublished && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {assignment.type} •{' '}
                    {assignment.dueDate
                      ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}`
                      : 'No due date'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyticsTab({
  classId,
  students,
}: {
  classId: string
  students: Student[]
}) {
  const totalReviewed = students.reduce((sum, s) => sum + s.stats.cardsReviewed, 0)
  const avgAccuracy =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.stats.accuracy, 0) / students.length)
      : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Cards Reviewed</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalReviewed}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 mb-1">Class Average Accuracy</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {avgAccuracy}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 mb-1">Active Students</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {students.filter(s => s.stats.cardsReviewed > 0).length}/{students.length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Student Performance
        </h3>
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No student data available yet
          </p>
        ) : (
          <div className="space-y-3">
            {students
              .sort((a, b) => b.stats.accuracy - a.stats.accuracy)
              .map((student) => (
                <div key={student.enrollmentId} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.student.fullName || student.student.email}
                    </p>
                  </div>
                  <div className="w-48">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          student.stats.accuracy >= 80
                            ? 'bg-green-500'
                            : student.stats.accuracy >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${student.stats.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.stats.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsTab({
  classData,
  onUpdate,
}: {
  classData: ClassDetail
  onUpdate: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleArchive() {
    if (!confirm('Archive this class? Students will no longer be able to access it.')) {
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/classes/${classData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isArchived: true }),
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (err) {
      console.error('Error archiving class:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleSelfEnrollment() {
    try {
      setSaving(true)
      const res = await fetch(`/api/classes/${classData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowSelfEnrollment: !classData.allowSelfEnrollment }),
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (err) {
      console.error('Error updating settings:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Enrollment Settings
        </h3>

        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Allow Self-Enrollment
            </p>
            <p className="text-sm text-gray-500">
              Students can join using the class code
            </p>
          </div>
          <button
            onClick={toggleSelfEnrollment}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              classData.allowSelfEnrollment
                ? 'bg-purple-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                classData.allowSelfEnrollment ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Archive Class</p>
            <p className="text-sm text-gray-500">
              Hide this class from students. Can be restored later.
            </p>
          </div>
          <button
            onClick={handleArchive}
            disabled={saving || classData.isArchived}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            {classData.isArchived ? 'Archived' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}
