"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Mic,
  Network,
  GraduationCap,
  MessageSquare,
  FileText,
  RefreshCw,
  Clock,
  Zap,
  Target,
  ChevronRight,
  Sparkles,
  Info,
  Flame,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useUIStore, useDocumentStore } from "@/lib/store/useStore"

// ============================================
// Types
// ============================================

type RecommendationPriority = "urgent" | "high" | "normal" | "low"

type StudyMode =
  | "flashcards"
  | "podcast"
  | "mindmap"
  | "exam"
  | "chat"
  | "reading"
  | "review"
  | "quick-summary"

interface StudyRecommendation {
  id: string
  priority: RecommendationPriority
  mode: StudyMode
  documentId?: string
  documentName?: string
  topic?: string
  reason: string
  reasonDetail?: string
  estimatedMinutes: number
  icon: string
  action: {
    label: string
    href?: string
    mode?: string
  }
  metadata?: {
    dueCount?: number
    sessionId?: string
    planId?: string
    masteryScore?: number
    streak?: number
  }
}

interface RecommendationsResult {
  recommendations: StudyRecommendation[]
  stats: {
    flashcardsDue: number
    sessionsToday: number
    weakTopicsCount: number
    currentStreak: number
  }
}

// ============================================
// Icon Mapping
// ============================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Mic,
  Network,
  GraduationCap,
  MessageSquare,
  FileText,
  RefreshCw,
  Clock,
  Zap,
  Target,
  Sparkles,
}

// Priority colors
const priorityStyles: Record<RecommendationPriority, { bg: string; border: string; badge: string }> = {
  urgent: {
    bg: "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  high: {
    bg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
    border: "border-violet-200 dark:border-violet-800",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  },
  normal: {
    bg: "bg-white/70 dark:bg-white/5",
    border: "border-gray-200/50 dark:border-white/10",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  low: {
    bg: "bg-gray-50/50 dark:bg-gray-900/30",
    border: "border-gray-100 dark:border-gray-800",
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
}

// Mode colors for icons
const modeColors: Record<StudyMode, string> = {
  flashcards: "from-indigo-500 to-indigo-600",
  podcast: "from-violet-500 to-violet-600",
  mindmap: "from-emerald-500 to-emerald-600",
  exam: "from-amber-500 to-amber-600",
  chat: "from-blue-500 to-blue-600",
  reading: "from-slate-500 to-slate-600",
  review: "from-cyan-500 to-cyan-600",
  "quick-summary": "from-cyan-500 to-cyan-600",
}

// ============================================
// Component
// ============================================

interface SmartRecommendationsProps {
  className?: string
  maxItems?: number
  showStats?: boolean
  compact?: boolean
}

export default function SmartRecommendations({
  className = "",
  maxItems = 3,
  showStats = true,
  compact = false,
}: SmartRecommendationsProps) {
  const router = useRouter()
  const { setActiveMode } = useUIStore()
  const { setCurrentDocument } = useDocumentStore()

  const [data, setData] = useState<RecommendationsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/study-recommendations?limit=${maxItems}`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations")
        }

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        console.error("[SmartRecommendations] Error:", err)
        setError("Unable to load recommendations")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()

    // Refresh every 5 minutes
    const interval = setInterval(fetchRecommendations, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [maxItems])

  // Handle recommendation click
  const handleRecommendationClick = async (rec: StudyRecommendation) => {
    // If there's a document, load it first
    if (rec.documentId) {
      try {
        const response = await fetch(`/api/documents/${rec.documentId}`)
        if (response.ok) {
          const docData = await response.json()
          if (docData.document) {
            setCurrentDocument({
              id: docData.document.id,
              name: docData.document.file_name,
              content: docData.document.extracted_text || "",
              fileType: docData.document.file_type,
              storagePath: docData.document.storage_path,
              fileSize: docData.document.file_size,
            })
          }
        }
      } catch (err) {
        console.error("[SmartRecommendations] Error loading document:", err)
      }
    }

    // Navigate to the mode
    if (rec.action.href) {
      router.push(rec.action.href)
    } else if (rec.action.mode) {
      setActiveMode(rec.action.mode)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="space-y-3">
          {[...Array(maxItems)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || data.recommendations.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="p-6 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/50 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            All caught up!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload a document to get personalized study recommendations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header with stats */}
      {showStats && !compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What to study next
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {data.stats.flashcardsDue > 0 && (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-medium">{data.stats.flashcardsDue} due</span>
              </div>
            )}
            {data.stats.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-3.5 h-3.5" />
                <span className="font-medium">{data.stats.currentStreak}d streak</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations list */}
      <div className="space-y-2.5">
        {data.recommendations.map((rec, index) => {
          const IconComponent = iconMap[rec.icon] || BookOpen
          const styles = priorityStyles[rec.priority]
          const modeColor = modeColors[rec.mode] || "from-gray-500 to-gray-600"
          const isExpanded = expandedId === rec.id

          return (
            <div
              key={rec.id}
              onClick={() => handleRecommendationClick(rec)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRecommendationClick(rec)
                }
              }}
              className={`w-full group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer ${styles.bg} ${styles.border}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              <div className="relative p-4 flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${modeColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                >
                  <IconComponent className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {rec.reason}
                    </h3>
                    {rec.priority === "urgent" && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${styles.badge}`}>
                        URGENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {rec.documentName && (
                      <span className="truncate max-w-[150px]">{rec.documentName}</span>
                    )}
                    {rec.documentName && rec.estimatedMinutes && (
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                    )}
                    {rec.estimatedMinutes && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {rec.estimatedMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && rec.reasonDetail && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5 rounded-lg p-2">
                      {rec.reasonDetail}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Info button */}
                  {rec.reasonDetail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(isExpanded ? null : rec.id)
                      }}
                      className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}

                  {/* Go button */}
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 group-hover:translate-x-1 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View all link */}
      {data.recommendations.length >= maxItems && !compact && (
        <button
          onClick={() => router.push("/dashboard/study-plan")}
          className="mt-3 w-full py-2 text-center text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          View full study plan →
        </button>
      )}
    </div>
  )
}
