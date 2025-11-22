"use client"

import { X } from "lucide-react"
import { explainLikePresets, type ExplainLevel } from "@/lib/study-buddy/personalities"

interface ExplainLikePresetsProps {
  currentLevel: ExplainLevel | null
  onSelect: (level: ExplainLevel | null) => void
  onClose?: () => void
}

export default function ExplainLikePresets({
  currentLevel,
  onSelect,
  onClose
}: ExplainLikePresetsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Explain Like...
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="space-y-2">
        {explainLikePresets.map((preset) => (
          <button
            key={preset.level}
            onClick={() => onSelect(currentLevel === preset.level ? null : preset.level)}
            className={`
              w-full flex items-start gap-3 p-3 rounded-lg border transition-all
              ${currentLevel === preset.level
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {/* Icon */}
            <div className="text-2xl flex-shrink-0 mt-0.5">
              {preset.icon}
            </div>

            {/* Content */}
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {preset.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {preset.description}
              </div>
            </div>

            {/* Selected indicator */}
            {currentLevel === preset.level && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
            )}
          </button>
        ))}

        {/* Clear selection */}
        {currentLevel && (
          <button
            onClick={() => onSelect(null)}
            className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  )
}
