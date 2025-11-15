"use client"

import { AlertCircle, CheckCircle, AlertTriangle, Info, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIContributionTrackerProps {
  aiContributionPercentage: number
  originalWordCount: number
  aiAssistedWordCount: number
  totalWordCount: number
  className?: string
  showDetails?: boolean
}

/**
 * AIContributionTracker - Displays AI usage transparency for student agency
 *
 * Based on 2024 research findings:
 * - Students should maintain ownership of their work
 * - AI contribution should be visible and tracked
 * - Over-reliance on AI (>50%) should trigger warnings
 * - Supports ethical AI use in education
 */
export default function AIContributionTracker({
  aiContributionPercentage,
  originalWordCount,
  aiAssistedWordCount,
  totalWordCount,
  className,
  showDetails = true
}: AIContributionTrackerProps) {

  // Determine warning level based on AI contribution
  const getWarningLevel = (percentage: number) => {
    if (percentage === 0) return 'none'
    if (percentage <= 25) return 'low'
    if (percentage <= 50) return 'moderate'
    if (percentage <= 75) return 'high'
    return 'critical'
  }

  const warningLevel = getWarningLevel(aiContributionPercentage)

  // Get visual styling based on warning level
  const getStyles = () => {
    switch (warningLevel) {
      case 'none':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
          badge: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100',
          progressBar: 'bg-green-500'
        }
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          badge: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100',
          progressBar: 'bg-blue-500'
        }
      case 'moderate':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
          badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100',
          progressBar: 'bg-yellow-500'
        }
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-800 dark:text-orange-200',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
          badge: 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100',
          progressBar: 'bg-orange-500'
        }
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
          badge: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100',
          progressBar: 'bg-red-500'
        }
    }
  }

  const styles = getStyles()

  // Get message based on warning level
  const getMessage = () => {
    switch (warningLevel) {
      case 'none':
        return {
          title: '100% Original Work',
          description: 'Great job! Your work is entirely original. AI tools can help with editing when needed.'
        }
      case 'low':
        return {
          title: 'Minimal AI Assistance',
          description: 'You\'re using AI responsibly as a writing coach. Keep developing your independent voice!'
        }
      case 'moderate':
        return {
          title: 'Moderate AI Use',
          description: 'You\'re approaching the recommended limit. Ensure you maintain ownership of your ideas and arguments.'
        }
      case 'high':
        return {
          title: 'High AI Reliance',
          description: '⚠️ Warning: Over 50% AI-assisted. Your instructor may require more original work. Consider revising sections independently.'
        }
      case 'critical':
        return {
          title: 'Critical: Excessive AI Use',
          description: '🚨 Alert: Over 75% AI-assisted content may violate academic integrity policies. This work may not be accepted. Please revise with more original content.'
        }
    }
  }

  const message = getMessage()

  return (
    <div className={cn("rounded-lg border-2 p-4", styles.bg, styles.border, className)}>
      {/* Header with Icon and Badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={cn("text-sm font-semibold", styles.text)}>
              {message.title}
            </h3>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styles.badge)}>
              {aiContributionPercentage.toFixed(1)}% AI-Assisted
            </span>
          </div>
          <p className={cn("text-xs leading-relaxed", styles.text)}>
            {message.description}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={cn("h-2.5 rounded-full transition-all duration-500", styles.progressBar)}
            style={{ width: `${Math.min(aiContributionPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Details */}
      {showDetails && totalWordCount > 0 && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={cn("flex items-center gap-2", styles.text)}>
            <TrendingDown className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Original Content</div>
              <div className="text-gray-600 dark:text-gray-400">{originalWordCount} words</div>
            </div>
          </div>
          <div className={cn("flex items-center gap-2", styles.text)}>
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="font-medium">AI-Assisted</div>
              <div className="text-gray-600 dark:text-gray-400">{aiAssistedWordCount} words</div>
            </div>
          </div>
        </div>
      )}

      {/* Ethical Use Reminder (for high/critical levels) */}
      {(warningLevel === 'high' || warningLevel === 'critical') && (
        <div className={cn("mt-3 pt-3 border-t text-xs", styles.border, styles.text)}>
          <p className="font-medium mb-1">📚 Academic Integrity Reminder:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-700 dark:text-gray-300">
            <li>Always disclose AI tool usage to your instructor</li>
            <li>AI should assist, not replace, your critical thinking</li>
            <li>You are responsible for all content in your submission</li>
          </ul>
        </div>
      )}
    </div>
  )
}
