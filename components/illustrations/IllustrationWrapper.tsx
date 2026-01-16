"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface IllustrationWrapperProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  glow?: boolean
}

/**
 * IllustrationWrapper - Consistent wrapper for all SVG illustrations
 * Provides sizing, optional animation, and optional glow effects
 */
export default function IllustrationWrapper({
  children,
  className,
  size = 'md',
  animate = false,
  glow = false,
}: IllustrationWrapperProps) {
  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizes[size],
        animate && "animate-float-gentle",
        className
      )}
    >
      {/* Optional glow effect */}
      {glow && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-full blur-2xl opacity-50"
          aria-hidden="true"
        />
      )}

      {/* Illustration content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}

/**
 * BrandGradientDefs - Reusable SVG gradient definitions for illustrations
 * Include this in your SVG to use brand gradients
 */
export function BrandGradientDefs() {
  return (
    <defs>
      {/* Primary brand gradient (horizontal) */}
      <linearGradient id="brand-gradient-h" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7B3FF2" />
        <stop offset="50%" stopColor="#E91E8C" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>

      {/* Primary brand gradient (vertical) */}
      <linearGradient id="brand-gradient-v" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7B3FF2" />
        <stop offset="50%" stopColor="#E91E8C" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>

      {/* Primary brand gradient (diagonal) */}
      <linearGradient id="brand-gradient-d" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7B3FF2" />
        <stop offset="50%" stopColor="#E91E8C" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>

      {/* Purple to pink gradient */}
      <linearGradient id="purple-pink-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7B3FF2" />
        <stop offset="100%" stopColor="#E91E8C" />
      </linearGradient>

      {/* Pink to orange gradient */}
      <linearGradient id="pink-orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E91E8C" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>

      {/* Muted purple gradient for backgrounds */}
      <linearGradient id="purple-muted-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(123, 63, 242, 0.15)" />
        <stop offset="100%" stopColor="rgba(123, 63, 242, 0.05)" />
      </linearGradient>

      {/* Radial glow effect */}
      <radialGradient id="brand-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(123, 63, 242, 0.3)" />
        <stop offset="70%" stopColor="rgba(233, 30, 140, 0.1)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  )
}
