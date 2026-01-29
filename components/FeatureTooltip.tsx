"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { HelpCircle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudyModeTooltipContent } from "@/lib/constants/study-mode-tooltips"

interface FeatureTooltipProps {
  content: StudyModeTooltipContent
  children: React.ReactNode
}

/**
 * FeatureTooltip - Rich tooltip for study mode cards
 * Shows on hover (desktop) or tap of info icon (mobile)
 * Includes title, description, "best for" section, and optional tip
 */
export function FeatureTooltip({ content, children }: FeatureTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 })
  const [showAbove, setShowAbove] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(window.matchMedia("(hover: none)").matches)
    }
    checkTouchDevice()
    window.addEventListener("resize", checkTouchDevice)
    return () => window.removeEventListener("resize", checkTouchDevice)
  }, [])

  // Calculate tooltip position
  const calculatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const gap = 8

    // Determine if tooltip should show above or below
    const spaceBelow = viewportHeight - containerRect.bottom
    const spaceAbove = containerRect.top
    const shouldShowAbove = spaceBelow < tooltipRect.height + gap && spaceAbove > spaceBelow
    setShowAbove(shouldShowAbove)

    // Calculate horizontal position (centered on card, but clamped to viewport)
    let left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2

    // Clamp to viewport bounds with padding
    const padding = 16
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding))

    if (shouldShowAbove) {
      setPosition({
        bottom: viewportHeight - containerRect.top + gap,
        left
      })
    } else {
      setPosition({
        top: containerRect.bottom + gap,
        left
      })
    }
  }, [])

  // Recalculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered before measuring
      requestAnimationFrame(calculatePosition)
    }
  }, [isVisible, calculatePosition])

  // Handle click outside for mobile
  useEffect(() => {
    if (!isVisible || !isTouchDevice) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isVisible, isTouchDevice])

  // Desktop hover handlers
  const handleMouseEnter = () => {
    if (isTouchDevice) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 400) // 400ms delay for hover
  }

  const handleMouseLeave = () => {
    if (isTouchDevice) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  // Mobile info icon click handler
  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    e.preventDefault()
    setIsVisible(!isVisible)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mobile info icon */}
      {isTouchDevice && (
        <button
          onClick={handleInfoClick}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="Show feature info"
        >
          <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* Card content */}
      {children}

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "fixed z-[10001] w-[240px] rounded-xl overflow-hidden",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-800",
            "card-level-3",
            "tooltip-enter backdrop-blur-md"
          )}
          style={{
            ...(showAbove ? { bottom: position.bottom } : { top: position.top }),
            left: position.left
          }}
        >
          {/* Left accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#7B3FF2]" />

          <div className="p-3">
            {/* Title */}
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 tracking-tight">
              {content.title}
            </h4>

            {/* Description */}
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5">
              {content.description}
            </p>

            {/* Best For section */}
            <div className="bg-[#7B3FF2]/5 dark:bg-[#7B3FF2]/10 rounded-lg px-2.5 py-2 mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#7B3FF2] dark:text-purple-400 block mb-1">
                Best for
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                {content.bestFor}
              </p>
            </div>

            {/* Optional tip */}
            {content.tip && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2.5 py-2">
                <Lightbulb className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
                  {content.tip}
                </p>
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div
            className={cn(
              "absolute w-3 h-3 rotate-45 bg-white dark:bg-gray-900",
              "border-gray-200 dark:border-gray-800",
              showAbove
                ? "bottom-[-6px] border-r border-b"
                : "top-[-6px] border-l border-t"
            )}
            style={{
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)"
            }}
          />
        </div>
      )}
    </div>
  )
}

export default FeatureTooltip
