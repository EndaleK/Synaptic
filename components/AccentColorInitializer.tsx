"use client"

import { useEffect } from "react"
import { initializeAccentColor } from "@/lib/accent-color-utils"

/**
 * Component that initializes accent colors from localStorage on app mount
 * This ensures user's selected accent color persists across sessions
 */
export default function AccentColorInitializer() {
  useEffect(() => {
    initializeAccentColor()
  }, [])

  return null
}
