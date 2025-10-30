# 🎨 Synaptic Logo Design Guide

## Logo Concepts

Three unique logo designs have been created for Synaptic, each serving different purposes:

### 1. **Neural Network Logo** (`logo-concept.svg`)
**Best for:** Presentations, Marketing Materials, Landing Page Hero

- Features interconnected nodes representing synaptic connections
- Scientific and detailed design
- Shows the complexity and sophistication of the AI learning platform
- **Use cases:**
  - Landing page hero section (200×200px or larger)
  - Pitch decks and presentations
  - Marketing materials and brochures
  - Social media profile images

### 2. **Synaptic Flow (Minimal)** (`logo-minimal.svg`)
**Best for:** Website Header, Navigation, Favicons

- Clean, elegant "S" shape forming a brain pathway
- Highly scalable and readable at small sizes
- Perfect for navigation bars and headers
- **Use cases:**
  - Website header/navigation (40×40px)
  - Email signatures
  - Favicon (converted to ICO)
  - Loading spinners

### 3. **Knowledge Hub (App Icon)** (`logo-app-icon.svg`)
**Best for:** Mobile Apps, PWA Icons

- Optimized for iOS/Android app stores
- 512×512px rounded square format
- Bold, recognizable design at all sizes
- **Use cases:**
  - iOS App Store icon
  - Android Play Store icon
  - PWA manifest icons
  - Desktop app icons

## Color Palette

### Primary Gradient
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
- Start: `#667eea` (Royal Blue)
- End: `#764ba2` (Purple)
- Use for: Main branding, backgrounds, primary buttons

### Accent Gradient
```css
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
```
- Start: `#f093fb` (Light Pink)
- End: `#f5576c` (Coral)
- Use for: Highlights, CTAs, interactive elements

### Supporting Colors
- **White**: `#ffffff` (clean backgrounds, text on dark)
- **Dark**: `#2d3748` (text, dark mode backgrounds)
- **Gray Light**: `#f7fafc` (subtle backgrounds)
- **Gray Medium**: `#718096` (secondary text)

## Usage in Code

### React/Next.js Component
```tsx
import Logo from '@/components/Logo'

// Simple logo
<Logo variant="minimal" size={40} />

// With animation
<AnimatedLogo variant="minimal" size={50} />

// With text and tagline
<LogoWithText variant="minimal" size={40} showTagline />
```

### HTML/CSS
```html
<!-- In navigation -->
<img src="/logo-minimal.svg" alt="Synaptic" width="40" height="40">

<!-- In hero section -->
<img src="/logo-concept.svg" alt="Synaptic Learning" width="200" height="200">
```

### Favicon Setup
```html
<!-- In app/layout.tsx or index.html -->
<link rel="icon" type="image/svg+xml" href="/logo-minimal.svg">
<link rel="apple-touch-icon" href="/logo-app-icon.png">
```

## Export Formats

### For Web
- **SVG** (recommended): Infinite scalability, small file size
- **WebP**: Optimized for modern browsers
- **PNG**: For maximum compatibility

### For Mobile Apps
Generate PNG versions at these sizes:
- 512×512px (App Store standard)
- 1024×1024px (High resolution)
- 2048×2048px (Future-proof)

### For Favicon
- 16×16px (ICO)
- 32×32px (ICO)
- 48×48px (ICO)
- 180×180px (Apple Touch Icon)

## Converting SVG to PNG

Use this command to generate PNG versions:

```bash
# Install imagemagick if needed: brew install imagemagick

# Generate PNG at different sizes
convert -background none logo-minimal.svg -resize 512x512 logo-minimal-512.png
convert -background none logo-minimal.svg -resize 1024x1024 logo-minimal-1024.png
convert -background none logo-app-icon.svg -resize 512x512 logo-app-icon-512.png
```

## Brand Guidelines

### Spacing
- Minimum clear space around logo: Equal to the height of the logo
- Never place logo on busy backgrounds without a container
- Always maintain aspect ratio when scaling

### Don'ts
❌ Don't stretch or squash the logo
❌ Don't change the gradient colors
❌ Don't add drop shadows or effects (unless using AnimatedLogo component)
❌ Don't rotate the logo
❌ Don't use on low-contrast backgrounds without a container

### Do's
✅ Use on white, dark, or gradient backgrounds
✅ Maintain clear space around logo
✅ Use SVG format for web whenever possible
✅ Use provided color palette for consistency
✅ Scale proportionally

## Preview

View all logo concepts in your browser:
```
http://localhost:3003/logo-preview.html
```

## Files Location

```
public/
├── logo-concept.svg        # Neural network detailed logo
├── logo-minimal.svg        # Minimal S-shaped logo
├── logo-app-icon.svg       # App icon (512×512)
└── logo-preview.html       # Interactive preview page

components/
└── Logo.tsx                # React component for easy integration
```

## Typography Pairing

**Primary Font:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

**For Logo Text:**
- Font Weight: 700 (Bold)
- Background Clip: text
- Gradient: Primary gradient

**Tagline:**
- Font Weight: 400 (Regular)
- Color: Gray Medium (#718096)
- Size: 40% of logo text size

## Animation Guidelines

Use subtle animations to bring logo to life:

```css
/* Pulse effect for loading states */
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* Fade in on page load */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Questions?

For any branding questions or to request additional logo variations, please refer to the design team or create an issue in the repository.
