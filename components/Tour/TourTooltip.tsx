'use client'

import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { TourStep } from './TourProvider'

interface TourTooltipProps {
  step: TourStep
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFirstStep: boolean
  isLastStep: boolean
  currentStep: number
  totalSteps: number
}

export default function TourTooltip({
  step,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
  currentStep,
  totalSteps
}: TourTooltipProps) {
  // Calculate position based on target and placement
  const getPosition = (): React.CSSProperties => {
    if (!targetRect) {
      // Center modal for welcome step
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const padding = 16
    const tooltipWidth = 320

    switch (step.placement) {
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          ))
        }
      case 'top':
        return {
          position: 'fixed',
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          ))
        }
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.right + padding
        }
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - 60,
          right: window.innerWidth - targetRect.left + padding
        }
      default:
        return {}
    }
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 animate-fadeIn"
      style={{ ...getPosition(), pointerEvents: 'auto', zIndex: 10000 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {step.title}
        </h3>
        <button
          onClick={onSkip}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {step.hasTimeWarning && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Takes a few minutes</span>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
        {/* Progress dots */}
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-accent-primary'
                  : i < currentStep
                  ? 'bg-accent-primary/50'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium"
          >
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Skip link */}
      <div className="text-center pb-3">
        <button
          onClick={onSkip}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Skip tour
        </button>
      </div>
    </div>
  )
}
