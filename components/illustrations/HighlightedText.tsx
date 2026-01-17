"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface HighlightedTextProps {
  children: ReactNode
  color?: 'yellow' | 'pink' | 'purple' | 'brand'
  className?: string
  animate?: boolean
}

/**
 * HighlightedText - Wraps text with a hand-drawn underline effect
 * Uses inline SVG for the underline with optional entrance animation
 */
export function HighlightedText({
  children,
  color = 'yellow',
  className,
  animate = true,
}: HighlightedTextProps) {
  const [isVisible, setIsVisible] = useState(!animate)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!animate) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animate])

  const colorClasses = {
    yellow: 'text-amber-400',
    pink: 'text-pink-400',
    purple: 'text-[#7B3FF2]',
    brand: 'text-[#E91E8C]',
  }

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      {children}
      <svg
        className={cn(
          "absolute -bottom-1 left-0 w-full h-3 pointer-events-none",
          colorClasses[color],
          isVisible ? "opacity-100" : "opacity-0",
          animate && "transition-opacity duration-500"
        )}
        viewBox="0 0 200 20"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M3 12C20 8 40 14 60 10C80 6 100 15 120 11C140 7 160 13 180 9C190 7 197 10 197 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            isVisible && animate && "animate-draw-line"
          )}
          style={{
            strokeDasharray: 300,
            strokeDashoffset: isVisible ? 0 : 300,
          }}
        />
      </svg>
    </span>
  )
}

/**
 * CircleHighlight - Hand-drawn circle around content (for stats/numbers)
 */
export function CircleHighlight({
  children,
  color = 'yellow',
  className,
  animate = true,
}: HighlightedTextProps) {
  const [isVisible, setIsVisible] = useState(!animate)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!animate) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animate])

  const colorClasses = {
    yellow: 'text-amber-400',
    pink: 'text-pink-400',
    purple: 'text-[#7B3FF2]',
    brand: 'text-[#E91E8C]',
  }

  return (
    <span ref={ref} className={cn("relative inline-block px-2", className)}>
      {children}
      <svg
        className={cn(
          "absolute inset-0 w-full h-full pointer-events-none -m-1",
          colorClasses[color],
          isVisible ? "opacity-60" : "opacity-0",
          animate && "transition-opacity duration-500"
        )}
        viewBox="0 0 100 50"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M15 28C13 18 25 8 50 6C75 4 88 14 90 25C92 36 78 46 52 48C26 50 17 38 15 28Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className={cn(
            isVisible && animate && "animate-draw-line"
          )}
          style={{
            strokeDasharray: 250,
            strokeDashoffset: isVisible ? 0 : 250,
          }}
        />
      </svg>
    </span>
  )
}

export default HighlightedText
