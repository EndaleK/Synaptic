"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

type AvatarVariant = 1 | 2 | 3

interface OpenPeepAvatarProps {
  variant: AvatarVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
  withBorder?: boolean
  withGlow?: boolean
}

/**
 * OpenPeepAvatar - Hand-drawn character avatars in the Open Peeps style
 * Use for testimonials and user representations
 */
export function OpenPeepAvatar({
  variant,
  size = 'md',
  className,
  withBorder = false,
  withGlow = false,
}: OpenPeepAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  const sizePixels = {
    sm: 40,
    md: 56,
    lg: 80,
  }

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
        sizeClasses[size],
        withBorder && "ring-2 ring-white dark:ring-gray-800 ring-offset-2 ring-offset-transparent",
        withGlow && "shadow-lg shadow-purple-500/20",
        className
      )}
    >
      <Image
        src={`/illustrations/open-peeps/testimonials/avatar-${variant}.svg`}
        alt=""
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full object-cover"
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * Inline SVG avatars for when we need more control or don't want image loading
 */
export function InlineAvatar1({ size = 'md', className }: Omit<OpenPeepAvatarProps, 'variant'>) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="40" cy="40" r="32" fill="#FFECD2" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Hair - Short wavy */}
      <path d="M16 32C16 20 26 10 40 10C54 10 64 20 64 32C64 28 58 22 50 22C42 22 36 26 32 24C28 22 22 24 18 28C16 30 16 32 16 32Z" fill="#4A3728" stroke="#1a1a1a" strokeWidth="1.5"/>
      {/* Eyes */}
      <ellipse cx="30" cy="38" rx="3" ry="4" fill="#1a1a1a"/>
      <ellipse cx="50" cy="38" rx="3" ry="4" fill="#1a1a1a"/>
      {/* Eyebrows */}
      <path d="M25 32C27 30 33 30 35 32" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M45 32C47 30 53 30 55 32" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M40 42C38 44 38 48 40 50" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M32 54C36 58 44 58 48 54" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Glasses */}
      <circle cx="30" cy="38" r="8" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/>
      <circle cx="50" cy="38" r="8" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/>
      <path d="M38 38H42" stroke="#1a1a1a" strokeWidth="1.5"/>
    </svg>
  )
}

export function InlineAvatar2({ size = 'md', className }: Omit<OpenPeepAvatarProps, 'variant'>) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="40" cy="40" r="32" fill="#D4A574" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Hair - Long straight */}
      <path d="M12 36C12 18 24 8 40 8C56 8 68 18 68 36C68 34 64 30 60 28C60 32 62 44 62 52C62 56 58 58 56 54C56 44 58 32 56 28C52 26 48 24 40 24C32 24 28 26 24 28C22 32 24 44 24 54C22 58 18 56 18 52C18 44 20 32 20 28C16 30 12 34 12 36Z" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1"/>
      {/* Eyes */}
      <ellipse cx="30" cy="40" rx="2.5" ry="3.5" fill="#1a1a1a"/>
      <ellipse cx="50" cy="40" rx="2.5" ry="3.5" fill="#1a1a1a"/>
      {/* Eyebrows */}
      <path d="M26 34C28 33 32 33 34 35" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M46 35C48 33 52 33 54 34" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M40 44C39 46 39 48 41 50" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M34 56C37 59 43 59 46 56" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Earrings */}
      <circle cx="12" cy="44" r="3" fill="#ec4899"/>
      <circle cx="68" cy="44" r="3" fill="#ec4899"/>
    </svg>
  )
}

export function InlineAvatar3({ size = 'md', className }: Omit<OpenPeepAvatarProps, 'variant'>) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="40" cy="40" r="32" fill="#8D5524" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Hair - Curly/Afro style */}
      <path d="M10 38C8 24 20 8 40 8C60 8 72 24 70 38C72 36 74 32 72 26C70 18 60 8 40 8C20 8 10 18 8 26C6 32 8 36 10 38Z" fill="#1a1a1a"/>
      <circle cx="18" cy="28" r="6" fill="#1a1a1a"/>
      <circle cx="28" cy="18" r="7" fill="#1a1a1a"/>
      <circle cx="40" cy="14" r="8" fill="#1a1a1a"/>
      <circle cx="52" cy="18" r="7" fill="#1a1a1a"/>
      <circle cx="62" cy="28" r="6" fill="#1a1a1a"/>
      <circle cx="14" cy="38" r="5" fill="#1a1a1a"/>
      <circle cx="66" cy="38" r="5" fill="#1a1a1a"/>
      {/* Eyes */}
      <ellipse cx="30" cy="40" rx="3" ry="4" fill="#1a1a1a"/>
      <ellipse cx="50" cy="40" rx="3" ry="4" fill="#1a1a1a"/>
      {/* Eye shine */}
      <circle cx="31" cy="39" r="1" fill="white"/>
      <circle cx="51" cy="39" r="1" fill="white"/>
      {/* Eyebrows */}
      <path d="M25 34C28 32 32 32 35 34" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M45 34C48 32 52 32 55 34" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M38 45C37 47 38 50 42 50C43 50 43 47 42 45" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Big smile */}
      <path d="M30 54C34 60 46 60 50 54" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M32 56C36 58 44 58 48 56" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export default OpenPeepAvatar
