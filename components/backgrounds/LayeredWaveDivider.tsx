"use client"

import { cn } from "@/lib/utils"

interface LayeredWaveDividerProps {
  flip?: boolean
  className?: string
}

/**
 * LayeredWaveDivider - Stacked dark wave layers for depth
 *
 * Creates a visually rich transition with multiple dark-colored waves
 * stacked on top of each other, transitioning from lighter to darker.
 */
export function LayeredWaveDivider({
  flip = false,
  className
}: LayeredWaveDividerProps) {
  // Different curve paths for visual variation
  const paths = {
    back: "M0,56 Q360,20 720,40 T1440,32 L1440,96 L0,96 Z",
    middle: "M0,48 C240,72 480,16 720,36 C960,56 1200,24 1440,44 L1440,96 L0,96 Z",
    front: "M0,40 Q360,8 720,32 T1440,48 L1440,96 L0,96 Z"
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden pointer-events-none select-none",
        flip && "rotate-180",
        className
      )}
      aria-hidden="true"
      style={{ height: '80px' }}
    >
      {/* Back layer - Darkest purple/navy */}
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ color: '#1a1625' }}
      >
        <path d={paths.back} fill="currentColor" />
      </svg>

      {/* Middle layer - Medium dark purple */}
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ color: '#150f20', transform: 'translateY(8px)' }}
      >
        <path d={paths.middle} fill="currentColor" />
      </svg>

      {/* Front layer - Deep black with purple tint */}
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ color: '#0e0a14', transform: 'translateY(16px)' }}
      >
        <path d={paths.front} fill="currentColor" />
      </svg>
    </div>
  )
}

export default LayeredWaveDivider
