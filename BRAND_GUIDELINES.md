# Synaptic Brand Guidelines 2024

## Logo Variants Overview

Synaptic features three distinct logo designs, each representing different aspects of AI-powered personalized learning:

### 1. **Synapse Wave** (Primary/Default)
**Theme:** *Flow of Knowledge*
- Represents the dynamic flow of neural connections and learning pathways
- Flowing S-curve with animated particles showing brain activity
- Best for: Digital interfaces, app headers, marketing materials

**Files:**
- `logo-synapse-wave.svg` (200×200, detailed version)
- `icon-synapse-wave.svg` (512×512, app icon)

### 2. **Neural Bloom**
**Theme:** *Knowledge Expansion*
- Radial design representing growth and the expansion of understanding
- 8-spoke structure with pulsing central core
- Best for: Educational materials, certificates, achievement badges

**Files:**
- `logo-neural-bloom.svg` (200×200, detailed version)
- `icon-neural-bloom.svg` (512×512, app icon)

### 3. **Knowledge Constellation**
**Theme:** *Connected Learning*
- Minimalist constellation pattern showing interconnected concepts
- Abstract neural network with star nodes and orbital rings
- Best for: Professional presentations, academic contexts, documentation

**Files:**
- `logo-constellation.svg` (200×200, detailed version)
- `icon-constellation.svg` (512×512, app icon)

---

## Color Palette

### Primary Colors

#### Deep Purple (Primary Brand Color)
- **Hex:** `#9333EA`
- **RGB:** `147, 51, 234`
- **Usage:** Primary brand identity, main UI elements, CTAs

#### Violet
- **Hex:** `#6B46C1`
- **RGB:** `107, 70, 193`
- **Usage:** Gradients, secondary elements, hover states

### Accent Colors

#### Cyan
- **Hex:** `#06B6D4`
- **RGB:** `6, 182, 212`
- **Usage:** Highlights, active states, success indicators

#### Teal
- **Hex:** `#14B8A6`
- **RGB:** `20, 184, 166`
- **Usage:** Accents, connections, interactive elements

### Supporting Colors

#### White
- **Hex:** `#FFFFFF`
- **RGB:** `255, 255, 255`
- **Usage:** Core elements, highlights, light backgrounds

#### Muted Gray (for text/backgrounds)
- **Hex:** `#F1F5F9`
- **RGB:** `241, 245, 249`
- **Usage:** Subtle backgrounds, cards, containers

---

## Logo Usage Guidelines

### Recommended Sizes

#### Web/Digital
- **Header/Navigation:** 40-60px height
- **Hero Section:** 80-120px height
- **Footer:** 32-48px height
- **Favicon:** 32×32px (use icon variants)
- **App Icons:** 512×512px minimum (use icon variants)

#### Print
- **Business Cards:** Minimum 0.5 inches (1.27cm) height
- **Letterhead:** 0.75-1 inch (1.9-2.5cm) height
- **Posters/Banners:** Scale proportionally, no maximum

### Clear Space
Maintain clear space around the logo equal to the height of the central core element (approximately 20% of total logo height). No text, graphics, or other elements should intrude into this space.

### Background Usage

#### Preferred Backgrounds
- **Light backgrounds:** Use default colored versions
- **Dark backgrounds:** Logos work well with built-in gradients
- **Colored backgrounds:** Ensure sufficient contrast (minimum 4.5:1 ratio)

#### Backgrounds to Avoid
- Busy patterns or textures
- Low contrast color combinations
- Gradients that clash with logo gradients
- Images without proper overlay/treatment

---

## Component Integration

### React/Next.js Usage

```tsx
import Logo, { AnimatedLogo, LogoWithText } from '@/components/Logo'

// Basic logo
<Logo variant="synapse-wave" size={40} />

// With animation
<AnimatedLogo variant="neural-bloom" size={60} />

// With text and tagline
<LogoWithText variant="constellation" size={50} showTagline />
```

### Available Variants
```typescript
'synapse-wave'         // Default - Flowing S-wave design
'neural-bloom'         // Radial starburst design
'constellation'        // Minimalist connected points

'synapse-wave-icon'    // 512×512 app icon version
'neural-bloom-icon'    // 512×512 app icon version
'constellation-icon'   // 512×512 app icon version

// Legacy (deprecated but supported)
'neural'               // Old neural network design
'minimal'              // Old minimal S-shape
'icon'                 // Old app icon
```

