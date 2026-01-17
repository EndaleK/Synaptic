"use client"

import { cn } from "@/lib/utils"

interface IconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

// Brand Theme Colors
const PURPLE = "#7B3FF2"
const LIGHT_PURPLE = "#F0E6FF"
const PINK = "#E91E8C"
const INK = "#1a1a1a"

/**
 * Hand-drawn flashcard/book icon
 */
export function FlashcardIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Back card */}
      <rect x="8" y="10" width="28" height="20" rx="2" fill={LIGHT_PURPLE} stroke={PURPLE} strokeWidth="2" transform="rotate(-5 8 10)"/>
      {/* Front card */}
      <rect x="12" y="14" width="28" height="20" rx="2" fill="white" stroke={INK} strokeWidth="2"/>
      {/* Lines on card */}
      <path d="M17 20H32" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 25H28" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <path d="M17 29H25" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      {/* Sparkle */}
      <circle cx="38" cy="12" r="2" fill={PINK}/>
      <path d="M38 8V10M38 14V16M34 12H36M40 12H42" stroke={PINK} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn exam/clipboard icon
 */
export function ExamIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Clipboard */}
      <rect x="10" y="8" width="28" height="34" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Clip */}
      <rect x="18" y="4" width="12" height="8" rx="2" fill="#7B3FF2" stroke="#1a1a1a" strokeWidth="1.5"/>
      {/* Checkboxes */}
      <rect x="14" y="18" width="6" height="6" rx="1" stroke="#22C55E" strokeWidth="1.5" fill="#DCFCE7"/>
      <path d="M15 21L17 23L20 19" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 20H32" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>

      <rect x="14" y="28" width="6" height="6" rx="1" stroke="#22C55E" strokeWidth="1.5" fill="#DCFCE7"/>
      <path d="M15 31L17 33L20 29" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 30H30" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>

      {/* A+ grade */}
      <text x="30" y="16" fontFamily="Patrick Hand, cursive" fontSize="8" fill="#E91E8C" fontWeight="bold">A+</text>
    </svg>
  )
}

/**
 * Hand-drawn robot/AI buddy icon
 */
export function StudyBuddyIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Head/body */}
      <rect x="12" y="14" width="24" height="22" rx="6" fill="#F0E6FF" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Antenna */}
      <circle cx="24" cy="8" r="3" fill="#7B3FF2" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M24 11V14" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Eyes - friendly */}
      <circle cx="18" cy="22" r="3" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <circle cx="30" cy="22" r="3" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <circle cx="19" cy="22" r="1.5" fill="#1a1a1a"/>
      <circle cx="31" cy="22" r="1.5" fill="#1a1a1a"/>
      {/* Smile */}
      <path d="M18 30C20 33 28 33 30 30" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Speech bubble */}
      <path d="M38 10C38 6 42 4 46 6C48 8 46 14 42 14C40 14 39 13 38 12" stroke="#E91E8C" strokeWidth="1.5" fill="#FCE7F3"/>
      <text x="40" y="10" fontSize="5" fill="#E91E8C">?</text>
      {/* Arms */}
      <path d="M10 22C8 22 6 24 6 26C6 28 8 28 10 27" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 22C40 22 42 24 42 26C42 28 40 28 38 27" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn microphone/podcast icon
 */
export function PodcastIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Microphone body */}
      <rect x="18" y="8" width="12" height="22" rx="6" fill="#F0E6FF" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Microphone details */}
      <path d="M18 16H30" stroke="#7B3FF2" strokeWidth="1" opacity="0.5"/>
      <path d="M18 20H30" stroke="#7B3FF2" strokeWidth="1" opacity="0.5"/>
      <path d="M18 24H30" stroke="#7B3FF2" strokeWidth="1" opacity="0.5"/>
      {/* Stand */}
      <path d="M24 30V38" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 38H30" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      {/* Sound arc */}
      <path d="M14 14C10 18 10 26 14 30" stroke="#E91E8C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M34 14C38 18 38 26 34 30" stroke="#E91E8C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Sound waves */}
      <path d="M8 18C6 22 6 24 8 28" stroke="#E91E8C" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <path d="M40 18C42 22 42 24 40 28" stroke="#E91E8C" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

