'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  Crown,
  Star,
  Sparkles,
  Trophy,
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  ChevronRight,
  Zap
} from 'lucide-react'

interface ReferralStats {
  referralCode: string
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  referralCredits: number
  referralLink: string
}

interface Milestone {
  type: string
  referralCount: number
  rewardType: string
  rewardValue: number
  achieved: boolean
  achievedAt?: string
}

interface RecentReferral {
  id: string
  referredName: string
  status: 'pending' | 'completed' | 'rewarded'
  createdAt: string
  completedAt?: string
  reward?: number
}

export default function ReferralsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([])

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setMilestones(data.milestones || [])
        setRecentReferrals(data.recentReferrals || [])
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (stats?.referralLink && navigator.share) {
      try {
        await navigator.share({
          title: 'Join Synaptic',
          text: 'Study smarter with AI-powered learning tools! Use my referral link to get bonus credits.',
          url: stats.referralLink
        })
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'first_referral':
        return <Star className="w-5 h-5" />
      case '5_referrals':
        return <Trophy className="w-5 h-5" />
      case '10_referrals':
        return <Crown className="w-5 h-5" />
      case '25_referrals':
        return <Sparkles className="w-5 h-5" />
      default:
        return <Gift className="w-5 h-5" />
    }
  }

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case 'first_referral':
        return 'First Referral'
      case '5_referrals':
        return '5 Referrals'
      case '10_referrals':
        return '10 Referrals'
      case '25_referrals':
        return '25 Referrals'
      default:
        return 'Milestone'
    }
  }

  const getRewardLabel = (rewardType: string, rewardValue: number) => {
    switch (rewardType) {
      case 'bonus_credits':
        return `${rewardValue} bonus credits`
      case 'free_month':
        return rewardValue === 1 ? '1 free month' : `${rewardValue} free months`
      case 'premium_features':
        return '1 year premium'
      default:
        return 'Special reward'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Referral Program</h1>
              <p className="text-white/80 mt-1">Invite friends and earn rewards</p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold">{stats.totalReferrals}</p>
                <p className="text-sm text-white/80">Total Referrals</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold">{stats.completedReferrals}</p>
                <p className="text-sm text-white/80">Completed</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold">{stats.pendingReferrals}</p>
                <p className="text-sm text-white/80">Pending</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold">{stats.referralCredits}</p>
                <p className="text-sm text-white/80">Credits Earned</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Share Your Link */}
        {stats && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Share Your Referral Link
            </h2>

            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {stats.referralLink}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="hidden sm:inline text-green-600 dark:text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="hidden sm:inline text-gray-700 dark:text-gray-300">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 rounded-xl border border-pink-100 dark:border-pink-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold">
                  {stats.referralCode}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Your referral code: <span className="font-mono font-bold">{stats.referralCode}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Friends can enter this code during signup
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mb-3">
                <Share2 className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">1. Share</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send your unique link to friends
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">2. They Sign Up</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Friends create an account using your link
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mb-3">
                <Gift className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">3. Both Earn</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You get 100 credits, they get 50!
              </p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Milestone Rewards
          </h2>

          <div className="space-y-3">
            {[
              { type: 'first_referral', count: 1, reward: 'bonus_credits', value: 50, current: stats?.totalReferrals || 0 },
              { type: '5_referrals', count: 5, reward: 'free_month', value: 1, current: stats?.totalReferrals || 0 },
              { type: '10_referrals', count: 10, reward: 'free_month', value: 3, current: stats?.totalReferrals || 0 },
              { type: '25_referrals', count: 25, reward: 'premium_features', value: 12, current: stats?.totalReferrals || 0 }
            ].map(milestone => {
              const achieved = milestone.current >= milestone.count
              const savedMilestone = milestones.find(m => m.type === milestone.type)

              return (
                <div
                  key={milestone.type}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    achieved
                      ? 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    achieved
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {getMilestoneIcon(milestone.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {getMilestoneLabel(milestone.type)}
                      </h3>
                      {achieved && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getRewardLabel(milestone.reward, milestone.value)}
                    </p>
                  </div>

                  <div className="text-right">
                    {achieved ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Unlocked!
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {milestone.current}/{milestone.count}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Referrals */}
        {recentReferrals.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Referrals
            </h2>

            <div className="space-y-3">
              {recentReferrals.map(referral => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">
                      {referral.referredName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {referral.referredName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {referral.status === 'pending' && (
                      <span className="px-3 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full">
                        Pending
                      </span>
                    )}
                    {referral.status === 'completed' && (
                      <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full">
                        Completed
                      </span>
                    )}
                    {referral.status === 'rewarded' && (
                      <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
                        <Zap className="w-3 h-3" />
                        +{referral.reward} credits
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
