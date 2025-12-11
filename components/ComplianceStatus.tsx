"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Shield,
  BookOpen,
  GraduationCap,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ComplianceItem {
  id: string
  category: string
  label: string
  description: string
  required: boolean
  completed: boolean
  value?: number | string | null
  target?: number | string | null
  status: 'complete' | 'partial' | 'incomplete' | 'not_applicable'
  details?: string
}

interface ComplianceResult {
  jurisdiction: {
    code: string
    name: string
    country: string
    regulationLevel: string
  }
  items: ComplianceItem[]
  overallScore: number
  confidenceScore: number
  summary: {
    complete: number
    partial: number
    incomplete: number
    total: number
  }
}

interface ComplianceStatusProps {
  studentId?: number
  compact?: boolean
  className?: string
}

const categoryIcons: Record<string, typeof Shield> = {
  Administrative: Shield,
  Curriculum: BookOpen,
  Assessment: GraduationCap,
  Progress: TrendingUp,
  default: FileText,
}

export default function ComplianceStatus({
  studentId,
  compact = false,
  className,
}: ComplianceStatusProps) {
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Administrative', 'Progress']))

  useEffect(() => {
    fetchCompliance()
  }, [studentId])

  const fetchCompliance = async () => {
    try {
      setLoading(true)
      const url = studentId
        ? `/api/compliance/check?studentId=${studentId}`
        : '/api/compliance/check'
      const res = await fetch(url, { credentials: 'include' })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch compliance')
      }

      const data = await res.json()
      setCompliance(data.compliance)
    } catch (err) {
      console.error('Failed to fetch compliance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load compliance status')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'incomplete':
        return <Circle className="w-5 h-5 text-gray-400" />
      case 'not_applicable':
        return <Circle className="w-5 h-5 text-gray-300" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'incomplete':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'not_applicable':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-500'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 50) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  if (loading) {
    return (
      <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6", className)}>
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!compliance) return null

  // Group items by category
  const categories = compliance.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ComplianceItem[]>)

  if (compact) {
    return (
      <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br",
              getScoreGradient(compliance.confidenceScore)
            )}>
              <span className="text-white font-bold">{compliance.confidenceScore}%</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Compliance Score</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {compliance.summary.complete} of {compliance.summary.total} items complete
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {compliance.jurisdiction.name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", className)}>
      {/* Header with scores */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent-primary" />
              Compliance Status
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {compliance.jurisdiction.name}, {compliance.jurisdiction.country}
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs",
                compliance.jurisdiction.regulationLevel === 'none' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                compliance.jurisdiction.regulationLevel === 'low' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                compliance.jurisdiction.regulationLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>
                {compliance.jurisdiction.regulationLevel} regulation
              </span>
            </p>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Compliance Score</div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", getScoreColor(compliance.overallScore))}>
                {compliance.overallScore}%
              </span>
              <span className="text-sm text-gray-400">required items</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", getScoreGradient(compliance.overallScore))}
                style={{ width: `${compliance.overallScore}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Confidence Score</div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", getScoreColor(compliance.confidenceScore))}>
                {compliance.confidenceScore}%
              </span>
              <span className="text-sm text-gray-400">overall progress</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", getScoreGradient(compliance.confidenceScore))}
                style={{ width: `${compliance.confidenceScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-3 mt-4">
          <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
            {compliance.summary.complete} Complete
          </span>
          <span className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm">
            {compliance.summary.partial} In Progress
          </span>
          <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
            {compliance.summary.incomplete} Incomplete
          </span>
        </div>
      </div>

      {/* Category sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {Object.entries(categories).map(([category, items]) => {
          const Icon = categoryIcons[category] || categoryIcons.default
          const isExpanded = expandedCategories.has(category)
          const categoryComplete = items.filter(i => i.status === 'complete').length
          const categoryRequired = items.filter(i => i.required).length

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-accent-primary" />
                  <span className="font-semibold text-gray-900 dark:text-white">{category}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({categoryComplete}/{items.length} complete)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        item.status === 'complete'
                          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                          : item.status === 'partial'
                          ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(item.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {item.label}
                            </h4>
                            {item.required && (
                              <span className="px-1.5 py-0.5 text-xs bg-accent-primary/10 text-accent-primary rounded">
                                Required
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full",
                              getStatusColor(item.status)
                            )}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {item.description}
                          </p>
                          {item.details && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {item.details}
                            </p>
                          )}
                          {item.value !== undefined && item.target !== undefined && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{item.value} / {item.target}</span>
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full bg-gradient-to-r",
                                    item.status === 'complete' ? "from-green-500 to-emerald-500" :
                                    item.status === 'partial' ? "from-yellow-500 to-orange-500" :
                                    "from-gray-400 to-gray-500"
                                  )}
                                  style={{
                                    width: `${Math.min(100, (Number(item.value) / Number(item.target)) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