/**
 * Hand-drawn mind map/network icon
 */
export function MindMapIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Central node */}
      <circle cx="24" cy="24" r="8" fill="#7B3FF2" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Connecting lines */}
      <path d="M18 20L10 12" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M30 20L38 12" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 32V40" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 28L8 34" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M30 28L40 34" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Outer nodes */}
      <circle cx="10" cy="12" r="5" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1.5"/>
      <circle cx="38" cy="12" r="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
      <circle cx="24" cy="40" r="5" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.5"/>
      <circle cx="8" cy="34" r="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="1.5"/>
      <circle cx="40" cy="34" r="4" fill="#FCE7F3" stroke="#EC4899" strokeWidth="1.5"/>
      {/* Brain icon in center - S shape */}
      <path d="M27 22C27 21 26 20 24 20C22 20 21 21 21 22C21 23 22 24 24 24C26 24 27 25 27 26C27 27 26 28 24 28C22 28 21 27 21 26" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn calendar/planner icon
 */
export function PlannerIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Calendar body */}
      <rect x="8" y="12" width="32" height="30" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Header */}
      <rect x="8" y="12" width="32" height="10" rx="3" fill="#7B3FF2"/>
      {/* Binding rings */}
      <circle cx="16" cy="12" r="2" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <circle cx="32" cy="12" r="2" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      {/* Calendar grid */}
      <rect x="12" y="26" width="6" height="5" rx="1" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1"/>
      <rect x="21" y="26" width="6" height="5" rx="1" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1"/>
      <rect x="30" y="26" width="6" height="5" rx="1" fill="#E0E7FF" stroke="#6366F1" strokeWidth="1"/>
      <rect x="12" y="34" width="6" height="5" rx="1" fill="#FCE7F3" stroke="#EC4899" strokeWidth="1"/>
      <rect x="21" y="34" width="6" height="5" rx="1" fill="#7B3FF2" stroke="#7B3FF2" strokeWidth="1"/>
      <rect x="30" y="34" width="6" height="5" rx="1" stroke="#E5E7EB" strokeWidth="1"/>
      {/* Checkmark on today */}
      <path d="M22 36L24 38L27 34" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/**
 * Hand-drawn graduation cap icon - colorful theme
 */
export function GraduationIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Cap top - purple */}
      <path d="M24 8L4 18L24 28L44 18L24 8Z" fill={PURPLE} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
      {/* Cap underside - light purple */}
      <path d="M12 22V32C12 32 18 38 24 38C30 38 36 32 36 32V22" stroke={INK} strokeWidth="2" fill={LIGHT_PURPLE}/>
      {/* Decorative band on cap */}
      <path d="M10 17L24 24L38 17" stroke={PINK} strokeWidth="2" strokeLinecap="round"/>
      {/* Tassel string */}
      <path d="M44 18V30" stroke={PINK} strokeWidth="2" strokeLinecap="round"/>
      {/* Tassel */}
      <circle cx="44" cy="32" r="3" fill={PINK} stroke={INK} strokeWidth="1"/>
      <path d="M42 35C42 38 44 42 44 42C44 42 46 38 46 35" stroke={PINK} strokeWidth="2" strokeLinecap="round"/>
      {/* Sparkles */}
      <circle cx="10" cy="10" r="1.5" fill="#FBBF24"/>
      <circle cx="38" cy="8" r="1" fill="#FBBF24"/>
      <circle cx="6" cy="24" r="1" fill={PINK}/>
    </svg>
  )
}

/**
 * Hand-drawn target/focus icon
 */
export function TargetIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="24" cy="24" r="18" stroke="#7B3FF2" strokeWidth="2" fill="none"/>
      {/* Middle ring */}
      <circle cx="24" cy="24" r="12" stroke="#7B3FF2" strokeWidth="2" fill="#F0E6FF"/>
      {/* Inner ring */}
      <circle cx="24" cy="24" r="6" stroke="#1a1a1a" strokeWidth="2" fill="#7B3FF2"/>
      {/* Bullseye */}
      <circle cx="24" cy="24" r="2" fill="white"/>
      {/* Arrow */}
      <path d="M38 10L26 22" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 10L34 11L37 14L38 10Z" fill="#FBBF24" stroke="#1a1a1a" strokeWidth="1"/>
      {/* Feathers */}
      <path d="M40 8L42 6" stroke="#E91E8C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 12L44 10" stroke="#E91E8C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn document/file icon
 */
