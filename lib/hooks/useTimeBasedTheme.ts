import { useState, useEffect } from 'react'

/**
 * Hook that returns a warmth level (0-20) based on the current time of day
 * to reduce blue light exposure in the evening and promote better sleep hygiene.
 *
 * Time-based warmth levels:
 * - Morning (6am-12pm): 0% - Cool/neutral tones for alertness
 * - Afternoon (12pm-6pm): 0% - Standard tones for peak productivity
 * - Evening (6pm-10pm): 10% - Warm tones to reduce blue light
 * - Night (10pm-6am): 20% - Maximum warmth for sleep preparation
 *
 * @returns {number} warmthLevel - Percentage (0-20) to apply as sepia filter
 */
export function useTimeBasedTheme(): number {
  const [warmthLevel, setWarmthLevel] = useState(0)

  useEffect(() => {
    const updateWarmth = () => {
      const hour = new Date().getHours()

      if (hour >= 6 && hour < 12) {
        // Morning: Cool/neutral (6am-12pm)
        setWarmthLevel(0)
      } else if (hour >= 12 && hour < 18) {
        // Afternoon: Standard (12pm-6pm)
        setWarmthLevel(0)
      } else if (hour >= 18 && hour < 22) {
        // Evening: Warm (6pm-10pm)
        setWarmthLevel(10)
      } else {
        // Night: Very warm (10pm-6am)
        setWarmthLevel(20)
      }
    }

    // Set initial warmth
    updateWarmth()

    // Update warmth every minute to handle time changes
    const interval = setInterval(updateWarmth, 60000)

    return () => clearInterval(interval)
  }, [])

  return warmthLevel
}
