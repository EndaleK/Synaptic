"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"

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

type WizardStep = "documents" | "schedule" | "preview" | "complete"

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
  const [step, setStep] = useState<WizardStep>("documents")
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

  // Preview state
  const [preview, setPreview] = useState<StudyPlanPreview | null>(null)
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null)

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

  // Generate preview
  const generatePreview = async () => {
    if (selectedDocIds.length === 0) {
      setError("Please select at least one document")
      return
    }

    if (!examDate) {
      setError("Please set an exam date")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          examDate,
          examTitle: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
          examEventId,
          documentIds: selectedDocIds,
          dailyTargetHours: dailyHours,
          startDate,
          includeWeekends,
          save: false, // Preview only
        }),
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
      const response = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          examDate,
          examTitle: examTitle || `Exam on ${new Date(examDate).toLocaleDateString()}`,
          examEventId,
          documentIds: selectedDocIds,
          dailyTargetHours: dailyHours,
          startDate,
          includeWeekends,
          save: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create plan")
      }

      const data = await response.json()
      setCreatedPlanId(data.plan.id)
      setStep("complete")

      if (onComplete) {
        onComplete(data.plan.id)
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
      case "documents":
        return selectedDocIds.length > 0
      case "schedule":
        return !!examDate && daysUntilExam > 0
      case "preview":
        return !!preview
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === "documents") {
      setStep("schedule")
    } else if (step === "schedule") {
      generatePreview()
    } else if (step === "preview") {
      createPlan()
    }
  }

  const handleBack = () => {
    if (step === "schedule") {
      setStep("documents")
    } else if (step === "preview") {
      setStep("schedule")
    }
  }

  const steps: WizardStep[] = ["documents", "schedule", "preview", "complete"]
  const currentStepIndex = steps.indexOf(step)

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
              Create Study Plan
            </h2>
            <p className="text-xs text-gray-500">
              Step {currentStepIndex + 1} of {steps.length - 1}
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
      {step !== "complete" && (
        <div className="px-4 pt-3">
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / (steps.length - 1)) * 100}%` }}
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

      {/* Footer */}
      {step !== "complete" && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === "documents"}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  )
}