export function DocumentIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Paper */}
      <path d="M12 6H30L38 14V42H12V6Z" fill="white" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round"/>
      {/* Folded corner */}
      <path d="M30 6V14H38" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M30 6L38 14H30V6Z" fill="#E5E7EB"/>
      {/* Text lines */}
      <path d="M16 22H32" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 28H28" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 34H30" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Highlight mark */}
      <rect x="16" y="20" width="10" height="4" fill="#FBBF24" opacity="0.4" rx="1"/>
    </svg>
  )
}

/**
 * Hand-drawn check/verify icon
 */
export function VerifyIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Shield shape */}
      <path d="M24 4L8 12V24C8 34 16 42 24 44C32 42 40 34 40 24V12L24 4Z" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2"/>
      {/* Checkmark */}
      <path d="M16 24L22 30L34 18" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Sparkle */}
      <circle cx="38" cy="8" r="2" fill="#FBBF24"/>
      <path d="M38 4V6M38 10V12M34 8H36M40 8H42" stroke="#FBBF24" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn trophy/award icon
 */
export function TrophyIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Trophy cup */}
      <path d="M14 8H34V18C34 26 30 32 24 32C18 32 14 26 14 18V8Z" fill="#FBBF24" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Left handle */}
      <path d="M14 12H10C8 12 6 14 6 16C6 18 8 20 10 20H14" stroke="#1a1a1a" strokeWidth="2" fill="#FEF3C7"/>
      {/* Right handle */}
      <path d="M34 12H38C40 12 42 14 42 16C42 18 40 20 38 20H34" stroke="#1a1a1a" strokeWidth="2" fill="#FEF3C7"/>
      {/* Stem */}
      <path d="M22 32V36H26V32" stroke="#1a1a1a" strokeWidth="2"/>
      {/* Base */}
      <rect x="16" y="36" width="16" height="4" rx="1" fill="#1a1a1a"/>
      <rect x="14" y="40" width="20" height="4" rx="1" fill="#2D2D2D" stroke="#1a1a1a" strokeWidth="1"/>
      {/* Star on cup */}
      <path d="M24 14L25.5 17L29 17.5L26.5 20L27 24L24 22L21 24L21.5 20L19 17.5L22.5 17L24 14Z" fill="white" stroke="#1a1a1a" strokeWidth="0.5"/>
      {/* Sparkles */}
      <circle cx="10" cy="6" r="1.5" fill="#E91E8C"/>
      <circle cx="38" cy="6" r="1" fill="#E91E8C"/>
    </svg>
  )
}

/**
 * Hand-drawn upload/cloud icon
 */
export function UploadIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Cloud shape */}
      <path d="M12 32C8 32 4 28 4 24C4 20 8 16 12 16C12 10 18 6 24 6C30 6 36 10 36 16C40 16 44 20 44 24C44 28 40 32 36 32" stroke="#1a1a1a" strokeWidth="2" fill="white"/>
      {/* Upload arrow */}
      <path d="M24 38V24" stroke="#7B3FF2" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 28L24 22L30 28" stroke="#7B3FF2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Document being uploaded */}
      <rect x="20" y="36" width="8" height="10" rx="1" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1"/>
      <path d="M22 40H26" stroke="#7B3FF2" strokeWidth="0.75"/>
      <path d="M22 42H25" stroke="#7B3FF2" strokeWidth="0.75"/>
    </svg>
  )
}

/**
 * Hand-drawn video/play icon for YouTube learning
 */
export function VideoIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Video screen */}
      <rect x="6" y="10" width="36" height="24" rx="3" fill="white" stroke={INK} strokeWidth="2"/>
      {/* Screen inner */}
      <rect x="9" y="13" width="30" height="18" rx="2" fill={LIGHT_PURPLE}/>
      {/* Play button */}
      <path d="M21 17L31 22L21 27V17Z" fill={PURPLE} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Stand */}
      <path d="M20 34V38" stroke={INK} strokeWidth="2" strokeLinecap="round"/>
      <path d="M28 34V38" stroke={INK} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 38H32" stroke={INK} strokeWidth="2" strokeLinecap="round"/>
      {/* Video waves */}
      <path d="M38 6C40 8 42 8 44 6" stroke={PINK} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 10C41 11 43 11 44 10" stroke={PINK} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

