/**
 * Synaptic Custom Color System
 *
 * Inspired by neural networks and cognitive energy:
 * - Deep sapphire: Depth of knowledge and trust
 * - Electric cyan: Synaptic connections and clarity
 * - Warm amber: Energy and engagement
 * - Soft teal: Calm focus
 */

export const synapticColors = {
  // Primary brand colors
  brand: {
    // Deep sapphire - primary brand color
    sapphire: {
      50: '#E8EFF9',
      100: '#C5D9F2',
      200: '#9FC2EB',
      300: '#79ABE4',
      400: '#5C99DF',
      500: '#3F87DA', // Main brand color
      600: '#2A5FA8',
      700: '#1A4176',
      800: '#0F2A4D',
      900: '#051325',
    },

    // Electric cyan - accent and highlights
    cyan: {
      50: '#E0F9FF',
      100: '#B8F0FF',
      200: '#8AE7FF',
      300: '#5CDEFF',
      400: '#2DD5FF',
      500: '#00CCFF', // Signature electric cyan
      600: '#00A3CC',
      700: '#007A99',
      800: '#005166',
      900: '#002833',
    },

    // Warm amber - energy and engagement
    amber: {
      50: '#FFF5E8',
      100: '#FFE5C5',
      200: '#FFD59F',
      300: '#FFC579',
      400: '#FFB55C',
      500: '#FFA53F', // Warm engagement
      600: '#E68A2E',
      700: '#CC6F1F',
      800: '#B35412',
      900: '#7A3808',
    },

    // Soft teal - calm focus
    teal: {
      50: '#E6F9F7',
      100: '#B8F0EA',
      200: '#8AE7DD',
      300: '#5CDED0',
      400: '#2ED5C3',
      500: '#00CCB6', // Focus state
      600: '#00A392',
      700: '#007A6E',
      800: '#00514A',
      900: '#002826',
    },
  },

  // Functional colors
  semantic: {
    success: '#00D98B',    // Vibrant green for achievements
    warning: '#FFB020',    // Clear warning state
    error: '#FF4757',      // Error states
    info: '#4A90E2',       // Information
  },

  // Neutral palette
  neutral: {
    // Light mode
    light: {
      50: '#FAFBFC',      // Lightest background
      100: '#F4F6F8',     // Card backgrounds
      200: '#E8ECF0',     // Borders
      300: '#D1D8E0',     // Dividers
      400: '#9BA5B4',     // Disabled text
      500: '#6B7A90',     // Secondary text
      600: '#4A5568',     // Body text
      700: '#2D3748',     // Headings
      800: '#1A202C',     // Primary text
      900: '#0D1117',     // Darkest
    },

    // Dark mode
    dark: {
      50: '#F7FAFC',      // Lightest (for text on dark)
      100: '#EDF2F7',     // High contrast text
      200: '#CBD5E0',     // Medium text
      300: '#A0AEC0',     // Muted text
      400: '#718096',     // Very muted
      500: '#4A5568',     // Borders
      600: '#2D3748',     // Card backgrounds
      700: '#1A202C',     // Elevated surfaces
      800: '#121826',     // Main background
      900: '#0A0E1A',     // Deepest background
    },
  },

  // Learning mode colors (updated with custom palette)
  modes: {
    flashcards: '#3F87DA',    // Sapphire
    chat: '#00CCFF',          // Electric cyan
    podcast: '#00CCB6',       // Teal
    mindmap: '#00D98B',       // Success green
    writer: '#FF4757',        // Error red (repurposed for creativity)
    video: '#FFA53F',         // Warm amber
    exam: '#4A90E2',          // Info blue
    quickSummary: '#FFB020',  // Warning amber
  },

  // Signature gradients
  gradients: {
    // Primary brand gradient - Neural pathway
    primary: 'linear-gradient(135deg, #2A5FA8 0%, #00CCFF 50%, #00CCB6 100%)',

    // Energy gradient - Engagement and excitement
    energy: 'linear-gradient(135deg, #FFA53F 0%, #FFB020 50%, #00D98B 100%)',

    // Focus gradient - Deep learning state
    focus: 'linear-gradient(135deg, #1A4176 0%, #3F87DA 50%, #00CCFF 100%)',

    // Achievement gradient - Success celebration
    achievement: 'linear-gradient(135deg, #00D98B 0%, #00CCB6 50%, #00CCFF 100%)',

    // Card hover gradient - Subtle depth
    cardHover: 'linear-gradient(135deg, rgba(63, 135, 218, 0.05) 0%, rgba(0, 204, 255, 0.05) 100%)',
  },
} as const

// Helper function to get color based on mode
export function getModeColor(mode: string): string {
  const modeKey = mode as keyof typeof synapticColors.modes
  return synapticColors.modes[modeKey] || synapticColors.brand.sapphire[500]
}

// Helper function to get background tint for modes
export function getModeTint(mode: string, opacity: number = 0.08): string {
  const color = getModeColor(mode)
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Export CSS variables for global use
export function getCSSVariables(darkMode: boolean) {
  const neutral = darkMode ? synapticColors.neutral.dark : synapticColors.neutral.light

  return {
    '--color-primary': synapticColors.brand.sapphire[500],
    '--color-primary-hover': synapticColors.brand.sapphire[600],
    '--color-accent': synapticColors.brand.cyan[500],
    '--color-accent-hover': synapticColors.brand.cyan[600],
    '--color-success': synapticColors.semantic.success,
    '--color-warning': synapticColors.semantic.warning,
    '--color-error': synapticColors.semantic.error,
    '--color-info': synapticColors.semantic.info,

    '--color-bg-base': neutral[50],
    '--color-bg-elevated': neutral[100],
    '--color-bg-card': darkMode ? neutral[700] : '#FFFFFF',
    '--color-border': neutral[200],
    '--color-divider': neutral[300],

    '--color-text-primary': neutral[800],
    '--color-text-secondary': neutral[600],
    '--color-text-muted': neutral[500],
    '--color-text-disabled': neutral[400],

    '--gradient-primary': synapticColors.gradients.primary,
    '--gradient-energy': synapticColors.gradients.energy,
    '--gradient-focus': synapticColors.gradients.focus,
    '--gradient-achievement': synapticColors.gradients.achievement,
  }
}
