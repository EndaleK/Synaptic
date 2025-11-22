"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, MessageSquare, Mic, Network, GraduationCap, Zap, ChevronDown, ChevronUp, TrendingUp, Youtube, Sparkles, Bot } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

interface UsageLimits {
  documents: { used: number; limit: number }
  flashcards: { used: number; limit: number }
  podcasts: { used: number; limit: number }
  mindmaps: { used: number; limit: number }
  exams: { used: number; limit: number }
  videos: { used: number; limit: number }
  chat_messages: { used: number; limit: number }
  quick_summaries: { used: number; limit: number }
  study_buddy: { used: number; limit: number }
}

interface UsageData {
  tier: string
  limits: UsageLimits
}

/**
 * Usage Widget - Shows current usage stats on dashboard
 * Displays progress bars for all free tier limits
 * Encourages upgrades when approaching limits
 */
export default function UsageWidget() {
  const { userId, isLoaded } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('usageWidget_expanded')
    if (saved !== null) {
      setIsWidgetExpanded(saved === 'true')
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleWidgetExpanded = () => {
    const newState = !isWidgetExpanded
    setIsWidgetExpanded(newState)
    localStorage.setItem('usageWidget_expanded', String(newState))
  }

  useEffect(() => {
    // Wait for auth to be loaded AND userId to be available
    if (!isLoaded || !userId) {
      setLoading(true)
      return
    }

    const fetchUsage = async (isRetry = false) => {
      try {
        // Small delay on initial fetch to let Clerk initialize cookies
        if (!isRetry) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const response = await fetch('/api/usage', {
          credentials: 'include' // Ensure cookies are sent
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch usage: ${response.status}`)
        }
        const data = await response.json()
        setUsage(data)
        setError(null) // Clear any previous errors
        setRetryCount(0) // Reset retry count on success
      } catch (err) {
        // Only retry if first attempt and under retry limit
        if (!isRetry && retryCount < 2) {
          setRetryCount(prev => prev + 1)
          setTimeout(() => fetchUsage(true), 500)
          return // Early return - don't set loading to false yet
        }

        // Only log and show error if all retries exhausted
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Usage fetch failed:', errorMessage, err)
        setError('Unable to load usage stats')
      } finally {
        // Always set loading to false unless we're retrying
        // (retry case returns early above)
        setLoading(false)
      }
    }

    fetchUsage()
  }, [userId, isLoaded, retryCount])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Loading usage...</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !usage) {
    return null // Silently fail - usage widget is not critical
  }

  const isPremium = usage.tier === 'premium' || usage.tier === 'enterprise'

  // Calculate overall usage percentage
  const usageItems = [
    { name: 'Documents', icon: FileText, ...usage.limits.documents, color: 'blue' },
    { name: 'Flashcards', icon: Zap, ...usage.limits.flashcards, color: 'purple' },
    { name: 'Podcasts', icon: Mic, ...usage.limits.podcasts, color: 'orange' },
    { name: 'Mind Maps', icon: Network, ...usage.limits.mindmaps, color: 'pink' },
    { name: 'Mock Exams', icon: GraduationCap, ...usage.limits.exams, color: 'indigo' },
    { name: 'Videos', icon: Youtube, ...usage.limits.videos, color: 'red' },
    { name: 'Chat', icon: MessageSquare, ...usage.limits.chat_messages, color: 'green' },
    { name: 'Quick Summaries', icon: Sparkles, ...usage.limits.quick_summaries, color: 'yellow' },
    { name: 'Study Buddy', icon: Bot, ...usage.limits.study_buddy, color: 'cyan' },
  ]

  // Show top 3 by default, all when expanded
  const displayItems = isExpanded ? usageItems : usageItems.slice(0, 3)

  // Calculate if any feature is above 80%
  const hasWarning = usageItems.some(item =>
    item.limit !== Infinity && (item.used / item.limit) * 100 >= 80
  )

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={toggleWidgetExpanded}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {isPremium ? 'Premium Usage' : 'Monthly Usage'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isPremium ? 'Unlimited access' : 'Resets on the 1st'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isPremium && hasWarning && (
            <Link
              href="/pricing"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
              Upgrade
            </Link>
          )}
          {isWidgetExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isWidgetExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-4">
            {/* Premium status */}
            {isPremium ? (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100 text-center">
                  ✨ You have unlimited access to all features
                </p>
              </div>
            ) : (
              <>
                {/* Usage items */}
                <div className="space-y-3 flex-1">
            {displayItems.map((item) => {
              const percentage = item.limit === Infinity ? 0 : (item.used / item.limit) * 100
              const isNearLimit = percentage >= 80
              const Icon = item.icon

              const colorClasses = {
                blue: 'bg-blue-500',
                purple: 'bg-purple-500',
                green: 'bg-green-500',
                orange: 'bg-orange-500',
                pink: 'bg-pink-500',
                indigo: 'bg-indigo-500',
                red: 'bg-red-500',
                yellow: 'bg-yellow-500',
                cyan: 'bg-cyan-500'
              }

              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isNearLimit ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${isNearLimit ? 'text-orange-900 dark:text-orange-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${isNearLimit ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {item.used}/{item.limit === Infinity ? '∞' : item.limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        percentage >= 95 ? 'bg-red-500' :
                        percentage >= 80 ? 'bg-orange-500' :
                        colorClasses[item.color as keyof typeof colorClasses]
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Expand/Collapse button */}
          {usageItems.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show all ({usageItems.length - 3} more)
                </>
              )}
            </button>
          )}

                {/* Upgrade CTA if approaching any limit */}
                {hasWarning && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/pricing"
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold rounded-xl text-center transition-all hover:scale-[1.02]"
                    >
                      Upgrade to Premium for Unlimited
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
