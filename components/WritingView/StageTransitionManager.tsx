"use client"

import { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { WritingStage } from '@/lib/supabase/types'
import './stage-transitions.css'

interface StageTransitionManagerProps {
  previousStage: WritingStage | null
  currentStage: WritingStage
  onTransitionComplete?: () => void
}

const STAGE_MESSAGES = {
  planning: {
    title: 'Planning Stage',
    message: 'Organize your thoughts and create a structure',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  drafting: {
    title: 'Drafting Stage',
    message: 'Focus on ideas - grammar checking is disabled',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  revising: {
    title: 'Revising Stage',
    message: 'Review and improve your content',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  editing: {
    title: 'Editing Stage',
    message: 'Refine language and fix errors',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  publishing: {
    title: 'Publishing Stage',
    message: 'Final polish and prepare for submission',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800'
  }
}

export default function StageTransitionManager({
  previousStage,
  currentStage,
  onTransitionComplete
}: StageTransitionManagerProps) {
  const [showTransition, setShowTransition] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([])

  useEffect(() => {
    // Only show transition if stage actually changed
    if (previousStage && previousStage !== currentStage) {
      setShowTransition(true)

      // Create confetti for stage completion
      const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5
      }))
      setConfetti(confettiPieces)

      // Show celebration modal briefly
      setShowCelebration(true)

      // Hide transition after animation
      const timer = setTimeout(() => {
        setShowTransition(false)
        setShowCelebration(false)
        setConfetti([])
        onTransitionComplete?.()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [currentStage, previousStage, onTransitionComplete])

  if (!showTransition) return null

  const stageInfo = STAGE_MESSAGES[currentStage]

  return (
    <>
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`confetti confetti-${(piece.id % 5) + 1}`}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}

      {/* Transition notification */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
          <div className={`celebration-modal ${stageInfo.bgColor} ${stageInfo.borderColor} border-2 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 pointer-events-auto`}>
            {/* Checkmark for previous stage completion */}
            {previousStage && (
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 52 52">
                    <circle className="checkmark-path" cx="26" cy="26" r="25" fill="none" stroke="white" strokeWidth="4" />
                    <path className="checkmark-path" fill="none" stroke="white" strokeWidth="4" d="M14 27l7 7 16-16" />
                  </svg>
                </div>
              </div>
            )}

            {/* New stage info */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 ${stageInfo.color} mb-2`}>
                <Sparkles className="w-5 h-5" />
                <h3 className="text-xl font-bold">{stageInfo.title}</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                {stageInfo.message}
              </p>
            </div>

            {/* Progress ring */}
            <div className="flex justify-center mt-6">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className={`progress-ring ${stageInfo.color}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
