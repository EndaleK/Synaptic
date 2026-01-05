"use client"

import { useState } from 'react'
import {
  Calendar,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import type { GeneratedSyllabus, WeeklyScheduleItem } from '@/lib/supabase/types'

interface SyllabusPreviewProps {
  syllabus: GeneratedSyllabus
  onEdit?: (syllabus: GeneratedSyllabus) => void
  onCreatePlan?: () => void
  isCreatingPlan?: boolean
}

export default function SyllabusPreview({
  syllabus,
  onEdit,
  onCreatePlan,
  isCreatingPlan,
}: SyllabusPreviewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]))
  const [editingWeek, setEditingWeek] = useState<number | null>(null)
  const [editedTopic, setEditedTopic] = useState('')

  const toggleWeek = (week: number) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(week)) {
      newExpanded.delete(week)
    } else {
      newExpanded.add(week)
    }
    setExpandedWeeks(newExpanded)
  }

  const startEditing = (week: WeeklyScheduleItem) => {
    setEditingWeek(week.week)
    setEditedTopic(week.topic)
  }

  const saveEdit = (weekNum: number) => {
    if (!onEdit) return

    const updatedSchedule = syllabus.weeklySchedule.map((w) =>
      w.week === weekNum ? { ...w, topic: editedTopic } : w
    )

    onEdit({
      ...syllabus,
      weeklySchedule: updatedSchedule,
    })

    setEditingWeek(null)
  }

  const cancelEdit = () => {
    setEditingWeek(null)
    setEditedTopic('')
  }

  const confidenceColor =
    syllabus.confidenceScore >= 0.7
      ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      : syllabus.confidenceScore >= 0.4
        ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30'
        : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {syllabus.courseName}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {syllabus.courseDescription}
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 text-sm">
            <Calendar className="w-4 h-4 text-violet-500" />
            {syllabus.weeklySchedule.length} weeks
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${confidenceColor}`}>
            {syllabus.confidenceScore >= 0.7 ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {Math.round(syllabus.confidenceScore * 100)}% confidence
          </span>
        </div>
      </div>

      {/* Learning Objectives */}
      {syllabus.learningObjectives.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-violet-500" />
            Learning Objectives
          </h3>
          <ul className="space-y-2">
            {syllabus.learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="w-5 h-5 flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full text-xs font-medium flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-500" />
          Weekly Schedule
        </h3>

        {syllabus.weeklySchedule.map((week) => (
          <div
            key={week.week}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleWeek(week.week)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg text-sm font-semibold">
                  {week.week}
                </span>
                {editingWeek === week.week ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editedTopic}
                      onChange={(e) => setEditedTopic(e.target.value)}
                      className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(week.week)}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white text-left">
                    {week.topic}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onEdit && editingWeek !== week.week && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(week)
                    }}
                    className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {expandedWeeks.has(week.week) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {expandedWeeks.has(week.week) && (
              <div className="px-5 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700">
                {week.readings.length > 0 && (
                  <div className="pt-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                      Readings
                    </h4>
                    <ul className="space-y-1">
                      {week.readings.map((reading, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                          {reading}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {week.assignments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                      Assignments
                    </h4>
                    <ul className="space-y-1">
                      {week.assignments.map((assignment, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                          • {assignment}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {week.learningObjectives.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                      Week Objectives
                    </h4>
                    <ul className="space-y-1">
                      {week.learningObjectives.map((obj, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                          ✓ {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Textbooks */}
      {syllabus.textbooks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-violet-500" />
            Textbooks
          </h3>
          <ul className="space-y-3">
            {syllabus.textbooks.map((book, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-10 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {book.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {book.authors.join(', ')}
                  </p>
                  {book.required && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs rounded">
                      Required
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source URLs */}
      {syllabus.sourceUrls.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">Generated from:</p>
          <div className="flex flex-wrap gap-2">
            {syllabus.sourceUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                Source {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Create Plan Button */}
      {onCreatePlan && (
        <button
          onClick={onCreatePlan}
          disabled={isCreatingPlan}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700
            text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {isCreatingPlan ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Study Plan...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Create Study Plan from Syllabus
            </>
          )}
        </button>
      )}
    </div>
  )
}
