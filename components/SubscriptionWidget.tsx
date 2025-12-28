'use client'

import { useState, useEffect } from 'react'
import { Zap, Crown, ChevronRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UsageLimits {
  tier: 'free' | 'premium' | 'enterprise'
  limits: {
    documents: { used: number; limit: number }
    flashcards: { used: number; limit: number }
    podcasts: { used: number; limit: number }
    mindmaps: { used: number; limit: number }
    chat_messages: { used: number; limit: number }
  }
}

export default function SubscriptionWidget() {
  const router = useRouter()
  const [usage, setUsage] = useState<UsageLimits | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/usage', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setUsage(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 bg-gray-100 dark:bg-slate-700 rounded" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-slate-700 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!usage) return null

  const isPremium = usage.tier === 'premium' || usage.tier === 'enterprise'

  // Calculate total usage percentage for free tier
  const mainFeatures = ['documents', 'flashcards', 'podcasts', 'mindmaps', 'chat_messages'] as const
  const totalUsed = mainFeatures.reduce((sum, key) => {
    const item = usage.limits[key]
    return sum + (item.limit === Infinity ? 0 : item.used)
  }, 0)
  const totalLimit = mainFeatures.reduce((sum, key) => {
    const item = usage.limits[key]
    return sum + (item.limit === Infinity ? 0 : item.limit)
  }, 0)
  const overallPercentage = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0

  // Find the most used feature
  const mostUsedFeature = mainFeatures.reduce((max, key) => {
    const item = usage.limits[key]
    if (item.limit === Infinity) return max
    const percentage = (item.used / item.limit) * 100
    const maxItem = usage.limits[max]
    const maxPercentage = maxItem.limit === Infinity ? 0 : (maxItem.used / maxItem.limit) * 100
    return percentage > maxPercentage ? key : max
  }, mainFeatures[0])

  const mostUsedItem = usage.limits[mostUsedFeature]
  const mostUsedPercentage = mostUsedItem.limit === Infinity ? 0 : Math.round((mostUsedItem.used / mostUsedItem.limit) * 100)

  const getFeatureLabel = (key: string) => {
    const labels: Record<string, string> = {
      documents: 'Documents',
      flashcards: 'Flashcards',
      podcasts: 'Podcasts',
      mindmaps: 'Mind Maps',
      chat_messages: 'Chat Messages'
    }
    return labels[key] || key
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-cyan-500 dark:bg-cyan-400'
  }

  if (isPremium) {
    return (
      <div className="bg-neutral-900 dark:bg-white rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-white dark:text-neutral-900 text-sm">
                {usage.tier === 'enterprise' ? 'Enterprise' : 'Premium'}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Unlimited access</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => router.push('/pricing')}
      className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-left hover:bg-white dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <span className="text-sm font-medium text-neutral-900 dark:text-white">Free Plan</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Upgrade</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>

      {/* Usage Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">Monthly usage</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{overallPercentage}%</span>
        </div>
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(overallPercentage)}`}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {getFeatureLabel(mostUsedFeature)}: {mostUsedItem.used}/{mostUsedItem.limit}
        </p>
      </div>
    </button>
  )
}
