"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  FileText,
  Clock,
  Target,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  BookOpen,
  Mic,
  Network,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CalendarDays,
  Info,
  Upload,
  Plus,
  Trash2,
} from "lucide-react"
import SyllabusUploader from "./SyllabusUploader"
import CourseInputForm from "./CourseInputForm"
import SelfStudyForm from "./SelfStudyForm"
import SyllabusPreview from "./SyllabusPreview"
import ResourceCard from "./ResourceCard"
import type {
  GeneratedSyllabus,
  EducationalResource,
  CourseInput,
  SelfStudyInput,
  LearningStyle,
} from "@/lib/supabase/types"

// ============================================
// Types
// ============================================

interface Document {
  id: string
  file_name: string
  file_type: string
  created_at: string
  extracted_text?: string
  analysis?: {
    complexityScore: number
    estimatedStudyHours: number
    topics: Array<{ title: string; difficulty: string }>
  }
}

interface ParsedExam {
  name: string
  date: string | null
  weight: number | null
  topics: string[]
}

interface ParsedTopic {
  name: string
  chapters: string[]
  weight: number | null
  estimatedHours: number | null
}

interface SyllabusParseResult {
  courseName: string | null
  instructor: string | null
  exams: ParsedExam[]
  topics: ParsedTopic[]
  assignmentDates: Array<{ name: string; date: string }>
  rawExtraction: string
}

interface TopicInput {
  name: string
  weight: number
  estimatedHours: number
  prerequisites?: string[]
  documentIds?: string[]
}

interface StudyPlanPreview {
  title: string
  examDate: string
  totalEstimatedHours: number
  sessionsTotal: number
  sessions: Array<{
    scheduledDate: string
    mode: string
    topic?: string
    documentName?: string
    sessionType: string
    estimatedMinutes: number
  }>
  documents: Array<{
    documentName: string
    estimatedHours: number
    topics: Array<{ title: string }>
  }>
}

type InputMode = "syllabus" | "documents" | "course"
type CourseType = "syllabus-search" | "self-study"
type WizardStep =
  | "input-mode"
  | "syllabus"
  | "documents"
  | "exam"
  | "topics"
  | "schedule"
  | "preview"
  | "complete"
  // Course mode steps
  | "course-type"
  | "course-input"
  | "course-search"
  | "syllabus-preview"
  | "resources"

// ============================================
// Component
// ============================================

interface StudyPlanWizardProps {
  examDate?: string
  examTitle?: string
  examEventId?: string
  onClose?: () => void
  onComplete?: (planId: string) => void
}

