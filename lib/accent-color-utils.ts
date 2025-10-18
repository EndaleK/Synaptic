/**
 * Shared accent color utilities for consistent theming across the app
 */

export type AccentColor =
  | 'default'
  | 'purple'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'pink'
  | 'slate'
  | 'gray'
  | 'neutral'
  | 'stone'
  | 'teal'
  | 'coral'
  | 'lavender'
  | 'mint'
  | 'rose'
  | 'electric'

interface ColorValues {
  primary: string
  secondary: string
}

export const colorMap: Record<AccentColor, ColorValues> = {
  default: { primary: '168 85 247', secondary: '236 72 153' },  // purple-500, pink-500
  purple: { primary: '168 85 247', secondary: '236 72 153' },   // purple-500, pink-500
  blue: { primary: '59 130 246', secondary: '14 165 233' },     // blue-500, sky-500
  green: { primary: '34 197 94', secondary: '16 185 129' },     // green-500, emerald-500
  yellow: { primary: '234 179 8', secondary: '251 146 60' },    // yellow-500, orange-400
  red: { primary: '239 68 68', secondary: '251 113 133' },      // red-500, rose-400
  pink: { primary: '236 72 153', secondary: '249 168 212' },    // pink-500, pink-300
  slate: { primary: '100 116 139', secondary: '148 163 184' },  // slate-500, slate-400
  gray: { primary: '107 114 128', secondary: '156 163 175' },   // gray-500, gray-400
  neutral: { primary: '115 115 115', secondary: '163 163 163' }, // neutral-500, neutral-400
  stone: { primary: '120 113 108', secondary: '168 162 158' },  // stone-500, stone-400
  teal: { primary: '20 184 166', secondary: '13 148 136' },     // teal-500, teal-600
  coral: { primary: '251 146 60', secondary: '249 115 22' },    // orange-400, orange-500
  lavender: { primary: '167 139 250', secondary: '139 92 246' }, // violet-400, violet-500
  mint: { primary: '52 211 153', secondary: '16 185 129' },     // emerald-400, emerald-500
  rose: { primary: '251 113 133', secondary: '244 63 94' },     // rose-400, rose-500
  electric: { primary: '59 130 246', secondary: '168 85 247' }, // blue-500, purple-500
}

/**
 * Apply accent color to the document root
 * Updates CSS custom properties for theming
 */
export function applyAccentColor(color: AccentColor): void {
  const colors = colorMap[color]

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.style.setProperty('--accent-primary', colors.primary)
    root.style.setProperty('--accent-secondary', colors.secondary)
  }
}

/**
 * Get the saved accent color from localStorage
 */
export function getSavedAccentColor(): AccentColor | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('accentColor') as AccentColor
    return saved && saved in colorMap ? saved : null
  }
  return null
}

/**
 * Save accent color to localStorage
 */
export function saveAccentColor(color: AccentColor): void {
  if (typeof window !== 'undefined') {
    if (color === 'default') {
      localStorage.removeItem('accentColor')
    } else {
      localStorage.setItem('accentColor', color)
    }
  }
}

/**
 * Initialize accent color from localStorage or use default
 */
export function initializeAccentColor(): void {
  const savedColor = getSavedAccentColor()
  const colorToApply = savedColor || 'default'
  applyAccentColor(colorToApply)
}
