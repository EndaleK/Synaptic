'use client'

import { Users, Copy, CheckCircle, BookOpen, Calendar, Clock } from 'lucide-react'
import { useState } from 'react'

interface ClassCardProps {
  id: string
  name: string
  subject?: string
  gradeLevel?: string
  description?: string
  joinCode: string
  enrollmentCount: number
  maxStudents: number
  teacher?: {
    id: string
    full_name: string
    email: string
  }
  academicYear?: string
  semester?: string
  isTeacher?: boolean
  onClick?: () => void
}

export default function ClassCard({
  id,
  name,
  subject,
  gradeLevel,
  description,
  joinCode,
  enrollmentCount,
  maxStudents,
  teacher,
  academicYear,
  semester,
  isTeacher = false,
  onClick
}: ClassCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const enrollmentPercent = Math.round((enrollmentCount / maxStudents) * 100)

  return (
    <div
      onClick={onClick}
      className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          {subject && (
            <div className="flex items-center gap-2 mt-1">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {subject}
                {gradeLevel && ` - ${gradeLevel}`}
              </span>
            </div>
          )}
        </div>

        {/* Student count badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {enrollmentCount}/{maxStudents}
          </span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {description}
        </p>
      )}

      {/* Teacher info (for students) */}
      {!isTeacher && teacher && (
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Taught by <span className="font-medium text-gray-700 dark:text-gray-300">{teacher.full_name}</span>
        </div>
      )}

      {/* Schedule info */}
      {(academicYear || semester) && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {academicYear && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{academicYear}</span>
            </div>
          )}
          {semester && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="capitalize">{semester}</span>
            </div>
          )}
        </div>
      )}

      {/* Enrollment progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              enrollmentPercent >= 90
                ? 'bg-red-500'
                : enrollmentPercent >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${enrollmentPercent}%` }}
          />
        </div>
      </div>

      {/* Join code (for teachers) */}
      {isTeacher && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Join Code
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="font-mono text-sm font-bold text-gray-900 dark:text-white tracking-wider">
              {joinCode}
            </span>
            {copied ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
