import { type MaturityLevel } from '@/lib/supabase/types'

interface FlashcardMaturityBadgeProps {
  maturityLevel: MaturityLevel
  repetitions: number
  minReviewsForMastery?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function FlashcardMaturityBadge({
  maturityLevel,
  repetitions,
  minReviewsForMastery = 3,
  size = 'md',
  showLabel = true
}: FlashcardMaturityBadgeProps) {
  const badges = {
    new: {
      emoji: '🌱',
      label: 'New',
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600'
    },
    learning: {
      emoji: '📚',
      label: 'Learning',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-300 dark:border-blue-600'
    },
    young: {
      emoji: '⚡',
      label: 'Young',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-300 dark:border-purple-600'
    },
    mature: {
      emoji: '🏆',
      label: 'Mature',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      borderColor: 'border-green-300 dark:border-green-600'
    }
  }

  const badge = badges[maturityLevel]

  const sizes = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      emoji: 'text-sm'
    },
    md: {
      container: 'px-2.5 py-1 text-sm gap-1.5',
      emoji: 'text-base'
    },
    lg: {
      container: 'px-3 py-1.5 text-base gap-2',
      emoji: 'text-lg'
    }
  }

  const sizeClasses = sizes[size]

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center ${sizeClasses.container} ${badge.color} ${badge.borderColor} border rounded-full font-medium transition-all`}
        title={`${badge.label} card - ${repetitions}/${minReviewsForMastery} reviews`}
      >
        <span className={sizeClasses.emoji}>{badge.emoji}</span>
        {showLabel && <span>{badge.label}</span>}
      </div>

      {/* Progress indicator for learning cards */}
      {maturityLevel === 'learning' && repetitions < minReviewsForMastery && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: minReviewsForMastery }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < repetitions
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              title={`Review ${i + 1}/${minReviewsForMastery}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
