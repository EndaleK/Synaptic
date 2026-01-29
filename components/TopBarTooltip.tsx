"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TopBarTooltipContent } from "@/lib/constants/topbar-tooltips"

interface TopBarTooltipProps {
  content: TopBarTooltipContent
  children: React.ReactNode
}

/**
 * TopBarTooltip - Tooltip for top bar navigation items
 * Shows below the nav item on hover (desktop only, no mobile info icon needed for nav)
 */
export function TopBarTooltip({ content, children }: TopBarTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate tooltip position
  const calculatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const gap = 8

    // Position below the nav item
    const top = containerRect.bottom + gap

    // Center horizontally, but clamp to viewport
    let left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2
    const padding = 16
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding))

    setPosition({ top, left })
  }, [])

  // Recalculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(calculatePosition)
    }
  }, [isVisible, calculatePosition])

  // Desktop hover handlers
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 400)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
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
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "fixed z-[10001] w-[220px] rounded-xl overflow-hidden",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-800",
            "card-level-3",
            "tooltip-enter pointer-events-none backdrop-blur-md"
          )}
          style={{
            top: position.top,
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

          {/* Arrow indicator pointing up */}
          <div
            className="absolute w-3 h-3 rotate-45 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-800"
            style={{
              top: "-6px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)"
            }}
          />
        </div>
      )}
    </div>
  )
}

export default TopBarTooltip
