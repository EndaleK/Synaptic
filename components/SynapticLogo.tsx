"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface SynapticLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

/**
 * SynapticLogo - Brand logo with brain icon and text
 * Matches the existing brand colors: blue, purple, pink, orange gradient
 */
export function SynapticLogo({
  className,
  size = 'md',
  showTagline = false
}: SynapticLogoProps) {
  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {/* Brain Icon */}
      <Image
        src="/logo-brain-transparent.png"
        alt="Synaptic"
        width={iconSizes[size]}
        height={iconSizes[size]}
        className="w-auto"
        style={{ height: iconSizes[size] }}
        priority
      />

      {/* Text */}
      <div className="flex flex-col">
        <span
          className="font-display font-bold tracking-tight bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent"
          style={{
            fontSize: size === 'sm' ? '1.25rem' : size === 'md' ? '1.5rem' : '1.75rem',
            lineHeight: 1.2,
            paddingBottom: '0.1em'
          }}
        >
          Synaptic
        </span>
        {showTagline && (
          <span className="text-gray-500 dark:text-gray-400 leading-none"
            style={{ fontSize: size === 'sm' ? '0.6rem' : size === 'md' ? '0.7rem' : '0.8rem' }}
          >
            Study Smarter
          </span>
        )}
      </div>
    </Link>
  )
}

export default SynapticLogo