/**
 * Hand-drawn pen/writer icon for writing assistant
 */
export function WriterIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Paper */}
      <rect x="8" y="6" width="28" height="36" rx="2" fill="white" stroke={INK} strokeWidth="2"/>
      {/* Text lines */}
      <path d="M14 14H28" stroke={INK} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 20H26" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <path d="M14 26H24" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      {/* Pen */}
      <path d="M38 12L44 6" stroke={PURPLE} strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 18L42 8" stroke={PURPLE} strokeWidth="3" strokeLinecap="round"/>
      <path d="M30 20L32 18" stroke={INK} strokeWidth="2" strokeLinecap="round"/>
      {/* Pen tip */}
      <circle cx="30" cy="20" r="2" fill={PINK}/>
      {/* Highlight on paper */}
      <rect x="14" y="12" width="8" height="4" fill="#FBBF24" opacity="0.3" rx="1"/>
      {/* Sparkle */}
      <circle cx="44" cy="4" r="1.5" fill={PINK}/>
    </svg>
  )
}

/**
 * Hand-drawn summary/clock icon for quick summaries
 */
export function SummaryIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Clock circle */}
      <circle cx="24" cy="24" r="18" fill={LIGHT_PURPLE} stroke={INK} strokeWidth="2"/>
      {/* Clock inner */}
      <circle cx="24" cy="24" r="14" fill="white" stroke={PURPLE} strokeWidth="1.5"/>
      {/* Clock hands */}
      <path d="M24 14V24L30 28" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Hour marks */}
      <circle cx="24" cy="12" r="1.5" fill={INK}/>
      <circle cx="36" cy="24" r="1.5" fill={INK}/>
      <circle cx="24" cy="36" r="1.5" fill={INK}/>
      <circle cx="12" cy="24" r="1.5" fill={INK}/>
      {/* Speed lines */}
      <path d="M40 10L44 6" stroke={PINK} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M42 14L46 12" stroke={PINK} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M44 18L48 17" stroke={PINK} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* 5 minute label */}
      <text x="20" y="30" fontFamily="sans-serif" fontSize="6" fill={PURPLE} fontWeight="bold">5m</text>
    </svg>
  )
}

/**
 * Hand-drawn library/bookshelf icon
 */
export function LibraryIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Bookshelf back */}
      <rect x="6" y="8" width="36" height="32" rx="2" fill={LIGHT_PURPLE} stroke={INK} strokeWidth="2"/>
      {/* Shelf divider */}
      <path d="M6 24H42" stroke={INK} strokeWidth="2"/>
      {/* Top shelf books */}
      <rect x="10" y="11" width="6" height="11" rx="1" fill={PURPLE} stroke={INK} strokeWidth="1.5"/>
      <rect x="17" y="13" width="5" height="9" rx="1" fill="#FBBF24" stroke={INK} strokeWidth="1.5"/>
      <rect x="23" y="11" width="6" height="11" rx="1" fill={PINK} stroke={INK} strokeWidth="1.5"/>
      <rect x="30" y="12" width="5" height="10" rx="1" fill="#22C55E" stroke={INK} strokeWidth="1.5"/>
      {/* Bottom shelf books */}
      <rect x="10" y="27" width="7" height="10" rx="1" fill="#3B82F6" stroke={INK} strokeWidth="1.5"/>
      <rect x="18" y="28" width="5" height="9" rx="1" fill={PURPLE} stroke={INK} strokeWidth="1.5"/>
      <rect x="24" y="26" width="6" height="11" rx="1" fill="#F59E0B" stroke={INK} strokeWidth="1.5"/>
      <rect x="31" y="28" width="5" height="9" rx="1" fill={PINK} stroke={INK} strokeWidth="1.5"/>
      {/* Sparkle */}
      <circle cx="42" cy="10" r="2" fill={PINK}/>
    </svg>
  )
}

/**
 * Hand-drawn study guide/book with bookmark icon
 */
