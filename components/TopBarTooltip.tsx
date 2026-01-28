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
            "fixed z-[10001] w-[280px] rounded-2xl overflow-hidden",
            "bg-[#0C0A14] dark:bg-[#0C0A14]",
            "border border-[#7B3FF2]/20",
            "shadow-[0_8px_32px_rgba(123,63,242,0.25),0_0_0_1px_rgba(123,63,242,0.1)]",
            "tooltip-enter pointer-events-none backdrop-blur-xl"
          )}
          style={{
            top: position.top,
            left: position.left
          }}
        >
          {/* Gradient accent bar at top */}
          <div className="h-1 w-full bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35]" />

          <div className="p-4">
            {/* Title */}
            <h4 className="font-bold text-base text-white mb-2 tracking-tight">
              {content.title}
            </h4>

            {/* Description */}
            <p className="text-[13px] text-gray-300/90 leading-relaxed mb-4">
              {content.description}
            </p>

            {/* Best For section - styled as a pill/badge area */}
            <div className="bg-[#7B3FF2]/10 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A78BFA] block mb-1">
                Best for
              </span>
              <p className="text-[13px] text-gray-200 leading-snug">
                {content.bestFor}
              </p>
            </div>

            {/* Optional tip */}
            {content.tip && (
              <div className="flex items-start gap-2.5 bg-amber-500/10 rounded-xl px-3 py-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                </div>
                <p className="text-[13px] text-amber-200/90 leading-snug">
                  {content.tip}
                </p>
              </div>
            )}
          </div>

          {/* Arrow indicator pointing up */}
          <div
            className="absolute w-3 h-3 rotate-45 bg-[#0C0A14] border-l border-t border-[#7B3FF2]/20"
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
