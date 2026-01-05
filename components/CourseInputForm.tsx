"use client"

import { useState } from 'react'
import { GraduationCap, School, BookOpen, Calendar, Loader2 } from 'lucide-react'
import type { CourseInput } from '@/lib/supabase/types'

interface CourseInputFormProps {
  onSubmit: (data: CourseInput) => void
  isLoading?: boolean
}

// Common universities for autocomplete
const TOP_UNIVERSITIES = [
  'Harvard University',
  'Stanford University',
  'MIT',
  'Yale University',
  'Princeton University',
  'Columbia University',
  'University of Chicago',
  'Duke University',
  'Northwestern University',
  'California Institute of Technology',
  'University of Pennsylvania',
  'Johns Hopkins University',
  'Brown University',
  'Cornell University',
  'Rice University',
  'Vanderbilt University',
  'University of Notre Dame',
  'UCLA',
  'UC Berkeley',
  'University of Michigan',
  'Carnegie Mellon University',
  'NYU',
  'University of Virginia',
  'Georgia Tech',
  'University of Texas at Austin',
  'University of Florida',
  'Ohio State University',
  'Penn State University',
  'University of Toronto',
  'McGill University',
  'University of British Columbia',
  'Oxford University',
  'Cambridge University',
  'Imperial College London',
  'University College London',
]

const SEMESTERS = ['Fall', 'Spring', 'Summer', 'Winter']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear + 1, currentYear - 1, currentYear - 2]

export default function CourseInputForm({ onSubmit, isLoading }: CourseInputFormProps) {
  const [university, setUniversity] = useState('')
  const [program, setProgram] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [semester, setSemester] = useState('Fall')
  const [year, setYear] = useState(currentYear)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredUniversities = university.length > 1
    ? TOP_UNIVERSITIES.filter((u) =>
        u.toLowerCase().includes(university.toLowerCase())
      ).slice(0, 5)
    : []

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!university.trim()) {
      newErrors.university = 'University is required'
    }

    if (!courseName.trim()) {
      newErrors.courseName = 'Course name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    onSubmit({
      university: university.trim(),
      program: program.trim() || undefined,
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      semester,
      year,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Course Information
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter your course details to search for syllabi
        </p>
      </div>

      {/* University */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          University / Institution *
        </label>
        <div className="relative">
          <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value)
              setShowSuggestions(true)
              if (errors.university) setErrors({ ...errors, university: '' })
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="e.g., Stanford University"
            className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white dark:bg-gray-800
              ${errors.university ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
              focus:ring-2 focus:ring-violet-500 focus:border-transparent
              transition-colors`}
          />
        </div>
        {errors.university && (
          <p className="text-sm text-red-500 mt-1">{errors.university}</p>
        )}
        {showSuggestions && filteredUniversities.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filteredUniversities.map((u) => (
              <li
                key={u}
                onClick={() => {
                  setUniversity(u)
                  setShowSuggestions(false)
                }}
                className="px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer text-sm"
              >
                {u}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Program (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Program / Department (Optional)
        </label>
        <input
          type="text"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          placeholder="e.g., Computer Science, Biology"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
            bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Course Code & Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Course Code
          </label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
            placeholder="e.g., CS 101"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
              bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Course Name *
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value)
                if (errors.courseName) setErrors({ ...errors, courseName: '' })
              }}
              placeholder="e.g., Introduction to Programming"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white dark:bg-gray-800
                ${errors.courseName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
            />
          </div>
          {errors.courseName && (
            <p className="text-sm text-red-500 mt-1">{errors.courseName}</p>
          )}
        </div>
      </div>

      {/* Semester & Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Semester
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
                bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent
                appearance-none cursor-pointer"
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl
              bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent
              appearance-none cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700
          text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Searching for Syllabus...
          </>
        ) : (
          <>
            <GraduationCap className="w-5 h-5" />
            Search for Course Syllabus
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        We'll search the web for course syllabi and generate a personalized study plan
      </p>
    </form>
  )
}
