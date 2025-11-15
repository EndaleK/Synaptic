"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FeatureHighlightProps {
  targetSelector: string
  message: string
  duration?: number
}

export function useFeatureHighlight() {
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null)
  const [highlightMessage, setHighlightMessage] = useState<string>('')

  const highlight = (targetSelector: string, message: string, duration = 2000) => {
    setHighlightTarget(targetSelector)
    setHighlightMessage(message)

    setTimeout(() => {
      setHighlightTarget(null)
      setHighlightMessage('')
    }, duration)
  }

  return {
    highlightTarget,
    highlightMessage,
    highlight
  }
}

export default function FeatureHighlight({
  targetSelector,
  message,
  duration = 2000
}: FeatureHighlightProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const element = document.querySelector(targetSelector)
    if (element) {
      const elementRect = element.getBoundingClientRect()
      setRect(elementRect)

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Add highlight class to element
      element.classList.add('feature-highlight')

      // Remove after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        element.classList.remove('feature-highlight')
      }, duration)

      return () => {
        clearTimeout(timer)
        element.classList.remove('feature-highlight')
      }
    } else {
      setIsVisible(false)
    }
  }, [targetSelector, duration])

  if (!isVisible || !rect) return null

  return (
    <div
      className="fixed z-[9999] pointer-events-none animate-in fade-in duration-200"
      style={{
        top: `${rect.bottom + 10}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="bg-gradient-to-r from-accent-primary to-accent-secondary text-white px-4 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap">
        <div className="relative">
          {message}
          {/* Arrow pointing up */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-accent-primary" />
        </div>
      </div>
    </div>
  )
}
