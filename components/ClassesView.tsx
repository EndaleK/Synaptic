'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Loader2, GraduationCap, Search, BookOpen } from 'lucide-react'
import ClassCard from './ClassCard'
import JoinClassModal from './JoinClassModal'
import CreateClassModal from './CreateClassModal'
import { useUserStore } from '@/lib/store/useStore'

interface ClassData {
  id: string
  name: string
  subject?: string
  gradeLevel?: string
  sectionCode?: string
  description?: string
  joinCode: string
  maxStudents: number
  isArchived: boolean
  academicYear?: string
  semester?: string
  createdAt: string
  teacher: {
    id: string
    full_name: string
    email: string
  }
  school: {
    id: string
    name: string
    organization_id: string
  }
  enrollmentCount: number
}

interface UserRole {
  role: 'teacher' | 'student' | 'org_admin' | 'school_admin' | 'parent' | 'teaching_assistant'
  organizationId?: string
}

export default function ClassesView() {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  const { userProfile } = useUserStore()

  useEffect(() => {
    fetchClasses()
    fetchUserRole()
  }, [])

  const fetchClasses = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/classes')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes')
      }

      setClasses(data.classes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/user/context')
      if (response.ok) {
        const data = await response.json()
        if (data.organization) {
          setUserRole({
            role: data.organization.role,
            organizationId: data.organization.organizationId
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err)
    }
  }

  const isTeacher = userRole?.role === 'teacher' || userRole?.role === 'teaching_assistant' || userRole?.role === 'org_admin' || userRole?.role === 'school_admin'
  const isStudent = userRole?.role === 'student' || !userRole

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.teacher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleClassClick = (classId: string) => {
    // Navigate to class detail page
    window.location.href = `/dashboard/classes/${classId}`
  }

  const handleJoinSuccess = () => {
    fetchClasses()
  }

  const handleCreateSuccess = () => {
    fetchClasses()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isTeacher ? 'My Classes' : 'Enrolled Classes'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isTeacher
              ? 'Manage your classes and track student progress'
              : 'View your enrolled classes and assignments'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Join Class Button (always visible) */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Users className="w-4 h-4" />
            Join Class
          </button>

          {/* Create Class Button (teachers only) */}
          {isTeacher && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Class
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {classes.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes by name, subject, or teacher..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchClasses}
            className="mt-2 text-sm text-red-500 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && classes.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isTeacher ? 'No classes yet' : 'Not enrolled in any classes'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {isTeacher
              ? 'Create your first class to start adding students and assignments.'
              : 'Ask your teacher for a class code to join a class and start learning.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Users className="w-4 h-4" />
              Join with Code
            </button>
            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Class
              </button>
            )}
          </div>
        </div>
      )}

      {/* Classes Grid */}
      {filteredClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map(cls => (
            <ClassCard
              key={cls.id}
              id={cls.id}
              name={cls.name}
              subject={cls.subject}
              gradeLevel={cls.gradeLevel}
              description={cls.description}
              joinCode={cls.joinCode}
              enrollmentCount={cls.enrollmentCount}
              maxStudents={cls.maxStudents}
              teacher={cls.teacher}
              academicYear={cls.academicYear}
              semester={cls.semester}
              isTeacher={isTeacher}
              onClick={() => handleClassClick(cls.id)}
            />
          ))}
        </div>
      )}

      {/* No Search Results */}
      {classes.length > 0 && filteredClasses.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No classes found matching "{searchQuery}"
          </p>
        </div>
      )}

      {/* Modals */}
      <JoinClassModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
      />

      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
