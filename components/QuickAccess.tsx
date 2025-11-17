"use client"

import { Star, Clock, Trash2, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAccessProps {
  selectedSection: string | null
  onSelectSection: (section: string | null) => void
  counts: {
    starred: number
    recent: number
    trash: number
  }
}

export default function QuickAccess({ selectedSection, onSelectSection, counts }: QuickAccessProps) {
  const sections = [
    { id: null, icon: Home, label: 'All Documents', color: 'text-gray-600 dark:text-gray-400' },
    { id: 'starred', icon: Star, label: 'Starred', color: 'text-yellow-500 dark:text-yellow-400', count: counts.starred },
    { id: 'recent', icon: Clock, label: 'Recent', color: 'text-blue-500 dark:text-blue-400', count: counts.recent },
    { id: 'trash', icon: Trash2, label: 'Trash', color: 'text-red-500 dark:text-red-400', count: counts.trash },
  ]

  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-800">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
        Quick Access
      </h4>
      <div className="space-y-1">
        {sections.map(({ id, icon: Icon, label, color, count }) => (
          <button
            key={id || 'all'}
            onClick={() => onSelectSection(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
              selectedSection === id
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            <Icon className={cn("w-4 h-4", selectedSection === id ? "text-blue-600 dark:text-blue-400" : color)} />
            <span className="flex-1 text-left">{label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                selectedSection === id
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