export default function StudyPlanWizard({
  examDate: initialExamDate,
  examTitle: initialExamTitle,
  examEventId,
  onClose,
  onComplete,
}: StudyPlanWizardProps) {
  const router = useRouter()

  // Wizard state
  const [inputMode, setInputMode] = useState<InputMode | null>(null)
  const [step, setStep] = useState<WizardStep>("input-mode")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [examDate, setExamDate] = useState(initialExamDate || "")
  const [examTitle, setExamTitle] = useState(initialExamTitle || "")
  const [dailyHours, setDailyHours] = useState(2)
  const [includeWeekends, setIncludeWeekends] = useState(true)
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])

  // Syllabus mode state
  const [syllabusData, setSyllabusData] = useState<SyllabusParseResult | null>(null)
  const [syllabusDocumentId, setSyllabusDocumentId] = useState<string | undefined>()
  const [selectedExam, setSelectedExam] = useState<ParsedExam | null>(null)
  const [topics, setTopics] = useState<TopicInput[]>([])

  // Preview state
  const [preview, setPreview] = useState<StudyPlanPreview | null>(null)
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null)

  // Course mode state
  const [courseType, setCourseType] = useState<CourseType | null>(null)
  const [courseInput, setCourseInput] = useState<CourseInput | null>(null)
  const [selfStudyInput, setSelfStudyInput] = useState<SelfStudyInput | null>(null)
  const [generatedSyllabus, setGeneratedSyllabus] = useState<GeneratedSyllabus | null>(null)
  const [availableResources, setAvailableResources] = useState<EducationalResource[]>([])
  const [selectedResources, setSelectedResources] = useState<EducationalResource[]>([])
  const [courseSearchProgress, setCourseSearchProgress] = useState(0)
  const [courseSearchMessage, setCourseSearchMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Fetch user's documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("/api/documents", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error("[StudyPlanWizard] Error fetching documents:", err)
      }
    }

    fetchDocuments()
  }, [])

  // Toggle document selection
  const toggleDocument = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    )
  }

  // Handle syllabus parsed
  const handleSyllabusParsed = useCallback((result: SyllabusParseResult, docId?: string) => {
    setSyllabusData(result)
    setSyllabusDocumentId(docId)

    // Pre-populate topics from parsed syllabus
    if (result.topics.length > 0) {
      setTopics(result.topics.map((t) => ({
        name: t.name,
        weight: t.weight || 50,
        estimatedHours: t.estimatedHours || 2,
        prerequisites: [],
        documentIds: docId ? [docId] : []
      })))
    }

    // Pre-select first exam if available
    if (result.exams.length > 0) {
      const firstExam = result.exams[0]
      setSelectedExam(firstExam)
      if (firstExam.date) {
        setExamDate(firstExam.date)
      }
      if (firstExam.name) {
        setExamTitle(firstExam.name)
      }
    }

    setStep("exam")
  }, [])

  // Topic management
  const handleAddTopic = () => {
    setTopics([
      ...topics,
      {
        name: "",
        weight: 50,
        estimatedHours: 2,
        prerequisites: [],
        documentIds: syllabusDocumentId ? [syllabusDocumentId] : []
      }
    ])
  }

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index))
  }

  const handleUpdateTopic = (index: number, field: keyof TopicInput, value: any) => {
    setTopics(topics.map((t, i) => (i === index ? { ...t, [field]: value } : t)))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Course syllabus search handler
  const handleCourseInputSubmit = async (data: CourseInput) => {
    setCourseInput(data)
    setIsSearching(true)
    setCourseSearchProgress(0)
    setCourseSearchMessage("Starting search...")
    setError(null)
    setStep("course-search")

    try {
      const response = await fetch("/api/course-syllabus/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to start syllabus search")
      }

      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6))

              if (eventData.type === "progress") {
                setCourseSearchProgress(eventData.progress)
                setCourseSearchMessage(eventData.message)
              } else if (eventData.type === "complete") {
                setGeneratedSyllabus(eventData.data.syllabus)
                setIsSearching(false)
                setStep("syllabus-preview")
              } else if (eventData.type === "error") {
                throw new Error(eventData.error)
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search for syllabus")
      setIsSearching(false)
      setStep("course-input")
    }
  }

  // Self-study search handler
  const handleSelfStudySubmit = async (data: SelfStudyInput) => {
    setSelfStudyInput(data)
    setIsSearching(true)
    setCourseSearchProgress(0)
    setCourseSearchMessage("Finding resources...")
    setError(null)
    setStep("course-search")

    try {
      const response = await fetch("/api/self-study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ input: data }),
      })

      if (!response.ok) {
        throw new Error("Failed to start resource search")
      }

      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6))

              if (eventData.type === "progress") {
                setCourseSearchProgress(eventData.progress)
                setCourseSearchMessage(eventData.message)
              } else if (eventData.type === "complete") {
                setAvailableResources(eventData.data.resources || [])
                setIsSearching(false)
                setStep("resources")
              } else if (eventData.type === "error") {
                throw new Error(eventData.error)
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find resources")
      setIsSearching(false)
      setStep("course-input")
    }
  }

  // Resource selection handlers
  const handleSelectResource = (resource: EducationalResource) => {
    setSelectedResources((prev) => [...prev, resource])
  }

  const handleRemoveResource = (resource: EducationalResource) => {
    setSelectedResources((prev) =>
      prev.filter((r) => r.external_id !== resource.external_id || r.source !== resource.source)
    )
  }

  // Handle syllabus edit
  const handleSyllabusEdit = (updated: GeneratedSyllabus) => {
    setGeneratedSyllabus(updated)
  }

  // Create plan from course syllabus
  const handleCreatePlanFromSyllabus = async () => {
    if (!generatedSyllabus) return

    setIsLoading(true)
    setError(null)

    try {
      // Calculate start and end dates based on syllabus weeks
      const weeks = generatedSyllabus.weeklySchedule.length
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + weeks * 7)

      // First save the syllabus
      const syllabusResponse = await fetch("/api/course-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          syllabus: generatedSyllabus,
          courseInput,
          createPlan: true,
          planOptions: {
            startDate: startDate || today.toISOString().split("T")[0],
            endDate: examDate || endDate.toISOString().split("T")[0],
            dailyTargetMinutes: dailyHours * 60,
            includeWeekends,
          },
        }),
      })

      if (!syllabusResponse.ok) {
        const errorData = await syllabusResponse.json()
        throw new Error(errorData.error || "Failed to save syllabus")
      }

      const data = await syllabusResponse.json()
      setCreatedPlanId(data.planId)
      setStep("complete")

      if (onComplete && data.planId) {
        onComplete(data.planId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan")
    } finally {
      setIsLoading(false)
    }
  }

  // Create plan from self-study resources
  const handleCreateSelfStudyPlan = async () => {
    if (!selfStudyInput || selectedResources.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + selfStudyInput.durationWeeks * 7)

      const response = await fetch("/api/self-study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          input: selfStudyInput,
          createPlan: true,
          planOptions: {
            startDate: startDate || today.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            dailyTargetMinutes: selfStudyInput.hoursPerWeek * 60 / 7,
            includeWeekends,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create study plan")
      }

      // Handle SSE for plan creation
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6))

              if (eventData.type === "complete" && eventData.data.plan) {
                setCreatedPlanId(eventData.data.plan.id)
                setStep("complete")

                if (onComplete && eventData.data.plan.id) {
                  onComplete(eventData.data.plan.id)
                }
              } else if (eventData.type === "error") {
                throw new Error(eventData.error)
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan")
    } finally {
      setIsLoading(false)
    }
  }

  // Generate preview
  const generatePreview = async () => {
    // Validate based on input mode
    if (inputMode === "documents") {
      if (selectedDocIds.length === 0) {
        setError("Please select at least one document")
        return
      }
    } else if (inputMode === "syllabus") {
      if (topics.length === 0) {
        setError("Please add at least one topic")
        return
      }
    }

    if (!examDate) {
      setError("Please set an exam date")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use appropriate API based on input mode
      const endpoint = inputMode === "syllabus" ? "/api/study-plans/generate" : "/api/study-plans"

      const body = inputMode === "syllabus"
        ? {
            examDate,
            examName: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
            topics,
            dailyTargetHours: dailyHours,
            startDate,
            includeWeekends,
            documentId: syllabusDocumentId,
            save: false,
          }
        : {
            examDate,
            examTitle: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
            examEventId,
            documentIds: selectedDocIds,
            dailyTargetHours: dailyHours,
            startDate,
            includeWeekends,
            save: false,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate preview")
      }

      const data = await response.json()
      setPreview(data.plan)
      setStep("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview")
    } finally {
      setIsLoading(false)
    }
  }

  // Create the plan
  const createPlan = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpoint = inputMode === "syllabus" ? "/api/study-plans/generate" : "/api/study-plans"

      const body = inputMode === "syllabus"
        ? {
            examDate,
            examName: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
            topics,
            dailyTargetHours: dailyHours,
            startDate,
            includeWeekends,
            documentId: syllabusDocumentId,
            save: true,
          }
        : {
            examDate,
            examTitle: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
            examEventId,
            documentIds: selectedDocIds,
            dailyTargetHours: dailyHours,
            startDate,
            includeWeekends,
            save: true,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create plan")
      }

      const data = await response.json()
      setCreatedPlanId(data.plan?.id || data.id)
      setStep("complete")

      if (onComplete) {
        onComplete(data.plan?.id || data.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate days until exam
  const daysUntilExam = examDate
    ? Math.ceil(
        (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  // Step content
  const renderStep = () => {
    switch (step) {
      case "input-mode":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Choose Your Starting Point
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                How would you like to create your study plan?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setInputMode("syllabus")
                  setStep("syllabus")
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      Upload Syllabus
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI extracts exam dates, topics & creates an optimized plan
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 ml-auto" />
                </div>
              </button>

              <button
                onClick={() => {
                  setInputMode("documents")
                  setStep("documents")
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      Select Documents
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose existing documents to study from
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 ml-auto" />
                </div>
              </button>

              <button
                onClick={() => {
                  setInputMode("course")
                  setStep("course-type")
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      Generate from Course/Topic
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Search for syllabi or find learning resources
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 ml-auto" />
                </div>
              </button>
            </div>
          </div>
        )

      case "syllabus":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Upload Your Syllabus
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We&apos;ll extract exam dates, topics, and create your study plan automatically.
              </p>
            </div>
            <SyllabusUploader
              onParsed={handleSyllabusParsed}
              onCancel={() => setStep("input-mode")}
            />
          </div>
        )

      case "exam":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Select Your Exam
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {syllabusData?.exams?.length
                  ? `We found ${syllabusData.exams.length} exam(s) in your syllabus`
                  : "Enter your exam details"}
              </p>
            </div>

            {syllabusData?.exams && syllabusData.exams.length > 0 && (
              <div className="space-y-2 mb-4">
                {syllabusData.exams.map((exam, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedExam(exam)
                      if (exam.date) setExamDate(exam.date)
                      if (exam.name) setExamTitle(exam.name)
                    }}
                    className={`w-full p-3 rounded-xl border transition-all text-left ${
                      selectedExam === exam
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{exam.name}</p>
                        <p className="text-sm text-gray-500">
                          {exam.date ? formatDate(exam.date) : "Date not specified"}
                          {exam.weight && ` • ${exam.weight}% of grade`}
                        </p>
                      </div>
                      {selectedExam === exam && (
                        <Check className="w-5 h-5 text-violet-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {syllabusData?.exams?.length ? "Or enter custom exam:" : ""}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exam Name
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => {
                    setExamTitle(e.target.value)
                    setSelectedExam(null)
                  }}
                  placeholder="e.g., Final Exam"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exam Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => {
                      setExamDate(e.target.value)
                      setSelectedExam(null)
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "topics":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Study Topics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review and adjust topics from your syllabus
                </p>
              </div>
              <button
                onClick={handleAddTopic}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={topic.name}
                        onChange={(e) => handleUpdateTopic(index, "name", e.target.value)}
                        placeholder="Topic name"
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Weight</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={topic.weight}
                              onChange={(e) => handleUpdateTopic(index, "weight", parseInt(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-xs text-gray-500 w-8">{topic.weight}%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Hours</label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={topic.estimatedHours}
                            onChange={(e) => handleUpdateTopic(index, "estimatedHours", parseFloat(e.target.value))}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTopic(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {topics.length === 0 && (
                <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <GraduationCap className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No topics yet. Add topics to study.
                  </p>
                </div>
              )}
            </div>

            {topics.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  Total: {topics.reduce((sum, t) => sum + t.estimatedHours, 0).toFixed(1)} hours across {topics.length} topic{topics.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        )

      case "documents":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Select Documents
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose the documents you want to include in your study plan.
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No documents found. Upload some documents first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left ${
                      selectedDocIds.includes(doc.id)
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedDocIds.includes(doc.id)
                          ? "border-violet-500 bg-violet-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedDocIds.includes(doc.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {doc.file_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedDocIds.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  {selectedDocIds.length} document{selectedDocIds.length > 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>
        )

      case "schedule":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Schedule Settings
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure your study schedule preferences.
              </p>
            </div>

            {/* Exam Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              {daysUntilExam > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {daysUntilExam} day{daysUntilExam > 1 ? "s" : ""} until exam
                </p>
              )}
            </div>

            {/* Exam Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Title (optional)
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g., Final Exam - Biology 101"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Studying
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  max={examDate}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Daily Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily Study Target
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                  {dailyHours}h/day
                </span>
              </div>
            </div>

            {/* Include Weekends */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Include Weekends
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Schedule study sessions on weekends
                </p>
              </div>
              <button
                onClick={() => setIncludeWeekends(!includeWeekends)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  includeWeekends ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    includeWeekends ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )

      case "preview":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Plan Preview
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review your study plan before creating it.
              </p>
            </div>

            {preview && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-center">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {Math.round(preview.totalEstimatedHours)}h
                    </p>
                    <p className="text-xs text-gray-500">Total Study</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {preview.sessionsTotal}
                    </p>
                    <p className="text-xs text-gray-500">Sessions</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {daysUntilExam}
                    </p>
                    <p className="text-xs text-gray-500">Days Left</p>
                  </div>
                </div>

                {/* Documents breakdown */}
                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Documents Included
                  </h4>
                  <div className="space-y-2">
                    {preview.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {doc.documentName}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {doc.estimatedHours.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample sessions */}
                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Upcoming Sessions
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {preview.sessions.slice(0, 5).map((session, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="text-gray-400 w-16">
                          {new Date(session.scheduledDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {session.mode}
                        </span>
                        <span className="text-gray-900 dark:text-white truncate flex-1">
                          {session.topic || session.documentName}
                        </span>
                      </div>
                    ))}
                    {preview.sessions.length > 5 && (
                      <p className="text-xs text-gray-400">
                        +{preview.sessions.length - 5} more sessions...
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )

      // Course mode steps
      case "course-type":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                What do you want to learn?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how you'd like to create your study plan
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setCourseType("syllabus-search")
                  setStep("course-input")
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      University Course
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Search for a course syllabus and generate a study plan
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 ml-auto" />
                </div>
              </button>

              <button
                onClick={() => {
                  setCourseType("self-study")
                  setStep("course-input")
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      Self-Study Topic
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Learn any subject with curated resources
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 ml-auto" />
                </div>
              </button>
            </div>
          </div>
        )

      case "course-input":
        return (
          <div className="space-y-4">
            {courseType === "syllabus-search" ? (
              <CourseInputForm
                onSubmit={handleCourseInputSubmit}
                isLoading={isSearching}
              />
            ) : (
              <SelfStudyForm
                onSubmit={handleSelfStudySubmit}
                isLoading={isSearching}
              />
            )}
          </div>
        )

      case "course-search":
        return (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {courseType === "syllabus-search"
                  ? "Searching for Syllabus..."
                  : "Finding Resources..."}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {courseSearchMessage}
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${courseSearchProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-400">
                {courseSearchProgress}% complete
              </p>
            </div>
          </div>
        )

      case "syllabus-preview":
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {generatedSyllabus && (
              <SyllabusPreview
                syllabus={generatedSyllabus}
                onEdit={handleSyllabusEdit}
                onCreatePlan={handleCreatePlanFromSyllabus}
                isCreatingPlan={isLoading}
              />
            )}
          </div>
        )

      case "resources":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Select Resources
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose the resources you want to study from
              </p>
            </div>

            {availableResources.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No resources found. Try a different search.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableResources.map((resource) => {
                  const isSelected = selectedResources.some(
                    (r) =>
                      r.external_id === resource.external_id &&
                      r.source === resource.source
                  )
                  return (
                    <ResourceCard
                      key={`${resource.source}-${resource.external_id}`}
                      resource={resource}
                      isSelected={isSelected}
                      onSelect={handleSelectResource}
                      onRemove={handleRemoveResource}
                      compact
                    />
                  )
                })}
              </div>
            )}

            {selectedResources.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  {selectedResources.length} resource
                  {selectedResources.length > 1 ? "s" : ""} selected
                </p>
              </div>
            )}

            {selectedResources.length > 0 && (
              <button
                onClick={handleCreateSelfStudyPlan}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
                  text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Study Plan...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    Create Study Plan
                  </>
                )}
              </button>
            )}
          </div>
        )

      case "complete":
        return (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Study Plan Created!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your personalized study schedule is ready. Check your dashboard for today's sessions.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
              >
                Go to Dashboard
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )
    }
  }

  // Navigation
  const canGoNext = () => {
    switch (step) {
      case "input-mode":
        return true
      case "syllabus":
        return !!syllabusData
      case "exam":
        return !!examDate && !!examTitle && daysUntilExam > 0
      case "topics":
        return topics.length > 0 && topics.every((t) => t.name.trim())
      case "documents":
        return selectedDocIds.length > 0
      case "schedule":
        return !!examDate && daysUntilExam > 0
      case "preview":
        return !!preview
      // Course mode steps - navigation is handled by buttons within the step
      case "course-type":
      case "course-input":
      case "course-search":
      case "syllabus-preview":
      case "resources":
        return false // These steps use internal buttons for navigation
      default:
        return false
    }
  }

  const handleNext = () => {
    if (inputMode === "syllabus") {
      // Syllabus flow
      if (step === "exam") {
        setStep("topics")
      } else if (step === "topics") {
        setStep("schedule")
      } else if (step === "schedule") {
        generatePreview()
      } else if (step === "preview") {
        createPlan()
      }
    } else {
      // Documents flow
      if (step === "documents") {
        setStep("schedule")
      } else if (step === "schedule") {
        generatePreview()
      } else if (step === "preview") {
        createPlan()
      }
    }
  }

  const handleBack = () => {
    if (inputMode === "syllabus") {
      // Syllabus flow
      if (step === "exam") {
        setStep("syllabus")
      } else if (step === "topics") {
        setStep("exam")
      } else if (step === "schedule") {
        setStep("topics")
      } else if (step === "preview") {
        setStep("schedule")
      }
    } else if (inputMode === "course") {
      // Course flow
      if (step === "course-type") {
        setStep("input-mode")
        setInputMode(null)
        setCourseType(null)
      } else if (step === "course-input") {
        setStep("course-type")
      } else if (step === "syllabus-preview") {
        setStep("course-input")
        setGeneratedSyllabus(null)
      } else if (step === "resources") {
        setStep("course-input")
        setAvailableResources([])
        setSelectedResources([])
      }
    } else {
      // Documents flow
      if (step === "documents") {
        setStep("input-mode")
        setInputMode(null)
      } else if (step === "schedule") {
        setStep("documents")
      } else if (step === "preview") {
        setStep("schedule")
      }
    }
  }

  const getStepNumber = () => {
    if (inputMode === "syllabus") {
      const syllabusSteps = ["syllabus", "exam", "topics", "schedule", "preview"]
      const idx = syllabusSteps.indexOf(step)
      return idx >= 0 ? idx + 1 : 1
    } else if (inputMode === "course") {
      const courseSteps = ["course-type", "course-input", "course-search", "syllabus-preview", "resources"]
      const idx = courseSteps.indexOf(step)
      return idx >= 0 ? idx + 1 : 1
    } else {
      const docSteps = ["documents", "schedule", "preview"]
      const idx = docSteps.indexOf(step)
      return idx >= 0 ? idx + 1 : 1
    }
  }

  const getTotalSteps = () => {
    if (inputMode === "syllabus") return 5
    if (inputMode === "course") return courseType === "syllabus-search" ? 4 : 3
    return 3
  }

  const currentStepNumber = getStepNumber()
  const totalSteps = getTotalSteps()

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {generatedSyllabus?.courseName || syllabusData?.courseName || "Create Study Plan"}
            </h2>
            <p className="text-xs text-gray-500">
              {step === "input-mode" || step === "course-type" ? "Getting started" : `Step ${currentStepNumber} of ${totalSteps}`}
            </p>
          </div>
        </div>
        {onClose && step !== "complete" && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {step !== "complete" && step !== "input-mode" && step !== "course-type" && step !== "course-search" && (
        <div className="px-4 pt-3">
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">{renderStep()}</div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Footer - only show for non-course mode steps that need navigation */}
      {step !== "complete" &&
        step !== "input-mode" &&
        step !== "syllabus" &&
        step !== "course-type" &&
        step !== "course-input" &&
        step !== "course-search" &&
        step !== "syllabus-preview" &&
        step !== "resources" && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canGoNext() || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {step === "schedule" ? "Generating..." : "Creating..."}
                </>
              ) : (
                <>
                  {step === "preview" ? "Create Plan" : "Next"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      {/* Course mode back button footer */}
      {(step === "course-type" || step === "course-input" || step === "syllabus-preview" || step === "resources") && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      )}
    </div>
  )
}
