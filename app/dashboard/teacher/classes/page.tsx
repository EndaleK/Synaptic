'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  Archive,
  Copy,
  ChevronRight,
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
  isArchived: boolean
  academicYear: string | null
  semester: string | null
  school: {
    id: string
    name: string
  } | null
  teacher: {
    fullName: string
  } | null
}

export default function ClassesListPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchClasses()
  }, [showArchived])

  async function fetchClasses() {
    try {
      setLoading(true)
      const url = `/api/classes${showArchived ? '?includeArchived=true' : ''}`
      const res = await fetch(url, { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  function copyJoinCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const filteredClasses = classes.filter((cls) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      cls.name.toLowerCase().includes(query) ||
      cls.subject?.toLowerCase().includes(query) ||
      cls.sectionCode?.toLowerCase().includes(query) ||
      cls.joinCode.toLowerCase().includes(query)
    )
  })

  const activeClasses = filteredClasses.filter((c) => !c.isArchived)
  const archivedClasses = filteredClasses.filter((c) => c.isArchived)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Classes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {activeClasses.length} active class{activeClasses.length !== 1 ? 'es' : ''}
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

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 mb-4">No classes found</p>
          <button
            onClick={() => router.push('/dashboard/teacher/classes/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Create your first class
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Classes */}
          {activeClasses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeClasses.map((cls) => (
                  <ClassRow
                    key={cls.id}
                    cls={cls}
                    onCopyCode={copyJoinCode}
                    copiedCode={copiedCode}
                    onClick={() => router.push(`/dashboard/teacher/classes/${cls.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Classes */}
          {showArchived && archivedClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archived Classes
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 opacity-75">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {archivedClasses.map((cls) => (
                    <ClassRow
                      key={cls.id}
                      cls={cls}
                      onCopyCode={copyJoinCode}
                      copiedCode={copiedCode}
                      onClick={() => router.push(`/dashboard/teacher/classes/${cls.id}`)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClassRow({
  cls,
  onCopyCode,
  copiedCode,
  onClick,
}: {
  cls: Class
  onCopyCode: (code: string) => void
  copiedCode: string | null
  onClick: () => void
}) {
  return (
    <div
      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {cls.name}
            </h3>
            {cls.isArchived && (
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                Archived
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {[cls.subject, cls.sectionCode, cls.gradeLevel ? `Grade ${cls.gradeLevel}` : null]
              .filter(Boolean)
              .join(' • ') || 'No details'}
          </p>
          {cls.school && (
            <p className="text-xs text-gray-400 mt-1">{cls.school.name}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Student count */}
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {cls.enrollmentCount}/{cls.maxStudents}
            </span>
          </div>

          {/* Join code */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCopyCode(cls.joinCode)
            }}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Click to copy join code"
          >
            {copiedCode === cls.joinCode ? (
              <span className="text-green-600">Copied!</span>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                {cls.joinCode}
              </>
            )}
          </button>

          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
}
