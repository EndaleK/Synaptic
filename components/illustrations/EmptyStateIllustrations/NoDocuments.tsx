"use client"

import { cn } from "@/lib/utils"
import { BrandGradientDefs } from "../IllustrationWrapper"

interface NoDocumentsProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * NoDocuments - Custom SVG illustration for empty documents state
 * Features a stack of document shapes with brand gradient accents
 */
export default function NoDocuments({ className, size = 'md' }: NoDocumentsProps) {
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

      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="url(#purple-muted-gradient)" opacity="0.5" />

      {/* Back document */}
      <g transform="translate(30, 25) rotate(-8)">
        <rect
          width="48"
          height="64"
          rx="4"
          fill="currentColor"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Text lines */}
        <rect x="8" y="12" width="32" height="3" rx="1.5" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
        <rect x="8" y="20" width="28" height="3" rx="1.5" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
        <rect x="8" y="28" width="30" height="3" rx="1.5" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      </g>

      {/* Middle document */}
      <g transform="translate(35, 28) rotate(4)">
        <rect
          width="48"
          height="64"
          rx="4"
          fill="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        {/* Text lines */}
        <rect x="8" y="12" width="32" height="3" rx="1.5" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
        <rect x="8" y="20" width="24" height="3" rx="1.5" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
        <rect x="8" y="28" width="28" height="3" rx="1.5" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
      </g>

      {/* Front document with gradient accent */}
      <g transform="translate(38, 32)">
        <rect
          width="48"
          height="64"
          rx="4"
          fill="currentColor"
          className="text-white dark:text-gray-900"
          stroke="url(#purple-pink-gradient)"
          strokeWidth="2"
        />

        {/* Document corner fold */}
        <path
          d="M36 0 L48 12 L36 12 Z"
          fill="currentColor"
          className="text-gray-50 dark:text-gray-800"
        />
        <path
          d="M36 0 L48 12 L36 12 Z"
          stroke="url(#purple-pink-gradient)"
          strokeWidth="2"
          fill="none"
        />

        {/* Plus icon in center */}
        <circle cx="24" cy="36" r="12" fill="url(#purple-muted-gradient)" />
        <path
          d="M24 30 L24 42 M18 36 L30 36"
          stroke="url(#purple-pink-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Bottom text lines */}
        <rect x="8" y="52" width="32" height="2" rx="1" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
        <rect x="8" y="58" width="24" height="2" rx="1" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
      </g>

      {/* Decorative sparkles */}
      <circle cx="95" cy="30" r="2" fill="#7B3FF2" className="animate-pulse" />
      <circle cx="25" cy="45" r="1.5" fill="#E91E8C" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
      <circle cx="100" cy="80" r="1.5" fill="#FF6B35" className="animate-pulse" style={{ animationDelay: '1s' }} />
    </svg>
  )
}
