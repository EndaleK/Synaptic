"use client"

import { useState } from 'react'
import { BookOpen, Target, Clock, Loader2 } from 'lucide-react'
import type { SelfStudyInput, EducationalLevel } from '@/lib/supabase/types'

interface SelfStudyFormProps {
  onSubmit: (data: SelfStudyInput) => void
  isLoading?: boolean
}

const GRADE_LEVELS: { value: EducationalLevel; label: string }[] = [
  { value: 'elementary', label: 'Elementary School (K-5)' },
  { value: 'middle_school', label: 'Middle School (6-8)' },
  { value: 'high_school', label: 'High School (9-12)' },
  { value: 'undergraduate', label: 'Undergraduate / College' },
  { value: 'graduate', label: 'Graduate / Masters' },
  { value: 'professional', label: 'Professional / Certification' },
]

const COMMON_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Psychology',
  'History',
  'English Literature',
  'Statistics',
  'Calculus',
  'Algebra',
  'Programming',
  'Data Science',
  'Machine Learning',
  'Finance',
  'Accounting',
  'Marketing',
  'Spanish',
  'French',
  'Art History',
  'Philosophy',
  'Political Science',
  'Sociology',
]

export default function SelfStudyForm({ onSubmit, isLoading }: SelfStudyFormProps) {
  const [gradeLevel, setGradeLevel] = useState<EducationalLevel>('undergraduate')
  const [subject, setSubject] = useState('')
  const [specificTopic, setSpecificTopic] = useState('')
  const [learningGoals, setLearningGoals] = useState('')
  const [durationWeeks, setDurationWeeks] = useState(4)
  const [hoursPerWeek, setHoursPerWeek] = useState(5)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredSubjects = subject.length > 0
    ? COMMON_SUBJECTS.filter((s) =>
        s.toLowerCase().includes(subject.toLowerCase())
      ).slice(0, 5)
    : []

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    onSubmit({
      gradeLevel,
      subject: subject.trim(),
      specificTopic: specificTopic.trim() || undefined,
      learningGoals: learningGoals.trim() || undefined,
      durationWeeks,
      hoursPerWeek,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Self-Study Plan
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tell us what you want to learn
        </p>
      </div>

      {/* Grade Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your Level
        </label>
        <select
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value as EducationalLevel)}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
            bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            appearance-none cursor-pointer"
        >
          {GRADE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subject / Topic *
        </label>
        <div className="relative">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setShowSuggestions(true)
              if (errors.subject) setErrors({ ...errors, subject: '' })
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="e.g., Calculus, Python Programming"
            className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white dark:bg-gray-800
              ${errors.subject ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
              focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>
        {errors.subject && (
          <p className="text-sm text-red-500 mt-1">{errors.subject}</p>
        )}
        {showSuggestions && filteredSubjects.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filteredSubjects.map((s) => (
              <li
                key={s}
                onClick={() => {
                  setSubject(s)
                  setShowSuggestions(false)
                }}
                className="px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer text-sm"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Specific Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Specific Topic (Optional)
        </label>
        <input
          type="text"
          value={specificTopic}
          onChange={(e) => setSpecificTopic(e.target.value)}
          placeholder="e.g., Differential Equations, Web Development"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
            bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Learning Goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Learning Goals (Optional)
        </label>
        <div className="relative">
          <Target className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            value={learningGoals}
            onChange={(e) => setLearningGoals(e.target.value)}
            placeholder="What do you want to achieve? e.g., Pass AP exam, build portfolio projects"
            rows={3}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
              bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
              resize-none"
          />
        </div>
      </div>

      {/* Duration & Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Duration (Weeks)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
                bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                appearance-none cursor-pointer"
            >
              {[1, 2, 4, 6, 8, 10, 12, 16, 20, 24].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'week' : 'weeks'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hours per Week
          </label>
          <select
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
              bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
              appearance-none cursor-pointer"
          >
            {[1, 2, 3, 5, 7, 10, 15, 20].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'hour' : 'hours'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estimated Total */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          <strong>Total study time:</strong> {durationWeeks * hoursPerWeek} hours over {durationWeeks} weeks
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
          text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Finding Resources...
          </>
        ) : (
          <>
            <BookOpen className="w-5 h-5" />
            Find Learning Resources
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        We'll search for free textbooks, courses, and create a personalized study plan
      </p>
    </form>
  )
}
