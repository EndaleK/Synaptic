'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Settings,
  Copy,
  CheckCircle,
  Loader2,
  Plus,
  FileText,
  GraduationCap,
  BarChart3,
  Trash2,
  UserPlus,
  MoreHorizontal
} from 'lucide-react'

interface ClassData {
  id: string
  name: string
  subject?: string
  gradeLevel?: string
  sectionCode?: string
  description?: string
  joinCode: string
  maxStudents: number
  allowSelfEnrollment: boolean
  isArchived: boolean
  academicYear?: string
  semester?: string
  startDate?: string
  endDate?: string
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  teacher: {
    id: string
    full_name: string
    email: string
  }
  school: {
    id: string
    name: string
    organization_id: string
    organizations: {
      id: string
      name: string
      slug: string
    }
  }
  enrollmentCount: number
  assignmentCount: number
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

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'assignments' | 'analytics'>('overview')
  const [copied, setCopied] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)

  useEffect(() => {
    fetchClassData()
  }, [classId])

  useEffect(() => {
    if (activeTab === 'students' && classData) {
      fetchStudents()
    }
  }, [activeTab, classData])

  const fetchClassData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch class details
      const classResponse = await fetch(`/api/classes/${classId}`)
      const classResult = await classResponse.json()

      if (!classResponse.ok) {
        throw new Error(classResult.error || 'Failed to fetch class')
      }

      setClassData(classResult.class)

      // Check if current user is the teacher
      const contextResponse = await fetch('/api/user/context')
      if (contextResponse.ok) {
        const contextData = await contextResponse.json()
        const isClassTeacher = classResult.class.teacher?.id === contextData.userId
        const isAdmin = contextData.organization?.role === 'org_admin' ||
                       contextData.organization?.role === 'school_admin'
        setIsTeacher(isClassTeacher || isAdmin)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      const data = await response.json()

      if (response.ok) {
        setStudents(data.students || [])
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }

  const handleCopyCode = async () => {
    if (!classData) return
    try {
      await navigator.clipboard.writeText(classData.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading class...</p>
        </div>
      </div>
    )
  }

  if (error || !classData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Classes
        </button>
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-red-600 dark:text-red-400">{error || 'Class not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Classes
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {classData.name}
              </h1>
              {classData.isArchived && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  Archived
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {classData.subject && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{classData.subject}</span>
                  {classData.gradeLevel && <span>- {classData.gradeLevel}</span>}
                </div>
              )}
              {classData.academicYear && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{classData.academicYear}</span>
                </div>
              )}
              {classData.semester && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="capitalize">{classData.semester}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{classData.enrollmentCount} / {classData.maxStudents} students</span>
              </div>
            </div>

            {classData.description && (
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {classData.description}
              </p>
            )}

            {/* Teacher info (for students) */}
            {!isTeacher && classData.teacher && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Taught by <span className="font-medium text-gray-700 dark:text-gray-300">{classData.teacher.full_name}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isTeacher && (
              <>
                {/* Join Code */}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <span className="font-mono text-lg font-bold text-gray-900 dark:text-white tracking-wider">
                    {classData.joinCode}
                  </span>
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Settings */}
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-gray-500" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={<GraduationCap className="w-4 h-4" />}
          label="Overview"
        />
        <TabButton
          active={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          icon={<Users className="w-4 h-4" />}
          label="Students"
          count={classData.enrollmentCount}
        />
        <TabButton
          active={activeTab === 'assignments'}
          onClick={() => setActiveTab('assignments')}
          icon={<FileText className="w-4 h-4" />}
          label="Assignments"
          count={classData.assignmentCount}
        />
        {isTeacher && (
          <TabButton
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Analytics"
          />
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab classData={classData} isTeacher={isTeacher} />
      )}

      {activeTab === 'students' && (
        <StudentsTab
          students={students}
          isTeacher={isTeacher}
          classId={classId}
          onRefresh={fetchStudents}
        />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTab classId={classId} isTeacher={isTeacher} />
      )}

      {activeTab === 'analytics' && isTeacher && (
        <AnalyticsTab classId={classId} />
      )}
    </div>
  )
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  count
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        active
          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          active
            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// Overview Tab
function OverviewTab({ classData, isTeacher }: { classData: ClassData; isTeacher: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
        <div className="space-y-4">
          <StatItem
            label="Enrolled Students"
            value={`${classData.enrollmentCount} / ${classData.maxStudents}`}
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
          <StatItem
            label="Assignments"
            value={classData.assignmentCount.toString()}
            icon={<FileText className="w-5 h-5 text-purple-500" />}
          />
          <StatItem
            label="School"
            value={classData.school.name}
            icon={<GraduationCap className="w-5 h-5 text-emerald-500" />}
          />
        </div>
      </div>

      {/* Class Details */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Class Details</h3>
        <div className="space-y-3 text-sm">
          {classData.sectionCode && (
            <DetailItem label="Section Code" value={classData.sectionCode} />
          )}
          <DetailItem
            label="Self Enrollment"
            value={classData.allowSelfEnrollment ? 'Enabled' : 'Disabled'}
          />
          <DetailItem
            label="Created"
            value={new Date(classData.createdAt).toLocaleDateString()}
          />
          {classData.startDate && (
            <DetailItem
              label="Start Date"
              value={new Date(classData.startDate).toLocaleDateString()}
            />
          )}
          {classData.endDate && (
            <DetailItem
              label="End Date"
              value={new Date(classData.endDate).toLocaleDateString()}
            />
          )}
        </div>
      </div>

      {/* Teacher Actions */}
      {isTeacher && (
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <ActionButton icon={<Plus className="w-4 h-4" />} label="Create Assignment" />
            <ActionButton icon={<UserPlus className="w-4 h-4" />} label="Add Students" />
            <ActionButton icon={<FileText className="w-4 h-4" />} label="Share Materials" />
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
      {icon}
      {label}
    </button>
  )
}

// Students Tab
function StudentsTab({
  students,
  isTeacher,
  classId,
  onRefresh
}: {
  students: Student[]
  isTeacher: boolean
  classId: string
  onRefresh: () => void
}) {
  if (students.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No students enrolled
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Share the join code with students to get started
        </p>
        {isTeacher && (
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
            <UserPlus className="w-4 h-4" />
            Add Students
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Enrolled
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cards Reviewed
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Accuracy
            </th>
            {isTeacher && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {students.map((enrollment) => (
            <tr key={enrollment.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {enrollment.student.fullName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {enrollment.student.email}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(enrollment.enrolledAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {enrollment.stats.cardsReviewed}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-medium ${
                  enrollment.stats.accuracy >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : enrollment.stats.accuracy >= 60
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {enrollment.stats.accuracy}%
                </span>
              </td>
              {isTeacher && (
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Assignments Tab
function AssignmentsTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No assignments yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {isTeacher
          ? 'Create your first assignment to get started'
          : 'Your teacher hasn\'t created any assignments yet'}
      </p>
      {isTeacher && (
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />
          Create Assignment
        </button>
      )}
    </div>
  )
}

// Analytics Tab
function AnalyticsTab({ classId }: { classId: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
      <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Analytics Coming Soon
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        Track student progress, engagement, and performance metrics
      </p>
    </div>
  )
}
