'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface TourStep {
  id: string
  target: string // CSS selector for element to highlight
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  hasTimeWarning?: boolean
}

interface TourContextValue {
  isActive: boolean
  currentStep: number
  steps: TourStep[]
  startTour: () => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  goToStep: (index: number) => void
}

const TourContext = createContext<TourContextValue | null>(null)

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: 'body', // Full modal, no highlight
    title: 'Welcome to Synaptic!',
    content: "Let's take a quick tour of your AI-powered learning assistant. You can skip anytime.",
    placement: 'bottom'
  },
  {
    id: 'documents',
    target: '[data-tour="documents"]',
    title: 'Your Document Library',
    content: 'Start by uploading study materials - PDFs, Word docs, or paste URLs. Everything lives here.',
    placement: 'right'
  },
  {
    id: 'learning-modes',
    target: '[data-tour="learning-modes"]',
    title: '10 Ways to Learn',
    content: 'Transform documents into flashcards, podcasts, mind maps, and more. Each mode adapts to your learning style.',
    placement: 'top'
  },
  {
    id: 'flashcards',
    target: '[data-tour="flashcards"]',
    title: 'Smart Flashcards',
    content: 'Generate flashcards with spaced repetition for effective memorization.',
    placement: 'bottom'
  },
  {
    id: 'podcast',
    target: '[data-tour="podcast"]',
    title: 'Audio Learning',
    content: 'Turn documents into podcast episodes.\n\nHeads up: Generation takes 2-3 minutes. Perfect time for a quick stretch!',
    placement: 'bottom',
    hasTimeWarning: true
  },
  {
    id: 'mindmap',
    target: '[data-tour="mindmap"]',
    title: 'Visual Mind Maps',
    content: 'See concepts as interactive diagrams.\n\nHeads up: Complex documents take 1-2 minutes to map.',
    placement: 'bottom',
    hasTimeWarning: true
  },
  {
    id: 'study-buddy',
    target: '[data-tour="study-buddy"]',
    title: 'Your AI Study Partner',
    content: 'Ask questions anytime! Study Buddy uses your documents for personalized answers.',
    placement: 'left'
  },
  {
    id: 'complete',
    target: '[data-tour="sidebar-tools"]',
    title: "You're All Set!",
    content: 'Track streaks, use the Pomodoro timer, and view your progress. Happy learning!',
    placement: 'right'
  }
]

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Ensure we're mounted before checking localStorage
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if tour should show (first-time user, hasn't skipped)
  useEffect(() => {
    if (!mounted) return

    const tourCompleted = localStorage.getItem('synaptic-tour-completed')
    const tourSkipped = localStorage.getItem('synaptic-tour-skipped')
    const hasVisited = localStorage.getItem('synaptic-visited')

    if (!hasVisited && !tourCompleted && !tourSkipped) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => {
        setIsActive(true)
        localStorage.setItem('synaptic-visited', 'true')
      }, 1500)
      return () => clearTimeout(timer)
    }

    if (!hasVisited) {
      localStorage.setItem('synaptic-visited', 'true')
    }
  }, [mounted])

  const startTour = () => {
    setCurrentStep(0)
    setIsActive(true)
  }

  const endTour = () => {
    setIsActive(false)
    localStorage.setItem('synaptic-tour-completed', 'true')
  }

  const skipTour = () => {
    setIsActive(false)
    localStorage.setItem('synaptic-tour-skipped', 'true')
  }

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStep(index)
    }
  }

  return (
    <TourContext.Provider value={{
      isActive,
      currentStep,
      steps: TOUR_STEPS,
      startTour,
      endTour,
      nextStep,
      prevStep,
      skipTour,
      goToStep
    }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}
