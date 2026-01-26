import { continueRender, delayRender } from "remotion";

// Font family definitions
export const FONTS = {
  heading: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
} as const;

// Font weights
export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

// Font sizes (in pixels)
export const FONT_SIZES = {
  xs: 14,
  sm: 16,
  base: 18,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 36,
  "4xl": 48,
  "5xl": 60,
  "6xl": 72,
  "7xl": 96,
  "8xl": 128,
} as const;

// Load Google Fonts via CSS injection (more reliable than FontFace API)
export const loadFonts = async (): Promise<void> => {
  const handle = delayRender("Loading fonts");

  try {
    // Check if fonts are already loaded
    if (document.getElementById("remotion-google-fonts")) {
      continueRender(handle);
      return;
    }

    // Create link element to load Google Fonts via CSS
    const link = document.createElement("link");
    link.id = "remotion-google-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap";

    // Wait for fonts to load
    await new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Failed to load Google Fonts"));

      document.head.appendChild(link);

      // Timeout fallback - continue after 3 seconds regardless
      setTimeout(resolve, 3000);
    });

    // Give fonts a moment to apply
    await new Promise((r) => setTimeout(r, 100));

    continueRender(handle);
  } catch (error) {
    console.warn("Font loading warning:", error);
    // Continue anyway with system fonts as fallback
    continueRender(handle);
  }
};
