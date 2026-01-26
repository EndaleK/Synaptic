// Synaptic Brand Colors - Light Theme (matching app dashboard)
export const COLORS = {
  // Backgrounds - Light theme
  background: "#F8F9FC", // Light gray-blue (main app background)
  backgroundWhite: "#FFFFFF",
  backgroundCard: "#FFFFFF",
  backgroundDark: "#0f172a", // For dark sections if needed

  // Primary Brand Colors
  purple: "#7B3FF2", // Primary purple
  purpleLight: "#9B5FF8",
  purpleDark: "#5B2FD2",

  // Secondary Brand Colors
  pink: "#E91E8C", // Accent pink
  pinkLight: "#FF4DA6",
  orange: "#FF6B35", // Orange accent
  orangeLight: "#FF8A5C",
  coral: "#FF7A7A", // Coral/red for alerts

  // Blue shades (from dashboard)
  blue: "#2D3E9F", // Deep blue
  blueLight: "#4B5FC1",
  blueBright: "#3B82F6", // Bright blue
  cyan: "#06B6D4",

  // Greens
  green: "#10B981",
  greenLight: "#34D399",

  // Yellow/Gold
  yellow: "#F59E0B",
  yellowLight: "#FBBF24",

  // Text colors (for light background)
  textPrimary: "#1E293B", // Dark slate for headings
  textSecondary: "#64748B", // Medium gray for body
  textMuted: "#94A3B8", // Light gray for subtle text
  white: "#FFFFFF",

  // Card colors (matching dashboard cards)
  cardPurple: "#7B3FF2",
  cardPink: "#E91E8C",
  cardOrange: "#FF6B35",
  cardBlue: "#3B82F6",
  cardGreen: "#10B981",
  cardCyan: "#06B6D4",
  cardYellow: "#F59E0B",
  cardRed: "#EF4444",

  // Gradient accent colors (from Synaptic branding)
  gradientPurpleStart: "#7B3FF2",
  gradientPurpleEnd: "#E91E8C",
} as const;

// Gradient definitions matching Synaptic brand
export const GRADIENTS = {
  primary: `linear-gradient(135deg, ${COLORS.purple} 0%, ${COLORS.pink} 100%)`,
  purpleCard: `linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)`,
  pinkCard: `linear-gradient(135deg, #EC4899 0%, #F472B6 100%)`,
  blueCard: `linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)`,
  orangeCard: `linear-gradient(135deg, #F97316 0%, #FB923C 100%)`,
  lightBackground: `linear-gradient(180deg, #F8F9FC 0%, #EEF2FF 100%)`,
  subtleGlow: `radial-gradient(ellipse at center, rgba(123, 63, 242, 0.08) 0%, transparent 70%)`,
} as const;
