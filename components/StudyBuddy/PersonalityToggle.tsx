"use client"

import { GraduationCap, Users } from "lucide-react"
import { PersonalityMode } from "@/lib/study-buddy/personalities"

interface PersonalityToggleProps {
  mode: PersonalityMode
  onChange: (mode: PersonalityMode) => void
}

export default function PersonalityToggle({ mode, onChange }: PersonalityToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {/* Tutor Mode Button */}
      <button
        onClick={() => onChange('tutor')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
          ${mode === 'tutor'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
          }
        `}
        title="Professional teacher mode - structured, academic explanations"
      >
        <GraduationCap className="w-4 h-4" />
        <span className="font-medium">Tutor</span>
      </button>

      {/* Buddy Mode Button */}
      <button
        onClick={() => onChange('buddy')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
          ${mode === 'buddy'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
          }
        `}
        title="Friendly peer mode - casual, relatable discussions"
      >
        <Users className="w-4 h-4" />
        <span className="font-medium">Buddy</span>
      </button>
    </div>
  )
}
