"use client"

import { cn } from "@/lib/utils"

interface WaveDividerProps {
  variant?: 'wave' | 'curve' | 'flow'
  flip?: boolean
  className?: string
}

/**
 * WaveDivider - SVG-based organic section separator
 *
 * Creates smooth, curved transitions between landing page sections.
 *
 * Variants:
 * - wave: Classic sine wave pattern
 * - curve: Single smooth arc (gentler)
 * - flow: Asymmetric organic curve (more dynamic)
 *
 * Use flip={true} to invert the curve direction
 */
export function WaveDivider({
  variant = 'curve',
  flip = false,
  className
}: WaveDividerProps) {
  const paths = {
    wave: "M0,32 C120,64 240,0 360,32 C480,64 600,0 720,32 C840,64 960,0 1080,32 C1200,64 1320,0 1440,32 L1440,64 L0,64 Z",
    curve: "M0,48 Q360,0 720,32 T1440,48 L1440,64 L0,64 Z",
    flow: "M0,40 C240,64 480,8 720,24 C960,40 1200,56 1440,32 L1440,64 L0,64 Z"
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden leading-[0] pointer-events-none select-none",
        flip && "rotate-180",
        className
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className="w-full h-8 md:h-12 lg:h-16"
        fill="currentColor"
      >
        <path d={paths[variant]} />
      </svg>
    </div>
  )
}

export default WaveDivider
