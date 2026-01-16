"use client"

import { cn } from "@/lib/utils"
import { BrandGradientDefs } from "../IllustrationWrapper"

interface NoFlashcardsProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * NoFlashcards - Custom SVG illustration for empty flashcards state
 * Features stacked flashcard shapes with a brain/learning motif
 */
export default function NoFlashcards({ className, size = 'md' }: NoFlashcardsProps) {
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

      {/* Background glow */}
      <ellipse cx="60" cy="65" rx="45" ry="40" fill="url(#brand-glow)" opacity="0.4" />

      {/* Back flashcard */}
      <g transform="translate(20, 35) rotate(-12)">
        <rect
          width="60"
          height="40"
          rx="6"
          fill="currentColor"
          className="text-gray-200 dark:text-gray-700"
        />
      </g>

      {/* Middle flashcard */}
      <g transform="translate(27, 38) rotate(-4)">
        <rect
          width="60"
          height="40"
          rx="6"
          fill="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        {/* Question mark hint */}
        <text
          x="30"
          y="26"
          textAnchor="middle"
          fill="currentColor"
          className="text-gray-300 dark:text-gray-600"
          fontSize="16"
          fontWeight="bold"
        >
          ?
        </text>
      </g>

      {/* Front flashcard with gradient border */}
      <g transform="translate(32, 42)">
        <rect
          width="60"
          height="40"
          rx="6"
          fill="currentColor"
          className="text-white dark:text-gray-900"
          stroke="url(#brand-gradient-d)"
          strokeWidth="2"
        />

        {/* Brain icon simplified */}
        <g transform="translate(22, 10)">
          {/* Brain outline */}
          <path
            d="M8 4 C4 4, 2 7, 2 10 C2 13, 4 15, 6 15 C6 17, 8 19, 10 19 C12 19, 14 17, 14 15 C16 15, 18 13, 18 10 C18 7, 16 4, 12 4 C11 2, 9 2, 8 4 Z"
            stroke="url(#purple-pink-gradient)"
            strokeWidth="2"
            fill="url(#purple-muted-gradient)"
          />
          {/* Neural connection lines */}
          <path
            d="M6 8 Q10 11, 14 8"
            stroke="url(#purple-pink-gradient)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M7 12 Q10 14, 13 12"
            stroke="url(#purple-pink-gradient)"
            strokeWidth="1"
            fill="none"
          />
        </g>

        {/* Text placeholder lines */}
        <rect x="10" y="32" width="40" height="2" rx="1" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
      </g>

      {/* Floating sparkle elements */}
      <g className="animate-sparkle">
        <path
          d="M85 25 L87 30 L92 32 L87 34 L85 39 L83 34 L78 32 L83 30 Z"
          fill="#7B3FF2"
        />
      </g>
      <g className="animate-sparkle" style={{ animationDelay: '0.7s' }}>
        <path
          d="M25 70 L26 73 L29 74 L26 75 L25 78 L24 75 L21 74 L24 73 Z"
          fill="#E91E8C"
          transform="scale(0.8)"
        />
      </g>
      <g className="animate-sparkle" style={{ animationDelay: '1.4s' }}>
        <path
          d="M95 75 L96 78 L99 79 L96 80 L95 83 L94 80 L91 79 L94 78 Z"
          fill="#FF6B35"
          transform="scale(0.7)"
        />
      </g>

      {/* Plus indicator */}
      <circle cx="95" cy="55" r="10" fill="url(#purple-pink-gradient)" />
      <path
        d="M95 50 L95 60 M90 55 L100 55"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