export function StudyGuideIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Book cover */}
      <path d="M8 8H36C38 8 40 10 40 12V40C40 42 38 44 36 44H8V8Z" fill={LIGHT_PURPLE} stroke={INK} strokeWidth="2"/>
      {/* Book spine */}
      <path d="M8 8V44" stroke={INK} strokeWidth="3"/>
      {/* Pages */}
      <rect x="12" y="12" width="24" height="28" rx="1" fill="white" stroke={INK} strokeWidth="1.5"/>
      {/* Bookmark */}
      <path d="M28 8V20L32 16L36 20V8" fill={PINK} stroke={INK} strokeWidth="1.5"/>
      {/* Text lines */}
      <path d="M16 18H28" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 24H26" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <path d="M16 30H24" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      {/* Checkmark */}
      <circle cx="20" cy="36" r="4" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.5"/>
      <path d="M18 36L19.5 37.5L22.5 34.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/**
 * Hand-drawn chat/conversation icon
 */
export function ChatIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Main chat bubble */}
      <path d="M8 12C8 10 10 8 12 8H36C38 8 40 10 40 12V28C40 30 38 32 36 32H20L12 40V32H12C10 32 8 30 8 28V12Z" fill={LIGHT_PURPLE} stroke={INK} strokeWidth="2"/>
      {/* Chat dots */}
      <circle cx="18" cy="20" r="2.5" fill={PURPLE}/>
      <circle cx="24" cy="20" r="2.5" fill={PURPLE}/>
      <circle cx="30" cy="20" r="2.5" fill={PURPLE}/>
      {/* Small response bubble */}
      <path d="M32 36C32 34 34 32 36 32H42C44 32 46 34 46 36V40C46 42 44 44 42 44H38L36 46V44H36C34 44 32 42 32 40V36Z" fill={PINK} stroke={INK} strokeWidth="1.5"/>
      {/* Sparkle */}
      <circle cx="6" cy="6" r="2" fill="#FBBF24"/>
      <path d="M6 2V4M6 8V10M2 6H4M8 6H10" stroke="#FBBF24" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * Hand-drawn brain icon for learning/memory
 */
export function BrainIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Brain left hemisphere */}
      <path
        d="M24 8C16 8 10 14 10 22C10 26 12 30 14 32C12 34 10 36 10 40C10 42 12 44 16 44C18 44 20 42 22 40"
        stroke="#7B3FF2"
        strokeWidth="2"
        fill="#F0E6FF"
        strokeLinecap="round"
      />
      {/* Brain right hemisphere */}
      <path
        d="M24 8C32 8 38 14 38 22C38 26 36 30 34 32C36 34 38 36 38 40C38 42 36 44 32 44C30 44 28 42 26 40"
        stroke="#7B3FF2"
        strokeWidth="2"
        fill="#F0E6FF"
        strokeLinecap="round"
      />
      {/* Brain center line */}
      <path d="M24 8V44" stroke="#7B3FF2" strokeWidth="1.5" strokeDasharray="4 2"/>
      {/* Brain bumps left */}
      <circle cx="14" cy="16" r="4" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1.5"/>
      <circle cx="16" cy="26" r="3" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1.5"/>
      {/* Brain bumps right */}
      <circle cx="34" cy="16" r="4" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1.5"/>
      <circle cx="32" cy="26" r="3" fill="#F0E6FF" stroke="#7B3FF2" strokeWidth="1.5"/>
      {/* Neural sparkles */}
      <circle cx="20" cy="20" r="1.5" fill="#FBBF24"/>
      <circle cx="28" cy="22" r="1" fill="#FBBF24"/>
      <circle cx="24" cy="30" r="1.5" fill="#E91E8C"/>
    </svg>
  )
}

export default {
  FlashcardIcon,
  ExamIcon,
  StudyBuddyIcon,
  PodcastIcon,
  MindMapIcon,
  PlannerIcon,
  GraduationIcon,
  TargetIcon,
  DocumentIcon,
  VerifyIcon,
  TrophyIcon,
  UploadIcon,
  VideoIcon,
  WriterIcon,
  SummaryIcon,
  LibraryIcon,
  StudyGuideIcon,
  ChatIcon,
  BrainIcon,
}
