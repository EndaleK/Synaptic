"use client"

import { cn } from "@/lib/utils"
import { Flame } from "lucide-react"

interface WeeklyCalendarProps {
  activeDays?: number[]
  streak?: number
  className?: string
}

/**
 * WeeklyHeatMap - GitHub-style heat map showing study activity
 * Displays current week with intensity-based coloring and streak
 */
export function WeeklyCalendar({
  activeDays = [],
  streak = 0,
  className
}: WeeklyCalendarProps) {
  const today = new Date()
  const currentDayOfWeek = today.getDay() // 0 = Sunday

  // Get the start of the week (Sunday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDayOfWeek)

  // Generate week days
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dates: { day: string; date: number; isActive: boolean; isToday: boolean; intensity: number }[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const isActive = activeDays.includes(i)
    dates.push({
      day: weekDays[i],
      date: date.getDate(),
      isActive,
      isToday: i === currentDayOfWeek,
      // Simulate intensity levels (0-4) based on activity
      intensity: isActive ? Math.min(4, Math.floor(Math.random() * 3) + 2) : 0
    })
  }

  // Heat map color classes based on intensity (GitHub-style green to purple gradient)
  const getHeatColor = (intensity: number, isToday: boolean) => {
    if (intensity === 0) {
      return isToday
        ? "bg-gray-200 dark:bg-gray-700 ring-2 ring-[#7B3FF2]"
        : "bg-gray-100 dark:bg-gray-800"
    }
    const colors = [
      "", // 0 - handled above
      "bg-[#E9D5FF] dark:bg-[#7B3FF2]/20", // 1 - lightest purple
      "bg-[#D8B4FE] dark:bg-[#7B3FF2]/40", // 2 - light purple
      "bg-[#A855F7] dark:bg-[#7B3FF2]/70", // 3 - medium purple
      "bg-[#7B3FF2] dark:bg-[#7B3FF2]",    // 4 - full purple
    ]
    return colors[intensity] + (isToday ? " ring-2 ring-orange-400" : "")
  }

  return (
    <div className={cn("p-5 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700", className)}>
      {/* Header with streak */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">This Week</h3>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{streak}</span>
            <span className="text-xs text-orange-600 dark:text-orange-400">day streak</span>
          </div>
        )}
      </div>

      {/* Heat map grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {dates.map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
              {item.day}
            </span>
            <div
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all",
                getHeatColor(item.intensity, item.isToday),
                item.intensity >= 3 ? "text-white" : "text-gray-600 dark:text-gray-300"
              )}
              title={item.isActive ? "Active" : "No activity"}
            >
              {item.date}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[10px] text-gray-400 mr-1">Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
        <div className="w-3 h-3 rounded-sm bg-[#E9D5FF] dark:bg-[#7B3FF2]/20" />
        <div className="w-3 h-3 rounded-sm bg-[#D8B4FE] dark:bg-[#7B3FF2]/40" />
        <div className="w-3 h-3 rounded-sm bg-[#A855F7] dark:bg-[#7B3FF2]/70" />
        <div className="w-3 h-3 rounded-sm bg-[#7B3FF2]" />
        <span className="text-[10px] text-gray-400 ml-1">More</span>
      </div>
    </div>
  )
}

export default WeeklyCalendar
