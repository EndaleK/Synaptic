import { useEffect } from "react"
import type { AccessibilityConfig } from "./AccessibilitySettings"

/**
 * Hook to apply accessibility styles to the editor
 * Injects CSS custom properties that can be used by editor components
 */
export function useAccessibilityStyles(config: AccessibilityConfig) {
  useEffect(() => {
    const root = document.documentElement

    // Apply dyslexic font
    if (config.dyslexicFont) {
      root.style.setProperty('--editor-font-family', '"OpenDyslexic", "Comic Sans MS", sans-serif')
    } else {
      root.style.setProperty('--editor-font-family', 'inherit')
    }

    // Apply font size
    root.style.setProperty('--editor-font-size', `${config.fontSize}%`)

    // Apply line spacing
    root.style.setProperty('--editor-line-height', config.lineSpacing.toString())

    // Apply letter spacing
    root.style.setProperty('--editor-letter-spacing', `${config.letterSpacing}px`)

    // Apply high contrast mode
    if (config.highContrast) {
      root.classList.add('high-contrast-mode')
    } else {
      root.classList.remove('high-contrast-mode')
    }

    // Apply focus mode
    if (config.focusMode) {
      root.classList.add('focus-mode')
    } else {
      root.classList.remove('focus-mode')
    }

    // Apply reading guide
    if (config.readingGuide) {
      root.classList.add('reading-guide')
    } else {
      root.classList.remove('reading-guide')
    }

    // Cleanup
    return () => {
      root.style.removeProperty('--editor-font-family')
      root.style.removeProperty('--editor-font-size')
      root.style.removeProperty('--editor-line-height')
      root.style.removeProperty('--editor-letter-spacing')
      root.classList.remove('high-contrast-mode', 'focus-mode', 'reading-guide')
    }
  }, [config])
}