---

## Export Formats

### Source Files
- **SVG (Scalable Vector Graphics):** All logos are natively SVG
- **Advantages:** Infinite scalability, small file size, web-optimized

### Recommended Exports

#### For Web
- **SVG:** Use directly in web projects (preferred)
- **PNG (transparent):** Fallback for older browsers
  - @1x: 200×200px
  - @2x: 400×400px
  - @3x: 600×600px

#### For App Icons
- **PNG (transparent):** Required for iOS/Android
  - 1024×1024px (iOS App Store)
  - 512×512px (Android Play Store)
  - 192×192px (PWA)
  - 180×180px (iOS)
  - 32×32px, 16×16px (Favicon)

#### For Print
- **PDF:** Vector-based, CMYK color mode
- **EPS:** For professional printing
- **High-res PNG:** 300 DPI minimum for quality printing

---

## Do's and Don'ts

### ✅ DO

- Use the logo at legible sizes (minimum 32px for web)
- Maintain aspect ratio when scaling
- Use provided color variants for different contexts
- Ensure sufficient contrast with background
- Use SVG format whenever possible for sharpness
- Apply the animated version for landing pages/hero sections
- Use appropriate variant for context (professional vs. casual)

### ❌ DON'T

- Don't stretch, skew, or distort the logo
- Don't change the colors (use provided variants only)
- Don't add drop shadows, outlines, or effects
- Don't place logo on busy backgrounds without proper treatment
- Don't use low-resolution raster versions when scaling up
- Don't crowd the logo with other elements
- Don't rotate the logo
- Don't separate logo elements
- Don't use logos smaller than 32px height

---

## Accessibility Considerations

### Color Contrast
- All logos meet WCAG AA standards for color contrast (4.5:1 minimum)
- White core elements ensure visibility on purple backgrounds
- Gradients are carefully balanced for accessibility

### Alternative Text
Always provide descriptive alt text when using logos in HTML:

```html
<img src="/logo-synapse-wave.svg" alt="Synaptic - AI-Powered Learning Platform" />
```

### Screen Readers
For decorative uses, use `aria-hidden="true"` to prevent redundant announcements:

```html
<img src="/logo-synapse-wave.svg" alt="" aria-hidden="true" />
```

---

## Special Applications

### Favicon
Use icon variants (`icon-*.svg`) optimized for small sizes:
- Clear, bold elements
- High contrast
- Recognizable at 16×16px

### Social Media
Recommended sizes:
- **Profile Picture:** 512×512px (use icon variants)
- **Cover/Header:** Use detailed logos with text
- **Open Graph/Twitter Cards:** 1200×630px (logo + background)

### App Splash Screens
- Use animated version with pulsing core
- Center on gradient background matching logo colors
- Minimum display time: 1.5 seconds for animation

### Loading Indicators
- Synapse Wave: Flowing particles animation
- Neural Bloom: Pulsing core animation
- Constellation: Orbiting ring animation

---

## Brand Voice

When pairing the logo with text, maintain brand voice:

- **Tone:** Friendly, intelligent, empowering
- **Personality:** Modern, innovative, approachable
- **Values:** Personalized learning, growth mindset, AI-powered insights

### Tagline Options
- "AI-Powered Learning" (current)
- "Learn Smarter, Not Harder"
- "Personalized Learning, Amplified"
- "Your Adaptive Learning Companion"

---

## Version History

### 2024 Redesign
- Created three distinct logo variants (Synapse Wave, Neural Bloom, Constellation)
- Developed 512×512 app icon versions optimized for small sizes
- Updated color palette to modern purple-cyan gradient system
- Enhanced animations with pulsing and flowing effects

### Legacy Designs (Deprecated)
- `logo-concept.svg` - Original neural network design
- `logo-minimal.svg` - Minimal S-shape design
- `logo-app-icon.svg` - Original app icon

**Migration Note:** Legacy variants remain supported in the Logo component for backward compatibility but should be replaced with new designs in future updates.

---

## Contact & Support

For questions about logo usage, custom variations, or brand guidelines:
- **Documentation:** See `LOGO_GUIDE.md` for technical details
- **Component:** See `components/Logo.tsx` for implementation
- **Design Files:** Located in `/public/` directory

---

**Last Updated:** October 2024
**Version:** 2.0
**Maintained by:** Synaptic Brand Team
