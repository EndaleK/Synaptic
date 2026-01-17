"use client"

import { cn } from "@/lib/utils"

interface WeeklyCalendarProps {
  activeDays?: number[]
  className?: string
}

/**
 * WeeklyCalendar - Horizontal week view showing active study days
 * Displays current week with highlighted active days
 */
export function WeeklyCalendar({
  activeDays = [],
  className
}: WeeklyCalendarProps) {
  const today = new Date()
  const currentDayOfWeek = today.getDay() // 0 = Sunday

  // Get the start of the week (Sunday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDayOfWeek)

  // Generate week days
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const dates: { day: string; date: number; isActive: boolean; isToday: boolean }[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    dates.push({
      day: weekDays[i],
      date: date.getDate(),
      isActive: activeDays.includes(i),
      isToday: i === currentDayOfWeek
    })
  }

  return (
    <div className={cn("p-6 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700", className)}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">This Week</h3>

      <div className="grid grid-cols-7 gap-2">
        {/* Day labels */}
        {dates.map((item, index) => (
          <div key={`label-${index}`} className="text-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {item.day}
            </span>
          </div>
        ))}

        {/* Date circles */}
        {dates.map((item, index) => (
          <div key={`date-${index}`} className="flex justify-center">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all",
                item.isToday && item.isActive
                  ? "bg-[#7B3FF2] text-white shadow-lg shadow-[#7B3FF2]/30"
                  : item.isActive
                  ? "bg-[#7B3FF2]/70 text-white"
                  : item.isToday
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white ring-2 ring-[#7B3FF2]"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              {item.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeeklyCalendar
