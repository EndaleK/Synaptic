'use client'

import { useEffect, useState } from 'react'
import { useTour } from './TourProvider'
import TourTooltip from './TourTooltip'

export default function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour } = useTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  const step = steps[currentStep]

  // Track window size for SVG dimensions
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  useEffect(() => {
    if (!isActive || !step) return

    const updateTargetPosition = () => {
      if (step.target === 'body') {
        setTargetRect(null) // No highlight for welcome modal
        return
      }

      const element = document.querySelector(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // Element not found, still show tooltip but without highlight
        setTargetRect(null)
      }
    }

    // Small delay to let page render
    const timer = setTimeout(updateTargetPosition, 100)

    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateTargetPosition)
      window.removeEventListener('scroll', updateTargetPosition)
    }
  }, [isActive, step, currentStep])

  if (!isActive || !step) return null

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: 'none' }}
    >
      {/* Backdrop with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'auto' }}
        width={windowSize.width}
        height={windowSize.height}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          onClick={skipTour}
        />
      </svg>

      {/* Spotlight ring effect */}
      {targetRect && (
        <div
          className="absolute border-2 border-accent-primary rounded-lg animate-pulse pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.4)'
          }}
        />
      )}

      {/* Tooltip */}
      <TourTooltip
        step={step}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        currentStep={currentStep}
        totalSteps={steps.length}
      />
    </div>
  )
}
