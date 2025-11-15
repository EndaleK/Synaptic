"use client"

import { useState, useRef, useEffect } from 'react'
import { Info, HelpCircle, Lightbulb, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  type?: 'info' | 'help' | 'tip' | 'warning'
  delay?: number
  maxWidth?: number
}

const TOOLTIP_ICONS = {
  info: Info,
  help: HelpCircle,
  tip: Lightbulb,
  warning: AlertTriangle
}

const TOOLTIP_COLORS = {
  info: 'bg-blue-600 text-white',
  help: 'bg-purple-600 text-white',
  tip: 'bg-amber-600 text-white',
  warning: 'bg-red-600 text-white'
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  type = 'info',
  delay = 300,
  maxWidth = 250
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const timeoutRef = useRef<NodeJS.Timeout>()
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const Icon = TOOLTIP_ICONS[type]

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const gap = 8

      let style: React.CSSProperties = {}

      switch (position) {
        case 'top':
          style = {
            bottom: `${window.innerHeight - triggerRect.top + gap}px`,
            left: `${triggerRect.left + triggerRect.width / 2}px`,
            transform: 'translateX(-50%)'
          }
          break
        case 'bottom':
          style = {
            top: `${triggerRect.bottom + gap}px`,
            left: `${triggerRect.left + triggerRect.width / 2}px`,
            transform: 'translateX(-50%)'
          }
          break
        case 'left':
          style = {
            top: `${triggerRect.top + triggerRect.height / 2}px`,
            right: `${window.innerWidth - triggerRect.left + gap}px`,
            transform: 'translateY(-50%)'
          }
          break
        case 'right':
          style = {
            top: `${triggerRect.top + triggerRect.height / 2}px`,
            left: `${triggerRect.right + gap}px`,
            transform: 'translateY(-50%)'
          }
          break
      }

      // Ensure tooltip stays within viewport
      if (style.left && parseFloat(style.left as string) + tooltipRect.width > window.innerWidth) {
        style.left = `${window.innerWidth - tooltipRect.width - 16}px`
        style.transform = 'none'
      }

      setTooltipStyle(style)
    }
  }, [isVisible, position])

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const handleFocus = () => {
    setIsVisible(true)
  }

  const handleBlur = () => {
    setIsVisible(false)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "fixed z-[10001] tooltip-enter",
            TOOLTIP_COLORS[type],
            "rounded-lg shadow-xl px-3 py-2 text-sm font-medium pointer-events-none"
          )}
          style={{ ...tooltipStyle, maxWidth: `${maxWidth}px` }}
        >
          <div className="flex items-start gap-2">
            {Icon && <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p className="leading-relaxed">{content}</p>
          </div>

          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 rotate-45",
              TOOLTIP_COLORS[type],
              {
                'bottom-[-4px] left-1/2 -translate-x-1/2': position === 'top',
                'top-[-4px] left-1/2 -translate-x-1/2': position === 'bottom',
                'right-[-4px] top-1/2 -translate-y-1/2': position === 'left',
                'left-[-4px] top-1/2 -translate-y-1/2': position === 'right'
              }
            )}
          />
        </div>
      )}
    </>
  )
}

// Shorthand tooltip components
export function InfoTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return <Tooltip content={content} type="info">{children}</Tooltip>
}

export function HelpTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return <Tooltip content={content} type="help">{children}</Tooltip>
}

export function TipTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return <Tooltip content={content} type="tip">{children}</Tooltip>
}

export function WarningTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return <Tooltip content={content} type="warning">{children}</Tooltip>
}
