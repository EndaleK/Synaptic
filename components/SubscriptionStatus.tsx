"use client"

import { useState, useEffect } from "react"
import { Crown, Sparkles, TrendingUp, AlertCircle } from "lucide-react"
import { useUser } from "@clerk/nextjs"

interface UserProfile {
  subscription_tier: 'free' | 'premium' | 'enterprise'
  subscription_status: 'active' | 'inactive' | 'canceled' | 'past_due'
  stripe_customer_id?: string
  monthly_document_count: number
}

interface UsageLimits {
  documents: { used: number; limit: number }
  flashcards: { used: number; limit: number }
  podcasts: { used: number; limit: number }
  mindmaps: { used: number; limit: number }
}

export default function SubscriptionStatus() {
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [usage, setUsage] = useState<UsageLimits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isManaging, setIsManaging] = useState(false)

  useEffect(() => {
    fetchProfileAndUsage()
  }, [])

  const fetchProfileAndUsage = async () => {
    try {
      const [profileRes, usageRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/usage')
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data.profile)
      }

      if (usageRes.ok) {
        const data = await usageRes.json()
        setUsage(data.limits)
      }
    } catch (error) {
      console.error('Error fetching profile/usage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    try {
      // Live mode Stripe Price ID from dashboard
      const STRIPE_PRICE_ID = 'price_1SOk7JFjlulH6DEoUU8OO326'

      if (STRIPE_PRICE_ID === 'price_YOUR_ACTUAL_PRICE_ID') {
        alert('Please configure your Stripe Price ID first. See STRIPE_SETUP_GUIDE.md for instructions.')
        setIsUpgrading(false)
        return
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID,
          tier: 'premium'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again.')
      setIsUpgrading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsManaging(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        // Provide specific error messages
        if (data.code === 'STRIPE_NOT_CONFIGURED') {
          alert('Subscription management is temporarily unavailable. Please contact support at support@synaptic.study.')
        } else if (response.status === 400) {
          alert(data.error || 'No active subscription found.')
        } else if (response.status === 404) {
          alert('User profile not found. Please try signing out and back in.')
        } else {
          alert(`Failed to open subscription management: ${data.details || data.error || 'Unknown error'}`)
        }
        console.error('Portal session error:', data)
        setIsManaging(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (error) {
      console.error('Error opening customer portal:', error)
      alert('Failed to open subscription management. Please try again or contact support.')
      setIsManaging(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  const isPremium = profile?.subscription_tier === 'premium' && profile?.subscription_status === 'active'
  const isPastDue = profile?.subscription_status === 'past_due'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isPremium
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            {isPremium ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">
              {isPremium ? 'Premium Plan' : 'Free Plan'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isPremium ? 'Unlimited access to all features' : '10 documents per month'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {!isPremium && (
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isUpgrading ? 'Loading...' : 'Upgrade to Premium'}
          </button>
        )}

        {isPremium && (
          <button
            onClick={handleManageSubscription}
            disabled={isManaging}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-black dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
          >
            {isManaging ? 'Loading...' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Past Due Warning */}
      {isPastDue && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
              Payment Failed
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              Your last payment failed. Please update your payment method to continue using Premium features.
            </p>
            <button
              onClick={handleManageSubscription}
              className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              Update Payment Method
            </button>
          </div>
        </div>
      )}

      {/* Usage Stats (Free Tier Only) */}
      {!isPremium && usage && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <TrendingUp className="w-4 h-4" />
            Monthly Usage
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents</span>
              <span className="text-sm font-semibold text-black dark:text-white">
                {usage.documents.used} / {usage.documents.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.documents.used >= usage.documents.limit
                    ? 'bg-red-500'
                    : usage.documents.used / usage.documents.limit > 0.8
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${Math.min((usage.documents.used / usage.documents.limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Flashcards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Flashcards</span>
              <span className="text-sm font-semibold text-black dark:text-white">
                {usage.flashcards.used} / {usage.flashcards.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.flashcards.used >= usage.flashcards.limit
                    ? 'bg-red-500'
                    : usage.flashcards.used / usage.flashcards.limit > 0.8
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${Math.min((usage.flashcards.used / usage.flashcards.limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Podcasts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Podcasts</span>
              <span className="text-sm font-semibold text-black dark:text-white">
                {usage.podcasts.used} / {usage.podcasts.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.podcasts.used >= usage.podcasts.limit
                    ? 'bg-red-500'
                    : usage.podcasts.used / usage.podcasts.limit > 0.8
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min((usage.podcasts.used / usage.podcasts.limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Mind Maps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Mind Maps</span>
              <span className="text-sm font-semibold text-black dark:text-white">
                {usage.mindmaps.used} / {usage.mindmaps.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.mindmaps.used >= usage.mindmaps.limit
                    ? 'bg-red-500'
                    : usage.mindmaps.used / usage.mindmaps.limit > 0.8
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${Math.min((usage.mindmaps.used / usage.mindmaps.limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Upgrade Prompt */}
          {(usage.documents.used >= usage.documents.limit * 0.8 ||
            usage.flashcards.used >= usage.flashcards.limit * 0.8) && (
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-2">
                You're running low on credits! Upgrade to Premium for unlimited access.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 hover:underline"
              >
                Learn More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
