"use client"

import { cn } from "@/lib/utils"

interface BackgroundOrbsProps {
  className?: string
  variant?: 'default' | 'hero' | 'subtle' | 'dashboard'
}

/**
 * BackgroundOrbs - Decorative floating gradient orbs for atmospheric backgrounds
 * Uses brand colors (purple, pink, orange) with smooth animations
 * Respects prefers-reduced-motion for accessibility
 */
export default function BackgroundOrbs({ className, variant = 'default' }: BackgroundOrbsProps) {
  const variants = {
    default: {
      orb1: 'w-[300px] h-[300px] top-[10%] right-[10%] from-violet-400/15 via-purple-300/10 to-transparent',
      orb2: 'w-[400px] h-[400px] bottom-[20%] left-[5%] from-pink-400/10 via-rose-300/5 to-transparent',
      orb3: 'w-[250px] h-[250px] top-[50%] right-[30%] from-orange-400/10 via-amber-300/5 to-transparent',
    },
    hero: {
      orb1: 'w-[500px] h-[500px] -top-[10%] -right-[10%] from-violet-500/20 via-purple-400/15 to-transparent',
      orb2: 'w-[600px] h-[600px] -bottom-[20%] -left-[15%] from-pink-500/15 via-rose-400/10 to-transparent',
      orb3: 'w-[350px] h-[350px] top-[40%] right-[20%] from-orange-500/15 via-amber-400/10 to-transparent',
    },
    subtle: {
      orb1: 'w-[200px] h-[200px] top-[15%] right-[15%] from-violet-300/8 via-purple-200/5 to-transparent',
      orb2: 'w-[250px] h-[250px] bottom-[25%] left-[10%] from-pink-300/6 via-rose-200/4 to-transparent',
      orb3: 'w-[150px] h-[150px] top-[60%] right-[35%] from-orange-300/6 via-amber-200/4 to-transparent',
    },
    dashboard: {
      orb1: 'w-[400px] h-[400px] top-[5%] right-[5%] from-violet-400/10 via-purple-300/5 to-transparent',
      orb2: 'w-[350px] h-[350px] bottom-[10%] left-[5%] from-pink-400/8 via-rose-300/4 to-transparent',
      orb3: 'w-[200px] h-[200px] top-[40%] left-[30%] from-orange-400/8 via-amber-300/4 to-transparent',
    },
  }

  const selectedVariant = variants[variant]

  return (
    <div
      className={cn("fixed inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
    >
      {/* Primary orb - Purple */}
      <div
        className={cn(
          "absolute rounded-full bg-gradient-radial blur-3xl animate-float-orb",
          selectedVariant.orb1
        )}
        style={{ animationDelay: '0s' }}
      />

      {/* Secondary orb - Pink */}
      <div
        className={cn(
          "absolute rounded-full bg-gradient-radial blur-3xl animate-float-orb",
          selectedVariant.orb2
        )}
        style={{ animationDelay: '7s' }}
      />

      {/* Tertiary orb - Orange */}
      <div
        className={cn(
          "absolute rounded-full bg-gradient-radial blur-3xl animate-float-orb",
          selectedVariant.orb3
        )}
        style={{ animationDelay: '14s' }}
      />
    </div>
  )
}

/**
 * StaticBackgroundOrbs - Non-animated version for performance-sensitive areas
 */
export function StaticBackgroundOrbs({ className, variant = 'subtle' }: BackgroundOrbsProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
    >
      {/* Static gradient orbs without animation */}
      <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-300/10 via-purple-200/5 to-transparent dark:from-violet-600/5 dark:via-purple-500/3 blur-3xl" />
      <div className="absolute bottom-[15%] left-[10%] w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-pink-300/8 via-rose-200/4 to-transparent dark:from-pink-600/4 dark:via-rose-500/2 blur-3xl" />
    </div>
  )
}
