"use client"

import { cn } from "@/lib/utils"
import { ComponentType } from "react"

interface IconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface StudyModeCardProps {
  icon: ComponentType<IconProps>
  title: string
  description: string
  badge?: number
  isActive?: boolean
  onClick: () => void
  className?: string
}

/**
 * StudyModeCard - Compact cards for the "Choose your study mode" grid
 * Shows hand-drawn icon, title, description, and optional badge for counts
 */
export function StudyModeCard({
  icon: Icon,
  title,
  description,
  badge,
  isActive = false,
  onClick,
  className
}: StudyModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all min-w-[140px] hover:scale-[1.02]",
        isActive
          ? "border-[#7B3FF2] bg-[#7B3FF2]/5 shadow-lg shadow-[#7B3FF2]/10"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-[#7B3FF2]/50 hover:shadow-md",
        className
      )}
    >
      {/* Badge for counts (e.g., "20" for due cards) */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#7B3FF2] text-white text-xs font-bold flex items-center justify-center shadow-md">
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Hand-drawn Icon */}
      <div className="mb-3">
        <Icon size="lg" />
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-sm mb-1",
        isActive ? "text-[#7B3FF2]" : "text-gray-900 dark:text-white"
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
        {description}
      </p>
    </button>
  )
}

export default StudyModeCard
