"use client"

import { useState, useEffect } from 'react'
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  ChevronRight,
  Trophy,
  Zap,
  Crown,
  Star,
  ArrowRight
} from 'lucide-react'

interface ReferralStats {
  referral_code: string
  total_referrals: number
  referral_credits: number
  pending_referrals: number
  completed_referrals: number
  milestones: Array<{
    type: string
    achieved_at: string
    reward: string
  }>
  next_milestone: {
    target: number
    reward: string
    progress?: number
  } | null
  recent_referrals: Array<{
    id: string
    referred_name: string
    status: string
    created_at: string
    reward_amount: number | null
  }>
}

interface ReferralWidgetProps {
  compact?: boolean
  onViewAll?: () => void
}

export default function ReferralWidget({
  compact = false,
  onViewAll
}: ReferralWidgetProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Default stats when API is unavailable
  const defaultStats: ReferralStats = {
    referral_code: 'LOADING',
    total_referrals: 0,
    referral_credits: 0,
    pending_referrals: 0,
    completed_referrals: 0,
    milestones: [],
    next_milestone: null,
    recent_referrals: []
  }

  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        const response = await fetch('/api/referrals', {
          credentials: 'include'
        })

        if (!response.ok) {
          // Don't throw - just use defaults (table may not exist yet)
          setStats(defaultStats)
          return
        }

        const data = await response.json()
        setStats(data.stats)
        setShareUrl(data.shareUrl)
        setShareMessage(data.shareMessage)
      } catch (err) {
        // Silently fail - referrals feature may not be set up yet
        console.debug('Referrals not available:', err)
        setStats(defaultStats)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReferralStats()
  }, [])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Synaptic',
          text: shareMessage,
          url: shareUrl
        })
      } catch (err) {
        // User cancelled or error
        console.error('Share error:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'first_referral':
        return Star
      case '5_referrals':
        return Zap
      case '10_referrals':
        return Trophy
      case '25_referrals':
        return Crown
      default:
        return Gift
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Refer & Earn</h3>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Refer & Earn</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {error || 'Unable to load referral info'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with gradient */}
      <div className="relative p-4 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Refer Friends, Earn Rewards</h3>
                <p className="text-xs text-white/70">Both you and your friend get bonus credits!</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-white">{stats.total_referrals}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Referrals</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-white">{stats.referral_credits}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Credits</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-white">{stats.pending_referrals}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Section */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your referral code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl font-mono text-lg font-bold text-center text-gray-900 dark:text-white tracking-wider">
            {stats.referral_code}
          </div>
          <button
            onClick={handleCopyLink}
            className={`p-2.5 rounded-xl transition-all ${
              copied
                ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Next Milestone */}
      {stats.next_milestone && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Next Milestone
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.total_referrals} / {stats.next_milestone.target}
            </p>
          </div>
          <div className="mb-2">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.total_referrals / stats.next_milestone.target) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {stats.next_milestone.reward}
            </span>
          </div>
        </div>
      )}

      {/* Milestones achieved */}
      {stats.milestones && stats.milestones.length > 0 && !compact && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Achievements</p>
          <div className="space-y-2">
            {stats.milestones.slice(0, 3).map((milestone, index) => {
              const Icon = getMilestoneIcon(milestone.type)
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-violet-50 to-pink-50 dark:from-violet-500/10 dark:to-pink-500/10 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                    {milestone.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Referrals */}
      {stats.recent_referrals && stats.recent_referrals.length > 0 && !compact && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent Referrals</p>
          <div className="space-y-2">
            {stats.recent_referrals.slice(0, 3).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-xs font-bold text-white">
                    {referral.referred_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {referral.referred_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  referral.status === 'rewarded'
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : referral.status === 'completed'
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {referral.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      {!compact && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">How it works</p>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Share your unique link with friends' },
              { step: '2', text: 'They sign up and complete a study session' },
              { step: '3', text: 'You both earn bonus credits!' }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white">
                  {item.step}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Button */}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full p-3 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700"
        >
          View Referral Dashboard
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Referral Code Input for Signup
export function ReferralCodeInput({
  onApply,
  disabled = false
}: {
  onApply?: (success: boolean) => void
  disabled?: boolean
}) {
  const [code, setCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleApply = async () => {
    if (!code.trim()) return

    setIsApplying(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ referral_code: code.trim().toUpperCase() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply referral code')
      }

      setStatus('success')
      setMessage(data.message)
      onApply?.(true)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to apply code')
      onApply?.(false)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Have a referral code?
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          disabled={disabled || isApplying || status === 'success'}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-mono uppercase disabled:opacity-50"
          maxLength={8}
        />
        <button
          onClick={handleApply}
          disabled={!code.trim() || disabled || isApplying || status === 'success'}
          className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? 'Applying...' : status === 'success' ? 'Applied!' : 'Apply'}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
