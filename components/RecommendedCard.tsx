"use client"

import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ComponentType, ReactNode } from "react"

interface IconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface RecommendedCardProps {
  icon: ComponentType<IconProps> | ReactNode
  title: string
  description: string
  actionLabel: string
  gradient: 'purple' | 'pink' | 'blue'
  onClick: () => void
  className?: string
}

const gradientStyles = {
  purple: "bg-gradient-to-br from-[#7B3FF2] via-[#A855F7] to-[#C084FC]",
  pink: "bg-gradient-to-br from-[#EC4899] via-[#F472B6] to-[#FBCFE8]",
  blue: "bg-gradient-to-br from-[#3B82F6] via-[#60A5FA] to-[#93C5FD]"
}

/**
 * RecommendedCard - Large gradient cards for contextual recommendations
 * Used in "Recommended for you right now" section
 */
export function RecommendedCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  gradient,
  onClick,
  className
}: RecommendedCardProps) {
  // Check if icon is a component or a ReactNode (like a string/emoji)
  const isComponent = typeof Icon === 'function'

  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 min-h-[180px] flex flex-col justify-between overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] shadow-lg hover:shadow-xl",
        gradientStyles[gradient],
        className
      )}
      onClick={onClick}
    >
      {/* Decorative circle in top right */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
        {isComponent ? <Icon size="lg" /> : Icon}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/80 text-sm mb-4 leading-relaxed">{description}</p>

        {/* Action Button */}
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors group-hover:gap-3"
        >
          {actionLabel}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}

export default RecommendedCard
