"use client"

import { cn } from "@/lib/utils"

interface GridPatternProps {
  className?: string
  variant?: 'default' | 'dot' | 'line' | 'cross'
  opacity?: 'subtle' | 'medium' | 'strong'
}

/**
 * GridPattern - Decorative grid/dot patterns for backgrounds
 * Uses brand purple color with configurable opacity
 */
export default function GridPattern({
  className,
  variant = 'default',
  opacity = 'subtle'
}: GridPatternProps) {
  const opacityValues = {
    subtle: { light: 0.03, dark: 0.06 },
    medium: { light: 0.06, dark: 0.10 },
    strong: { light: 0.10, dark: 0.15 },
  }

  const { light, dark } = opacityValues[opacity]

  const patterns = {
    default: (
      <div
        className={cn("absolute inset-0 pointer-events-none", className)}
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(123, 63, 242, ${light}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(123, 63, 242, ${light}) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    ),
    dot: (
      <div
        className={cn("absolute inset-0 pointer-events-none", className)}
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(rgba(123, 63, 242, ${light * 2}) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    ),
    line: (
      <div
        className={cn("absolute inset-0 pointer-events-none", className)}
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(123, 63, 242, ${light}) 1px, transparent 1px)`,
          backgroundSize: '100% 32px',
        }}
      />
    ),
    cross: (
      <div
        className={cn("absolute inset-0 pointer-events-none", className)}
        aria-hidden="true"
      >
        {/* Cross pattern using pseudo-positioned elements */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cross-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M24 20v8M20 24h8"
                stroke={`rgba(123, 63, 242, ${light * 3})`}
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cross-pattern)" />
        </svg>
      </div>
    ),
  }

  // Apply dark mode variant
  if (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) {
    const darkPatterns = {
      default: (
        <div
          className={cn("absolute inset-0 pointer-events-none", className)}
          aria-hidden="true"
          style={{
            backgroundImage: `
              linear-gradient(rgba(123, 63, 242, ${dark}) 1px, transparent 1px),
              linear-gradient(90deg, rgba(123, 63, 242, ${dark}) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      ),
      dot: (
        <div
          className={cn("absolute inset-0 pointer-events-none", className)}
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(rgba(123, 63, 242, ${dark * 2}) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      ),
      line: (
        <div
          className={cn("absolute inset-0 pointer-events-none", className)}
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgba(123, 63, 242, ${dark}) 1px, transparent 1px)`,
            backgroundSize: '100% 32px',
          }}
        />
      ),
      cross: patterns.cross, // Cross pattern handles dark mode via inline styles
    }
    return darkPatterns[variant]
  }

  return patterns[variant]
}

/**
 * GradientMesh - A subtle gradient mesh background effect
 */
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="mesh-gradient-1" cx="25%" cy="25%" r="50%">
            <stop offset="0%" stopColor="rgba(123, 63, 242, 0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="mesh-gradient-2" cx="75%" cy="75%" r="50%">
            <stop offset="0%" stopColor="rgba(233, 30, 140, 0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="mesh-gradient-3" cx="80%" cy="20%" r="40%">
            <stop offset="0%" stopColor="rgba(255, 107, 53, 0.05)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#mesh-gradient-1)" />
        <rect width="100" height="100" fill="url(#mesh-gradient-2)" />
        <rect width="100" height="100" fill="url(#mesh-gradient-3)" />
      </svg>
    </div>
  )
}
