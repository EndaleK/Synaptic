"use client"

import { useState, useEffect } from 'react'
import { Sun, Moon, Sunset, CloudSun } from 'lucide-react'

interface TimeBasedThemeDebuggerProps {
  warmthLevel: number
}

/**
 * Debug component to visualize time-based theme warmth
 * Shows current time, warmth level, and allows manual testing
 * Remove this in production or hide behind a feature flag
 */
export default function TimeBasedThemeDebugger({ warmthLevel }: TimeBasedThemeDebuggerProps) {
  const [currentTime, setCurrentTime] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const getTimeIcon = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return <Sun className="w-4 h-4 text-yellow-500" />
    if (hour >= 12 && hour < 18) return <CloudSun className="w-4 h-4 text-orange-500" />
    if (hour >= 18 && hour < 22) return <Sunset className="w-4 h-4 text-orange-600" />
    return <Moon className="w-4 h-4 text-indigo-500" />
  }

  const getTimePeriod = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'Morning'
    if (hour >= 12 && hour < 18) return 'Afternoon'
    if (hour >= 18 && hour < 22) return 'Evening'
    return 'Night'
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform z-50"
        title="Show time-based theme debugger"
      >
        {getTimeIcon()}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Time Theme
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Time:</span>
          <div className="flex items-center gap-1 font-mono">
            {getTimeIcon()}
            <span className="text-gray-900 dark:text-white">{currentTime}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Period:</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {getTimePeriod()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Warmth:</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {warmthLevel}%
          </span>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-orange-600 transition-all duration-1000"
              style={{ width: `${(warmthLevel / 20) * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-2 text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
          Reduces blue light in evening for better sleep hygiene
        </div>
      </div>
    </div>
  )
}
