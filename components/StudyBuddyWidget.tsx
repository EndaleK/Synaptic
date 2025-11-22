"use client"

import { useState, useEffect } from 'react'
import { Sparkles, MessageSquare, ChevronDown, ChevronUp, Bot, TrendingUp } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

interface UsageData {
  tier: string
  limits: {
    study_buddy: { used: number; limit: number }
  }
}

interface StudyBuddyWidgetProps {
  onOpenStudyBuddy: () => void
}

/**
 * Study Buddy Widget - Quick access and usage stats
 * Shows conversation count, usage limits, and quick launch button
 */
export default function StudyBuddyWidget({ onOpenStudyBuddy }: StudyBuddyWidgetProps) {
  const { userId, isLoaded } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studyBuddyWidget_expanded')
    if (saved !== null) {
      setIsExpanded(saved === 'true')
    }
  }, [])

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem('studyBuddyWidget_expanded', String(newState))
  }

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(true)
      return
    }

    const fetchUsage = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100))
        const response = await fetch('/api/usage', {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch usage: ${response.status}`)
        }
        const data = await response.json()
        setUsage(data)
      } catch (err) {
        console.error('Study Buddy usage fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [userId, isLoaded])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Loading Study Buddy...</h3>
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!usage) return null

  const isPremium = usage.tier === 'premium' || usage.tier === 'enterprise'
  const studyBuddyUsage = usage.limits.study_buddy
  const percentage = studyBuddyUsage.limit === Infinity ? 0 : (studyBuddyUsage.used / studyBuddyUsage.limit) * 100
  const isNearLimit = percentage >= 80

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={toggleExpanded}
        className="w-full p-6 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Study Buddy
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isPremium ? 'Unlimited conversations' : `${studyBuddyUsage.used}/${studyBuddyUsage.limit} messages used`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-blue-200 dark:border-blue-700">
          <div className="pt-4 space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your AI study companion - ask me anything from science to philosophy!
            </p>

            {/* Usage Bar (Free Tier Only) */}
            {!isPremium && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${isNearLimit ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span className={`font-medium ${isNearLimit ? 'text-orange-900 dark:text-orange-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      Messages This Month
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${isNearLimit ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {studyBuddyUsage.used}/{studyBuddyUsage.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      percentage >= 95 ? 'bg-red-500' :
                      percentage >= 80 ? 'bg-orange-500' :
                      'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Features */}
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">What I can help with:</p>
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>Explain complex topics in simple terms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Tutor mode for structured learning</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  <span>Casual buddy mode for fun chats</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={onOpenStudyBuddy}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Start Conversation
            </button>

            {/* Upgrade CTA (Free Tier Only) */}
            {!isPremium && isNearLimit && (
              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                <a
                  href="/pricing"
                  className="block w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold rounded-lg text-center transition-all hover:scale-[1.02]"
                >
                  Upgrade for Unlimited Messages
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
