'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface UsageLimitData {
  used: number
  limit: number
}

interface UsageData {
  tier: string
  limits: {
    documents: UsageLimitData
    flashcards: UsageLimitData
    podcasts: UsageLimitData
    mindmaps: UsageLimitData
    exams: UsageLimitData
    videos: UsageLimitData
    chat_messages: UsageLimitData
    quick_summaries: UsageLimitData
    study_buddy: UsageLimitData
  }
}

/**
 * UsageWarningNotification - Shows a banner when free users reach 80% of any limit
 * Only shows once per day per user to avoid spam
 */
export default function UsageWarningNotification() {
  const [showWarning, setShowWarning] = useState(false)
  const [warningFeatures, setWarningFeatures] = useState<string[]>([])

  useEffect(() => {
    async function checkUsageAndShowWarning() {
      try {
        // Check if we've already shown the warning today
        const lastShown = localStorage.getItem('usage_warning_last_shown')
        const today = new Date().toDateString()

        if (lastShown === today) {
          return // Already shown today, don't show again
        }

        // Fetch usage data
        const response = await fetch('/api/usage')
        if (!response.ok) return

        const data: UsageData = await response.json()

        // Only show for free tier users
        if (data.tier !== 'free') return

        // Check which features are at 80% or above
        const features = {
          Documents: data.limits.documents,
          Flashcards: data.limits.flashcards,
          Podcasts: data.limits.podcasts,
          'Mind Maps': data.limits.mindmaps,
          'Mock Exams': data.limits.exams,
          Videos: data.limits.videos,
          Chat: data.limits.chat_messages,
          'Quick Summaries': data.limits.quick_summaries,
          'Study Buddy': data.limits.study_buddy,
        }

        const atRiskFeatures: string[] = []

        Object.entries(features).forEach(([name, limit]) => {
          if (limit.limit !== Infinity) {
            const percentage = (limit.used / limit.limit) * 100
            if (percentage >= 80) {
              atRiskFeatures.push(name)
            }
          }
        })

        if (atRiskFeatures.length > 0) {
          setWarningFeatures(atRiskFeatures)
          setShowWarning(true)
          // Mark as shown for today
          localStorage.setItem('usage_warning_last_shown', today)
        }

      } catch (error) {
        console.error('Error checking usage for warning:', error)
      }
    }

    checkUsageAndShowWarning()
  }, [])

  if (!showWarning || warningFeatures.length === 0) {
    return null
  }

  const handleDismiss = () => {
    setShowWarning(false)
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-start gap-4">
        {/* Warning Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-orange-900 text-lg">
              {warningFeatures.length === 1
                ? "You're approaching your monthly limit!"
                : "You're approaching multiple monthly limits!"}
            </h3>
            <button
              onClick={handleDismiss}
              className="text-orange-600 hover:text-orange-800 transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-orange-800 text-sm mb-3">
            You've used <span className="font-semibold">80% or more</span> of your monthly limit for:{' '}
            <span className="font-semibold">{warningFeatures.join(', ')}</span>
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Premium
            </Link>
            <span className="text-xs text-orange-700">
              Get unlimited access to all features
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
