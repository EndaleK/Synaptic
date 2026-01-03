"use client"

import { useState } from "react"
import { X, Crown, Check, Sparkles, Zap, TrendingUp } from "lucide-react"
import { useToast } from "@/components/ToastContainer"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: 'documents' | 'flashcards' | 'podcasts' | 'mindmaps' | 'exams' | 'videos' | 'chat_messages' | 'quick_summaries' | 'study_buddy'
  used: number
  limit: number
}

const featureInfo = {
  documents: {
    name: 'Documents',
    icon: '📄',
    description: 'Upload and process documents',
    premiumBenefit: 'Unlimited document uploads per month'
  },
  flashcards: {
    name: 'Flashcards',
    icon: '🃏',
    description: 'Generate AI flashcards',
    premiumBenefit: 'Unlimited flashcard generations'
  },
  podcasts: {
    name: 'Podcasts',
    icon: '🎙️',
    description: 'Create AI-narrated podcasts',
    premiumBenefit: 'Unlimited podcast generations with AI voice'
  },
  mindmaps: {
    name: 'Mind Maps',
    icon: '🗺️',
    description: 'Visualize concepts interactively',
    premiumBenefit: 'Unlimited mind map generations'
  },
  exams: {
    name: 'Mock Exams',
    icon: '📝',
    description: 'Create AI-generated practice exams',
    premiumBenefit: 'Unlimited exam creations with detailed analytics'
  },
  videos: {
    name: 'Video Analysis',
    icon: '🎥',
    description: 'Process YouTube videos and generate content',
    premiumBenefit: 'Unlimited video processing with transcript analysis'
  },
  chat_messages: {
    name: 'Document Chat',
    icon: '💬',
    description: 'Chat with your documents using AI',
    premiumBenefit: 'Unlimited chat messages with document context'
  },
  quick_summaries: {
    name: 'Quick Summaries',
    icon: '⚡',
    description: 'Get 5-minute audio summaries',
    premiumBenefit: 'Unlimited quick summary generations'
  },
  study_buddy: {
    name: 'Study Buddy',
    icon: '🤖',
    description: 'AI study companion with personalized help',
    premiumBenefit: 'Unlimited Study Buddy conversations'
  }
}

export default function UpgradeModal({ isOpen, onClose, feature, used, limit }: UpgradeModalProps) {
  const toast = useToast()
  const [isUpgrading, setIsUpgrading] = useState(false)

  if (!isOpen) return null

  const info = featureInfo[feature]

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    // Live mode Stripe Price ID from dashboard
    const STRIPE_PRICE_ID = 'price_1SOk7JFjlulH6DEoUU8OO326'

    if (STRIPE_PRICE_ID === 'price_YOUR_ACTUAL_PRICE_ID') {
      toast.warning('Please configure your Stripe Price ID first. See STRIPE_SETUP_GUIDE.md for instructions.')
      setIsUpgrading(false)
      return
    }

    try {
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
      toast.error('Failed to start checkout. Please try again.')
      setIsUpgrading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Upgrade to Premium</h2>
                <p className="text-white/90 text-sm">Unlock unlimited access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Limit Reached Message */}
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{info.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200 mb-1">
                  {info.name} Limit Reached
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  You&apos;ve used <strong>{used} of {limit}</strong> {info.name.toLowerCase()} this month on the Free plan.
                </p>
              </div>
            </div>
          </div>

          {/* Premium Benefits */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              What You'll Get with Premium
            </h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">{info.premiumBenefit}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">All features unlocked</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Podcasts, Mind Maps, Advanced Socratic mode</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Priority AI processing</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Faster generation speeds</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Early access to new features</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Be the first to try new AI capabilities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl border-2 border-gray-200 dark:border-gray-600">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold text-black dark:text-white">$9.99</span>
              <span className="text-lg text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cancel anytime, no questions asked
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">Save time and boost learning productivity</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpgrading ? (
                'Processing...'
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Upgrade Now
                </>
              )}
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                <span>Secure payment</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                <span>7-day free trial</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
