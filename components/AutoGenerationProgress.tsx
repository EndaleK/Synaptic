"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Mic,
  Network,
  GraduationCap,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"

// ============================================
// Types
// ============================================

type ContentType = "flashcards" | "podcast" | "mindmap" | "exam" | "study_guide"
type JobStatus = "pending" | "processing" | "completed" | "failed"

interface ContentGenerationJob {
  id: string
  documentId: string
  contentType: ContentType
  status: JobStatus
  progressPercent: number
  resultId?: string
  errorMessage?: string
  queuedAt: string
  completedAt?: string
}

interface DocumentAnalysis {
  id: string
  complexityScore: number
  estimatedReadingMinutes: number
  estimatedStudyHours: number
  wordCount: number
  topics: Array<{
    id: string
    title: string
    difficulty: string
    estimatedMinutes: number
  }>
}

// ============================================
// Icon and Label Mapping
// ============================================

const contentTypeConfig: Record<
  ContentType,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    color: string
    bgColor: string
  }
> = {
  flashcards: {
    icon: BookOpen,
    label: "Flashcards",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
  },
  podcast: {
    icon: Mic,
    label: "Podcast",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/50",
  },
  mindmap: {
    icon: Network,
    label: "Mind Map",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  exam: {
    icon: GraduationCap,
    label: "Mock Exam",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
  },
  study_guide: {
    icon: FileText,
    label: "Study Guide",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/50",
  },
}

const statusConfig: Record<
  JobStatus,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    color: string
  }
> = {
  pending: {
    icon: Clock,
    label: "Queued",
    color: "text-gray-500 dark:text-gray-400",
  },
  processing: {
    icon: Loader2,
    label: "Generating",
    color: "text-blue-600 dark:text-blue-400",
  },
  completed: {
    icon: CheckCircle2,
    label: "Ready",
    color: "text-green-600 dark:text-green-400",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    color: "text-red-600 dark:text-red-400",
  },
}

// ============================================
// Component
// ============================================

interface AutoGenerationProgressProps {
  documentId: string
  documentName?: string
  className?: string
  onJobComplete?: (job: ContentGenerationJob) => void
  onDismiss?: () => void
  compact?: boolean
}

export default function AutoGenerationProgress({
  documentId,
  documentName,
  className = "",
  onJobComplete,
  onDismiss,
  compact = false,
}: AutoGenerationProgressProps) {
  const [jobs, setJobs] = useState<ContentGenerationJob[]>([])
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Fetch jobs and analysis
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch jobs
        const jobsResponse = await fetch(
          `/api/content-jobs?documentId=${documentId}`,
          { credentials: "include" }
        )

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json()
          setJobs(jobsData.jobs || [])
        }

        // Fetch analysis
        const analysisResponse = await fetch(
          `/api/documents/${documentId}/analyze`,
          { credentials: "include" }
        )

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          setAnalysis(analysisData.analysis)
        }

        setError(null)
      } catch (err) {
        console.error("[AutoGenerationProgress] Error:", err)
        setError("Failed to load generation status")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Poll for updates every 5 seconds while jobs are pending/processing
    const interval = setInterval(() => {
      const hasPendingJobs = jobs.some(
        (j) => j.status === "pending" || j.status === "processing"
      )
      if (hasPendingJobs) {
        fetchData()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [documentId, jobs.length])

  // Notify parent when a job completes
  useEffect(() => {
    if (onJobComplete) {
      for (const job of jobs) {
        if (job.status === "completed" && job.completedAt) {
          onJobComplete(job)
        }
      }
    }
  }, [jobs, onJobComplete])

  // Calculate overall progress
  const totalJobs = jobs.length
  const completedJobs = jobs.filter((j) => j.status === "completed").length
  const failedJobs = jobs.filter((j) => j.status === "failed").length
  const processingJobs = jobs.filter((j) => j.status === "processing").length
  const overallProgress =
    totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  // Don't render if no jobs
  if (!isLoading && jobs.length === 0) {
    return null
  }

  // Compact mode for inline display
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {completedJobs}/{totalJobs} ready
              </span>
            </div>
            {processingJobs > 0 && (
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Smart Content Generation
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {documentName || "Processing document..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          {!isLoading && totalJobs > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {completedJobs}/{totalJobs}
              </span>
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Dismiss button */}
          {onDismiss && completedJobs === totalJobs && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Document analysis summary */}
          {analysis && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {analysis.complexityScore}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Complexity</p>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {analysis.estimatedReadingMinutes}m
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Read Time</p>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-white/5 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {analysis.topics.length}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Topics</p>
              </div>
            </div>
          )}

          {/* Job list */}
          {!isLoading && jobs.length > 0 && (
            <div className="space-y-2">
              {jobs.map((job) => {
                const typeConfig = contentTypeConfig[job.contentType]
                const statusCfg = statusConfig[job.status]
                const Icon = typeConfig.icon
                const StatusIcon = statusCfg.icon

                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-white/5"
                  >
                    {/* Content type icon */}
                    <div
                      className={`w-8 h-8 rounded-lg ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                    </div>

                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {typeConfig.label}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon
                          className={`w-3 h-3 ${statusCfg.color} ${
                            job.status === "processing" ? "animate-spin" : ""
                          }`}
                        />
                        <span className={`text-xs ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {job.status === "processing" && job.progressPercent > 0 && (
                          <span className="text-xs text-gray-400">
                            {job.progressPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar for processing jobs */}
                    {job.status === "processing" && (
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Error message */}
                    {job.status === "failed" && job.errorMessage && (
                      <span
                        className="text-xs text-red-500 truncate max-w-[100px]"
                        title={job.errorMessage}
                      >
                        {job.errorMessage}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* All complete message */}
          {!isLoading && totalJobs > 0 && completedJobs === totalJobs && failedJobs === 0 && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                All content ready to use!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
