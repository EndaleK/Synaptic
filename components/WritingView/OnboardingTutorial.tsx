"use client"

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector?: string // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: {
    label: string
    onClick: () => void
  }
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Synaptic Writing Mode! 🎉',
    description: 'Let\'s take a quick tour of the features that will help you write better essays. This will only take 2 minutes.',
    position: 'center'
  },
  {
    id: 'writing-stages',
    title: 'Follow the 5-Stage Writing Process',
    description: 'Writing happens in stages: Planning → Drafting → Revising → Editing → Publishing. Each stage has specific tools to help you. Click any stage to switch.',
    targetSelector: '[data-onboarding="stage-selector"]',
    position: 'bottom'
  },
  {
    id: 'planning-stage',
    title: 'Start with Planning',
    description: 'Use the Outline Generator to organize your thoughts before you start writing. A good outline makes everything easier!',
    targetSelector: '[data-onboarding="stage-tools-tab"]',
    position: 'left',
    action: {
      label: 'Open Stage Tools',
      onClick: () => {
        const tab = document.querySelector('[data-onboarding="stage-tools-tab"]') as HTMLButtonElement
        tab?.click()
      }
    }
  },
  {
    id: 'drafting-mode',
    title: 'Drafting: Just Write!',
    description: 'During drafting, grammar checking is automatically disabled. This helps you focus on getting your ideas down without worrying about perfection.',
    targetSelector: '[data-onboarding="editor"]',
    position: 'top'
  },
  {
    id: 'ai-tracking',
    title: 'Track Your AI Usage',
    description: 'See how much of your writing is your own vs AI-assisted. We help you maintain academic integrity with real-time transparency.',
    targetSelector: '[data-onboarding="progress-tab"]',
    position: 'left',
    action: {
      label: 'View Progress',
      onClick: () => {
        const tab = document.querySelector('[data-onboarding="progress-tab"]') as HTMLButtonElement
        tab?.click()
      }
    }
  },
  {
    id: 'accessibility',
    title: 'Accessible for Everyone ♿',
    description: 'Enable text-to-speech, dyslexic fonts, high contrast mode, and more. Find these settings in the Progress panel.',
    targetSelector: '[data-onboarding="progress-tab"]',
    position: 'left'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts ⌨️',
    description: 'Work faster with shortcuts:\n• Cmd/Ctrl+1-4: Switch panels\n• Cmd/Ctrl+B: Toggle panel\n• Cmd/Ctrl+S: Save\n• Cmd/Ctrl+Shift+F: Zen mode',
    position: 'center'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You\'re ready to start writing. Remember: writing is a process, not a single event. Take it one stage at a time!',
    position: 'center'
  }
]

interface OnboardingTutorialProps {
  onComplete?: () => void
  onSkip?: () => void
}

export default function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  const step = TUTORIAL_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
    if (!hasCompletedOnboarding) {
      // Wait a bit before showing to let the page load
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Update highlight position when step changes
  useEffect(() => {
    if (step.targetSelector) {
      const updateHighlight = () => {
        const target = document.querySelector(step.targetSelector!)
        if (target) {
          const rect = target.getBoundingClientRect()
          setHighlightRect(rect)

          // Scroll element into view
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          setHighlightRect(null)
        }
      }

      // Small delay to ensure DOM is ready
      setTimeout(updateHighlight, 100)

      // Update on window resize
      window.addEventListener('resize', updateHighlight)
      return () => window.removeEventListener('resize', updateHighlight)
    } else {
      setHighlightRect(null)
    }
  }, [step])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    setIsVisible(false)
    onSkip?.()
    // Don't mark as completed so they can restart if they want
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true')
    setIsVisible(false)
    onComplete?.()
  }

  const handleAction = () => {
    if (step.action) {
      step.action.onClick()
      // Wait for the action to complete, then move to next step
      setTimeout(() => handleNext(), 500)
    }
  }

  if (!isVisible) return null

  // Calculate tooltip position based on highlighted element
  const getTooltipStyle = () => {
    if (!highlightRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const padding = 20
    let style: React.CSSProperties = {}

    switch (step.position) {
      case 'top':
        style = {
          bottom: `${window.innerHeight - highlightRect.top + padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'bottom':
        style = {
          top: `${highlightRect.bottom + padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'left':
        style = {
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          right: `${window.innerWidth - highlightRect.left + padding}px`,
          transform: 'translateY(-50%)'
        }
        break
      case 'right':
        style = {
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          left: `${highlightRect.right + padding}px`,
          transform: 'translateY(-50%)'
        }
        break
    }

    return style
  }

  return (
    <>
      {/* Overlay with spotlight effect */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: highlightRect
            ? `radial-gradient(circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + 10}px, rgba(0, 0, 0, 0.7) ${Math.max(highlightRect.width, highlightRect.height) / 2 + 100}px)`
            : 'rgba(0, 0, 0, 0.7)'
        }}
      />

      {/* Highlight ring around target element */}
      {highlightRect && (
        <div
          className="fixed z-[9999] pointer-events-none animate-pulse"
          style={{
            top: `${highlightRect.top - 8}px`,
            left: `${highlightRect.left - 8}px`,
            width: `${highlightRect.width + 16}px`,
            height: `${highlightRect.height + 16}px`,
            border: '3px solid #6366f1',
            borderRadius: '12px',
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.4)'
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="fixed z-[10000] w-full max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={getTooltipStyle()}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Skip tutorial"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line leading-relaxed">
              {step.description}
            </p>

            {/* Action button (if any) */}
            {step.action && (
              <button
                onClick={handleAction}
                className="w-full mb-4 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {step.action.label}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Step indicators */}
                <div className="flex gap-1.5">
                  {TUTORIAL_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentStep
                          ? "bg-accent-primary w-6"
                          : index < currentStep
                          ? "bg-accent-primary opacity-50"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {currentStep + 1} of {TUTORIAL_STEPS.length}
                </span>
              </div>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1",
                    isLastStep
                      ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:opacity-90"
                      : "bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90"
                  )}
                >
                  {isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
