'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Share2, Twitter } from 'lucide-react'
import { getMilestoneForStreak, isNewMilestone } from './StreakBadge'
import { analytics } from '@/lib/analytics'

interface MilestoneCelebrationModalProps {
  days: number
  isOpen: boolean
  onClose: () => void
}

export default function MilestoneCelebrationModal({
  days,
  isOpen,
  onClose
}: MilestoneCelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const milestone = getMilestoneForStreak(days)

  useEffect(() => {
    if (isOpen && milestone) {
      setShowConfetti(true)
      // Track milestone achievement
      analytics.streakMilestone(days, milestone.label)

      // Auto-close after 5 seconds
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, milestone, days, onClose])

  if (!isOpen || !milestone) return null

  const IconComponent = milestone.icon

  const handleShare = () => {
    const text = `I just hit a ${days}-day study streak on Synaptic! ${getMilestoneEmoji(days)}`
    const url = 'https://synaptic.study'

    if (navigator.share) {
      navigator.share({ title: 'Study Streak Achievement!', text, url })
    } else {
      // Fallback to Twitter
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank'
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti effect */}
      {showConfetti && <ConfettiEffect />}

      {/* Modal */}
      <div
        className={`
          relative z-10 w-full max-w-sm
          bg-gradient-to-br ${milestone.gradient}
          rounded-3xl p-8 text-center text-white
          shadow-2xl
          animate-bounce-in
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-white/20 animate-pulse">
            <IconComponent className="w-12 h-12" />
          </div>
        </div>

        {/* Celebration text */}
        <h2 className="text-2xl font-bold mb-2">{getMilestoneEmoji(days)} Incredible!</h2>
        <p className="text-lg font-medium mb-1">{days}-Day Streak Achieved!</p>
        <p className="text-white/80 mb-6">
          You've earned the <span className="font-bold">{milestone.label}</span> badge!
        </p>

        {/* Motivational message */}
        <p className="text-sm text-white/70 mb-6">
          {getMotivationalMessage(days)}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 font-medium transition-colors"
          >
            Keep Going!
          </button>
          <button
            onClick={handleShare}
            className="px-6 py-2.5 rounded-xl bg-white text-gray-900 font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

function getMilestoneEmoji(days: number): string {
  if (days >= 100) return '👑'
  if (days >= 60) return '🏆'
  if (days >= 30) return '⭐'
  if (days >= 14) return '⚡'
  if (days >= 7) return '🔥'
  return '🎉'
}

function getMotivationalMessage(days: number): string {
  if (days >= 100) return "You're absolutely legendary! Your dedication is inspiring."
  if (days >= 60) return "Two months of consistent learning. You're a true champion!"
  if (days >= 30) return "A whole month! Your brain is thanking you for this."
  if (days >= 14) return "Two weeks strong! Habits are forming."
  if (days >= 7) return "One week down! You're building a powerful habit."
  return "Keep up the amazing work!"
}

// Simple CSS confetti effect
function ConfettiEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'][
              Math.floor(Math.random() * 6)
            ],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}

// Hook to check for milestone celebration
export function useMilestoneCelebration(currentStreak: number) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebratedMilestone, setCelebratedMilestone] = useState<number | null>(null)

  useEffect(() => {
    // Only celebrate if this is a new milestone and we haven't already celebrated it
    if (
      isNewMilestone(currentStreak) &&
      celebratedMilestone !== currentStreak
    ) {
      // Check if we've already celebrated this milestone in this session
      const celebratedKey = `milestone-celebrated-${currentStreak}`
      if (!sessionStorage.getItem(celebratedKey)) {
        setShowCelebration(true)
        setCelebratedMilestone(currentStreak)
        sessionStorage.setItem(celebratedKey, 'true')
      }
    }
  }, [currentStreak, celebratedMilestone])

  const closeCelebration = () => setShowCelebration(false)

  return {
    showCelebration,
    closeCelebration
  }
}
