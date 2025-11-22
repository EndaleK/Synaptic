'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

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

export default function UsageStats() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsageData() {
      try {
        const response = await fetch('/api/usage')
        if (!response.ok) {
          throw new Error('Failed to fetch usage data')
        }
        const data = await response.json()
        setUsageData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUsageData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading usage statistics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading usage: {error}</p>
      </div>
    )
  }

  if (!usageData) {
    return null
  }

  const isPremium = usageData.tier === 'premium' || usageData.tier === 'enterprise'

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === Infinity || limit === 0) return 0
    return Math.round((used / limit) * 100)
  }

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-red-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTextColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-red-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const features = [
    { key: 'documents', label: 'Documents Uploaded', icon: '📄' },
    { key: 'flashcards', label: 'Flashcards Generated', icon: '🃏' },
    { key: 'podcasts', label: 'Podcasts Created', icon: '🎙️' },
    { key: 'mindmaps', label: 'Mind Maps Created', icon: '🗺️' },
    { key: 'exams', label: 'Mock Exams Generated', icon: '📝' },
    { key: 'videos', label: 'Videos Processed', icon: '🎬' },
  ] as const

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Monthly Usage</h2>
          <p className="text-sm text-gray-600 mt-1">
            Current Plan: <span className="font-medium capitalize">{usageData.tier}</span>
          </p>
        </div>
        {!isPremium && (
          <button
            onClick={() => window.location.href = '/pricing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Upgrade to Premium
          </button>
        )}
      </div>

      {/* Usage Grid */}
      <div className="space-y-4">
        {features.map(({ key, label, icon }) => {
          const data = usageData.limits[key]
          const percentage = getUsagePercentage(data.used, data.limit)
          const isUnlimited = data.limit === Infinity

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <span className={`text-sm font-semibold ${isUnlimited ? 'text-blue-600' : getTextColor(percentage)}`}>
                  {data.used} / {isUnlimited ? '∞' : data.limit}
                </span>
              </div>

              {!isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}

              {!isUnlimited && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{percentage}% used</span>
                  <span>{data.limit - data.used} remaining</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Free Plan Info */}
      {!isPremium && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Usage resets on the 1st of each month. Upgrade to Premium for unlimited access to all features.
          </p>
        </div>
      )}
    </div>
  )
}
