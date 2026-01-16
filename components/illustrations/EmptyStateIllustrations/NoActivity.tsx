"use client"

import { cn } from "@/lib/utils"
import { BrandGradientDefs } from "../IllustrationWrapper"

interface NoActivityProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * NoActivity - Custom SVG illustration for empty activity/recent items state
 * Features a clock/calendar motif with brand gradients
 */
export default function NoActivity({ className, size = 'md' }: NoActivityProps) {
  const sizes = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  }

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
      aria-hidden="true"
    >
      <BrandGradientDefs />

      {/* Background elements */}
      <circle cx="60" cy="60" r="48" fill="url(#purple-muted-gradient)" opacity="0.3" />

      {/* Calendar/Dashboard base */}
      <g transform="translate(25, 25)">
        <rect
          width="70"
          height="70"
          rx="12"
          fill="currentColor"
          className="text-white dark:text-gray-900"
          stroke="url(#purple-pink-gradient)"
          strokeWidth="2"
        />

        {/* Calendar header */}
        <rect
          y="0"
          width="70"
          height="18"
          rx="12"
          fill="url(#purple-pink-gradient)"
        />
        <rect
          y="10"
          width="70"
          height="8"
          fill="url(#purple-pink-gradient)"
        />

        {/* Header dots */}
        <circle cx="15" cy="9" r="3" fill="white" opacity="0.6" />
        <circle cx="25" cy="9" r="3" fill="white" opacity="0.6" />
        <circle cx="35" cy="9" r="3" fill="white" opacity="0.6" />

        {/* Empty content area - dashed lines suggesting missing content */}
        <g stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="text-gray-200 dark:text-gray-700">
          <line x1="12" y1="30" x2="58" y2="30" />
          <line x1="12" y1="42" x2="48" y2="42" />
          <line x1="12" y1="54" x2="52" y2="54" />
        </g>

        {/* Empty state icon in center */}
        <g transform="translate(25, 35)">
          <circle cx="10" cy="10" r="8" fill="url(#purple-muted-gradient)" stroke="url(#purple-pink-gradient)" strokeWidth="1.5" />
          <path
            d="M10 6 L10 10 L13 12"
            stroke="url(#purple-pink-gradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>

      {/* Floating time/activity indicators */}
      <g transform="translate(85, 20)">
        <circle
          cx="0"
          cy="0"
          r="12"
          fill="currentColor"
          className="text-white dark:text-gray-800"
          stroke="url(#pink-orange-gradient)"
          strokeWidth="1.5"
        />
        <path
          d="M0 -5 L0 0 L3 2"
          stroke="url(#pink-orange-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Decorative elements */}
      <circle cx="20" cy="30" r="3" fill="#7B3FF2" opacity="0.5" />
      <circle cx="105" cy="90" r="2" fill="#E91E8C" opacity="0.5" />
      <circle cx="15" cy="85" r="2" fill="#FF6B35" opacity="0.5" />

      {/* Subtle connection lines */}
      <path
        d="M20 33 Q40 50, 25 60"
        stroke="url(#purple-pink-gradient)"
        strokeWidth="1"
        strokeDasharray="3 3"
        fill="none"
        opacity="0.3"
      />
    </svg>
  )
}
