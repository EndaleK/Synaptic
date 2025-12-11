'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle,
  Circle,
  PlayCircle,
  AlertCircle,
  Target,
  Calendar,
  BarChart3,
} from 'lucide-react'

interface CurriculumUnit {
  id: string
  title: string
  description: string | null
  subject: string | null
  standards: string[]
  start_date: string | null
  end_date: string | null
  order_index: number
  is_required: boolean
  estimated_hours: number | null
  progress: {
    status: string
    mastery_percent: number
    time_spent_minutes: number
  }
}

interface ClassWithUnits {
  classId: string
  className: string
  units: CurriculumUnit[]
  summary: {
    totalUnits: number
    completedUnits: number
    overallProgress: number
  }
}

interface LinkedStudent {
  id: number
  full_name: string
  email: string
}

export default function ParentCurriculumPage() {
  const router = useRouter()
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null)
  const [classesWithUnits, setClassesWithUnits] = useState<ClassWithUnits[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLinkedStudents()
  }, [])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentCurriculum(selectedStudent.id)
    }
  }, [selectedStudent])

  async function fetchLinkedStudents() {
    try {
      setLoading(true)
      const res = await fetch('/api/student-guardians?role=parent', {
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        const students = data.guardianships?.map((g: any) => ({
          id: g.student.id,
          full_name: g.student.full_name,
          email: g.student.email,
        })) || []
        setLinkedStudents(students)

        // Auto-select first student
        if (students.length > 0) {
          setSelectedStudent(students[0])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudentCurriculum(studentId: number) {
    try {
      setLoadingUnits(true)

      // First, get all classes the student is enrolled in
      const enrollmentsRes = await fetch(`/api/class-enrollments?studentId=${studentId}`, {
        credentials: 'include',
      })

      if (!enrollmentsRes.ok) {
        // Student might not be enrolled in any classes
        setClassesWithUnits([])
        return
      }

      const enrollmentsData = await enrollmentsRes.json()
      const enrollments = enrollmentsData.enrollments || []

      // Fetch curriculum units for each class
      const classesData: ClassWithUnits[] = []

      for (const enrollment of enrollments) {
        const unitsRes = await fetch(
          `/api/curriculum-units?classId=${enrollment.class_id}&studentId=${studentId}`,
          { credentials: 'include' }
        )

        if (unitsRes.ok) {
          const unitsData = await unitsRes.json()
          if (unitsData.units && unitsData.units.length > 0) {
            classesData.push({
              classId: enrollment.class_id,
              className: unitsData.className || 'Unknown Class',
              units: unitsData.units,
              summary: unitsData.summary,
            })
          }
        }
      }

      setClassesWithUnits(classesData)
    } catch (err) {
      console.error('Failed to fetch curriculum:', err)
    } finally {
      setLoadingUnits(false)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <PlayCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Circle className="h-5 w-5 text-slate-300" />
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      completed: 'Completed',
      in_progress: 'In Progress',
      not_started: 'Not Started',
    }
    return labels[status] || status
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  function formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading curriculum...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/parent')}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Curriculum Progress</h1>
                <p className="text-sm text-slate-600">
                  Track your child&apos;s progress through curriculum units
                </p>
              </div>
            </div>

            {/* Student Selector */}
            {linkedStudents.length > 1 && (
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const student = linkedStudents.find(s => s.id === parseInt(e.target.value))
                  setSelectedStudent(student || null)
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {linkedStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name || student.email}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {linkedStudents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Students Linked</h3>
            <p className="text-slate-600 mb-6">
              Link students to your account to view their curriculum progress.
            </p>
            <button
              onClick={() => router.push('/dashboard/parent')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Link a Student
            </button>
          </div>
        ) : loadingUnits ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-slate-600">Loading curriculum units...</p>
          </div>
        ) : classesWithUnits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Curriculum Units</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {selectedStudent?.full_name || 'This student'} is not enrolled in any classes with curriculum units, or their teacher hasn&apos;t created any units yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overall Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedStudent?.full_name}&apos;s Progress
                  </h2>
                  <p className="text-sm text-slate-600">
                    Across {classesWithUnits.length} class{classesWithUnits.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">Total Units</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {classesWithUnits.reduce((sum, c) => sum + c.summary.totalUnits, 0)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">
                    {classesWithUnits.reduce((sum, c) => sum + c.summary.completedUnits, 0)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {classesWithUnits.reduce((sum, c) => {
                      return sum + c.units.filter(u => u.progress.status === 'in_progress').length
                    }, 0)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">Not Started</p>
                  <p className="text-2xl font-bold text-slate-700">
                    {classesWithUnits.reduce((sum, c) => {
                      return sum + c.units.filter(u => u.progress.status === 'not_started').length
                    }, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Classes with Curriculum Units */}
            {classesWithUnits.map((classData) => (
              <div
                key={classData.classId}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Class Header */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{classData.className}</h3>
                      <p className="text-sm text-slate-600">
                        {classData.summary.completedUnits} of {classData.summary.totalUnits} units completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">
                        {classData.summary.overallProgress}%
                      </p>
                      <p className="text-xs text-slate-500">overall progress</p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${classData.summary.overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* Units List */}
                <div className="divide-y divide-slate-100">
                  {classData.units.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 pt-1">
                          {getStatusIcon(unit.progress.status)}
                        </div>

                        {/* Unit Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-slate-400">
                              Unit {unit.order_index + 1}
                            </span>
                            {unit.is_required && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                Required
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(unit.progress.status)}`}>
                              {getStatusLabel(unit.progress.status)}
                            </span>
                          </div>

                          <h4 className="text-lg font-medium text-slate-900 mb-1">
                            {unit.title}
                          </h4>

                          {unit.description && (
                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                              {unit.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            {unit.subject && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {unit.subject}
                              </span>
                            )}
                            {(unit.start_date || unit.end_date) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(unit.start_date)} - {formatDate(unit.end_date)}
                              </span>
                            )}
                            {unit.estimated_hours && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                ~{unit.estimated_hours}h estimated
                              </span>
                            )}
                          </div>

                          {/* Standards */}
                          {unit.standards && unit.standards.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {unit.standards.slice(0, 3).map((standard, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                                >
                                  {standard}
                                </span>
                              ))}
                              {unit.standards.length > 3 && (
                                <span className="px-2 py-1 text-slate-400 text-xs">
                                  +{unit.standards.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress Stats */}
                        <div className="flex-shrink-0 text-right">
                          <div className="mb-2">
                            <div className="flex items-center gap-1 justify-end">
                              <Target className="h-4 w-4 text-indigo-500" />
                              <span className="text-lg font-bold text-slate-900">
                                {unit.progress.mastery_percent}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">mastery</p>
                          </div>
                          {unit.progress.time_spent_minutes > 0 && (
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {formatTime(unit.progress.time_spent_minutes)}
                              </p>
                              <p className="text-xs text-slate-500">time spent</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mastery Progress Bar */}
                      {unit.progress.status !== 'not_started' && (
                        <div className="mt-4 ml-9">
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${unit.progress.mastery_percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
