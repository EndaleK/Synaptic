'use client'

import { Loader2, Sparkles, BookOpen, Mic, Network, FileQuestion } from 'lucide-react'

interface ContentPreparationBannerProps {
  progress: number // 0-100
  message?: string
}

const preparationSteps = [
  { icon: BookOpen, label: 'Generating Flashcards' },
  { icon: Network, label: 'Creating Mind Map' },
  { icon: Mic, label: 'Preparing Podcast' },
  { icon: FileQuestion, label: 'Building Quiz' },
]

export default function ContentPreparationBanner({ progress, message }: ContentPreparationBannerProps) {
  // Determine which step we're on based on progress
  const currentStepIndex = Math.min(
    Math.floor(progress / 25),
    preparationSteps.length - 1
  )
  const currentStep = preparationSteps[currentStepIndex]
  const CurrentIcon = currentStep.icon

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 border border-purple-500/30 p-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100%] animate-[spin_20s_linear_infinite] bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Preparing Your Study Materials
            </h3>
            <p className="text-white/60 text-sm">
              {message || 'Your personalized content is being generated...'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/70">{currentStep.label}</span>
            <span className="text-white font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between">
          {preparationSteps.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStepIndex
            const isComplete = index < currentStepIndex

            return (
              <div
                key={index}
                className={`flex flex-col items-center gap-1 ${
                  isComplete ? 'text-emerald-400' : isActive ? 'text-purple-400' : 'text-white/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isComplete
                    ? 'bg-emerald-500/20'
                    : isActive
                    ? 'bg-purple-500/30 animate-pulse'
                    : 'bg-white/5'
                }`}>
                  {isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.label.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
