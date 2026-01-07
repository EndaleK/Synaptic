"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import {
  GraduationCap,
  Upload,
  Search,
  BookOpen,
  ArrowRight,
  FileText,
  Sparkles,
  Clock,
  Target,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Zap,
} from "lucide-react"
import StudyPlanWizard from "@/components/StudyPlanWizard"
import Link from "next/link"

interface ExistingCourse {
  id: string
  name: string
  university?: string
  progress: number
  flashcardCount: number
  nextSession?: string
}

function CourseSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const [existingCourses, setExistingCourses] = useState<ExistingCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedMode, setSelectedMode] = useState<"syllabus" | "course" | "documents" | null>(null)

  // Check if we should auto-start wizard from query params
  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "syllabus" || mode === "course" || mode === "documents") {
      setSelectedMode(mode)
      setShowWizard(true)
    }
  }, [searchParams])

  // Fetch existing study plans/courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/study-plans", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          // Transform study plans into course format
          const courses = (data.plans || []).slice(0, 3).map((plan: any) => ({
            id: plan.id,
            name: plan.title || plan.exam_name,
            progress: Math.round((plan.completed_sessions / Math.max(plan.total_sessions, 1)) * 100),
            flashcardCount: plan.flashcard_count || 0,
            nextSession: plan.next_session_date,
          }))
          setExistingCourses(courses)
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded && user) {
      fetchCourses()
    } else if (isLoaded) {
      setLoading(false)
    }
  }, [isLoaded, user])

  const setupMethods = [
    {
      id: "syllabus" as const,
      title: "Upload Syllabus",
      description: "AI extracts topics, exams & creates your study schedule automatically",
      icon: Upload,
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-500/10",
      textColor: "text-violet-600 dark:text-violet-400",
      benefits: ["Auto-extract exam dates", "Topic breakdown", "Weighted study time"],
      recommended: true,
    },
    {
      id: "course" as const,
      title: "Search Course",
      description: "Find your course online and generate a syllabus from web sources",
      icon: Search,
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
      benefits: ["Find real syllabi", "University database", "AI enhancement"],
    },
    {
      id: "documents" as const,
      title: "From Documents",
      description: "Select from your uploaded textbooks and notes to create a plan",
      icon: FileText,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
      benefits: ["Use existing files", "Quick setup", "Flexible topics"],
    },
  ]

  const handleModeSelect = (mode: "syllabus" | "course" | "documents") => {
    setSelectedMode(mode)
    setShowWizard(true)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Back button */}
          <button
            onClick={() => {
              setShowWizard(false)
              setSelectedMode(null)
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to options
          </button>

          <StudyPlanWizard
            onClose={() => {
              setShowWizard(false)
              setSelectedMode(null)
            }}
            onComplete={(planId) => {
              router.push("/dashboard/study-plans")
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Course Setup
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Set up your course to get a personalized study plan, AI-powered flashcards, and exam preparation
          </p>
        </div>

        {/* Existing Courses (if any) */}
        {existingCourses.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Courses
              </h2>
              <Link
                href="/dashboard/study-plans"
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/dashboard/study-plans/${course.id}`}
                  className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {course.progress}%
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                    {course.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {course.flashcardCount} flashcards
                  </p>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Setup Methods */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {existingCourses.length > 0 ? "Add Another Course" : "Choose Setup Method"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {setupMethods.map((method) => {
              const Icon = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => handleModeSelect(method.id)}
                  className="relative p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all text-left group hover:shadow-lg hover:shadow-violet-500/5"
                >
                  {method.recommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm">
                      Recommended
                    </span>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {method.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {method.description}
                  </p>

                  {/* Benefits list */}
                  <ul className="space-y-1.5">
                    {method.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${method.textColor}`} />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* What happens next */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            What happens after setup?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Smart Schedule</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Daily study sessions tailored to your exam dates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">AI Flashcards</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Auto-generated cards with spaced repetition</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Progress Tracking</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">See your readiness for each topic</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CourseSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      }
    >
      <CourseSetupContent />
    </Suspense>
  )
}
