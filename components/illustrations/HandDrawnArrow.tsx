"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type ArrowDirection = 'right' | 'down-right' | 'down' | 'up-right' | 'left'

interface HandDrawnArrowProps {
  direction?: ArrowDirection
  color?: 'purple' | 'pink' | 'gray' | 'brand'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  animate?: boolean
}

/**
 * HandDrawnArrow - Animated hand-drawn arrow pointing in various directions
 * Great for pointing to CTAs or highlighting important elements
 */
export function HandDrawnArrow({
  direction = 'right',
  color = 'purple',
  size = 'md',
  className,
  animate = true,
}: HandDrawnArrowProps) {
  const [isVisible, setIsVisible] = useState(!animate)
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!animate) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animate])

  const colorClasses = {
    purple: 'text-[#7B3FF2]',
    pink: 'text-[#E91E8C]',
    gray: 'text-gray-400 dark:text-gray-500',
    brand: 'text-[#7B3FF2] dark:text-[#E91E8C]',
  }

  const sizeClasses = {
    sm: 'w-8 h-6',
    md: 'w-12 h-8',
    lg: 'w-16 h-12',
  }

  const rotations = {
    'right': 'rotate-0',
    'down-right': 'rotate-45',
    'down': 'rotate-90',
    'up-right': '-rotate-45',
    'left': 'rotate-180',
  }

  return (
    <svg
      ref={ref}
      className={cn(
        sizeClasses[size],
        colorClasses[color],
        rotations[direction],
        isVisible ? "opacity-100" : "opacity-0",
        animate && "transition-opacity duration-500",
        className
      )}
      viewBox="0 0 48 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Arrow body - wavy line */}
      <path
        d="M4 18C12 14 24 20 32 16C36 14 40 16 44 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn(isVisible && animate && "animate-draw-line")}
        style={{
          strokeDasharray: 60,
          strokeDashoffset: isVisible ? 0 : 60,
        }}
      />
      {/* Arrow head */}
      <path
        d="M36 10C40 12 44 14 44 14C44 14 42 18 40 22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(isVisible && animate && "animate-draw-line")}
        style={{
          strokeDasharray: 30,
          strokeDashoffset: isVisible ? 0 : 30,
          animationDelay: '0.3s',
        }}
      />
    </svg>
  )
}

type CurvedArrowVariant = 'down-to-button' | 'side-point' | 'swoosh'

interface CurvedArrowProps extends Omit<HandDrawnArrowProps, 'direction'> {
  variant?: CurvedArrowVariant
}

/**
 * CurvedArrow - A curved hand-drawn arrow with multiple variants for different contexts
 * - 'down-to-button': Points down and curves to the right, ideal for above CTAs
 * - 'side-point': Small arrow pointing to the side
 * - 'swoosh': Playful swooshing arrow
 */
export function CurvedArrow({
  color = 'purple',
  size = 'md',
  className,
  animate = true,
  variant = 'down-to-button',
}: CurvedArrowProps) {
  const [isVisible, setIsVisible] = useState(!animate)
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!animate) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animate])

  const colorClasses = {
    purple: 'text-[#7B3FF2]',
    pink: 'text-[#E91E8C]',
    gray: 'text-gray-400 dark:text-gray-500',
    brand: 'text-[#7B3FF2] dark:text-[#E91E8C]',
  }

  const sizeClasses = {
    sm: 'w-8 h-10',
    md: 'w-12 h-14',
    lg: 'w-16 h-18',
  }

  // Render different SVG based on variant
  if (variant === 'down-to-button') {
    return (
      <svg
        ref={ref}
        className={cn(
          sizeClasses[size],
          colorClasses[color],
          isVisible ? "opacity-100" : "opacity-0",
          animate && "transition-opacity duration-500",
          className
        )}
        viewBox="0 0 48 56"
        fill="none"
        aria-hidden="true"
      >
        {/* Curved line swooping down */}
        <path
          d="M8 4C4 12 6 24 14 32C22 40 34 44 40 52"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={cn(isVisible && animate && "animate-draw-line")}
          style={{
            strokeDasharray: 100,
            strokeDashoffset: isVisible ? 0 : 100,
          }}
        />
        {/* Arrow head pointing down-right */}
        <path
          d="M34 46L40 52L44 44"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(isVisible && animate && "animate-draw-line")}
          style={{
            strokeDasharray: 25,
            strokeDashoffset: isVisible ? 0 : 25,
            animationDelay: '0.4s',
          }}
        />
        {/* Small decorative dot at start */}
        <circle cx="8" cy="4" r="2" fill="currentColor" opacity={isVisible ? 0.6 : 0} />
      </svg>
    )
  }

  if (variant === 'side-point') {
    return (
      <svg
        ref={ref}
        className={cn(
          'w-10 h-6',
          colorClasses[color],
          isVisible ? "opacity-100" : "opacity-0",
          animate && "transition-opacity duration-500",
          className
        )}
        viewBox="0 0 40 24"
        fill="none"
        aria-hidden="true"
      >
        {/* Simple curved line */}
        <path
          d="M4 12C12 8 24 8 32 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={cn(isVisible && animate && "animate-draw-line")}
          style={{
            strokeDasharray: 40,
            strokeDashoffset: isVisible ? 0 : 40,
          }}
        />
        {/* Arrow head */}
        <path
          d="M28 8L34 12L28 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // Default: swoosh variant
  return (
    <svg
      ref={ref}
      className={cn(
        sizeClasses[size],
        colorClasses[color],
        isVisible ? "opacity-100" : "opacity-0",
        animate && "transition-opacity duration-500",
        className
      )}
      viewBox="0 0 64 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Swooshing curved body */}
      <path
        d="M6 36C14 40 24 38 32 32C40 26 48 18 56 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn(isVisible && animate && "animate-draw-line")}
        style={{
          strokeDasharray: 80,
          strokeDashoffset: isVisible ? 0 : 80,
        }}
      />
      {/* Arrow head */}
      <path
        d="M48 8C52 10 56 12 56 12C56 12 56 16 54 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(isVisible && animate && "animate-draw-line")}
        style={{
          strokeDasharray: 25,
          strokeDashoffset: isVisible ? 0 : 25,
          animationDelay: '0.4s',
        }}
      />
    </svg>
  )
}

export default HandDrawnArrow
