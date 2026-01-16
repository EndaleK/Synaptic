# Synaptic Design System

Reference for all design tokens. Source: `app/globals.css`

**Last Updated:** Design System Overhaul (January 2026)

---

## Brand Colors

### Primary Gradient (Brain Logo)
```css
/* Use for headers, CTAs, brand elements */
background: linear-gradient(90deg, #7B3FF2 0%, #E91E8C 50%, #FF6B35 100%);
```

### Individual Brand Colors
| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Purple (Primary) | `#7B3FF2` | `--accent-primary` | Primary actions, links |
| Hot Pink | `#E91E8C` | `--accent-secondary` | Accents, highlights |
| Deep Blue | `#2D3E9F` | `--accent-blue` | Trust, stability |
| Orange | `#FF6B35` | `--accent-orange` | Energy, warnings |

### Hover States (Improved Contrast)
| Base | Hover | Variable | Contrast |
|------|-------|----------|----------|
| `#7B3FF2` | `#6B2FE2` | `--accent-primary-hover` | 5.2:1 (WCAG AA) |
| `#E91E8C` | `#D5147C` | `--accent-secondary-hover` | - |

### Electric Accents (NEW)
| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Electric Blue | `#0EA5E9` | `--accent-electric-blue` | Focus states, interactive |
| Mint | `#34D399` | `--accent-mint` | Success states |
| Coral | `#FB7185` | `--accent-coral` | Soft warnings |

---

## Surface Colors (NEW)

### Light Mode Surfaces
| Surface | Hex | CSS Variable | Usage |
|---------|-----|--------------|-------|
| Warm White | `#FDFCFB` | `--surface-warm` | Subtle warm backgrounds |
| Cool | `#F8FAFC` | `--surface-cool` | Card backgrounds |
| Elevated | `#FFFFFF` | `--surface-elevated` | Elevated cards that pop |

### Dark Mode Surfaces
| Surface | Hex | CSS Variable | Usage |
|---------|-----|--------------|-------|
| Dark | `#0C0A14` | `--surface-dark` | Rich dark with purple undertone |
| Dark Elevated | `#1A1625` | `--surface-dark-elevated` | Dark mode elevated cards |

### Muted Backgrounds
```css
--accent-primary-muted: rgba(123, 63, 242, 0.08);   /* Light mode */
--accent-secondary-muted: rgba(233, 30, 140, 0.06);

/* Dark mode - slightly higher opacity */
--accent-primary-muted: rgba(123, 63, 242, 0.12);
--accent-secondary-muted: rgba(233, 30, 140, 0.10);
```

---

## Mode Colors

Each learning mode has a signature color:

| Mode | Color | Hex | CSS Variable | Tailwind |
|------|-------|-----|--------------|----------|
| Flashcards | Indigo | `#6366F1` | `--mode-flashcards` | `indigo-500` |
| Chat | Blue | `#3B82F6` | `--mode-chat` | `blue-500` |
| Podcast | Violet | `#8B5CF6` | `--mode-podcast` | `violet-500` |
| Mind Map | Emerald | `#22C55E` | `--mode-mindmap` | `emerald-500` |
| Writer | Rose | `#F43F5E` | `--mode-writer` | `rose-500` |
| Video | Amber | `#FBB724` | `--mode-video` | `amber-500` |
| Quiz | Purple | `#7B3FF2` | `--accent-primary` | Custom |

### Background Tints
For immersive mode experiences, use subtle 4% opacity tints:
```css
--bg-tint-flashcards: rgba(99, 102, 241, 0.04);
--bg-tint-chat: rgba(59, 130, 246, 0.04);
--bg-tint-podcast: rgba(139, 92, 246, 0.04);
--bg-tint-mindmap: rgba(34, 197, 94, 0.04);
--bg-tint-writer: rgba(244, 63, 94, 0.04);
--bg-tint-video: rgba(251, 191, 36, 0.04);
```

---

## Semantic Colors

| Purpose | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Success | `#22C55E` | `#22C55E` | Confirmations, correct answers |
| Warning | `#F59E0B` | `#F59E0B` | Cautions, approaching limits |
| Danger | `#EF4444` | `#EF4444` | Errors, destructive actions |
| Info | `#0EA5E9` | `#0EA5E9` | Information, tips |

---

## Typography

### Font Family
- **Primary**: Inter, system-ui (via `--font-geist-sans`)
- **Mono**: Geist Mono (via `--font-geist-mono`)
- **Handwriting**: Patrick Hand (Study Buddy personality)

### Font Sizes
| Name | Size | Use Case |
|------|------|----------|
| `xs` | 0.75rem (12px) | Labels, captions |
| `sm` | 0.875rem (14px) | Secondary text |
| `base` | 1rem (16px) | Body text |
| `lg` | 1.125rem (18px) | Emphasized body |
| `xl` | 1.25rem (20px) | Subheadings |
| `2xl` | 1.5rem (24px) | Section headers |
| `3xl` | 1.875rem (30px) | Page titles |
| `4xl` | 2.25rem (36px) | Hero text |

### Font Weights
| Weight | Value | Use Case |
|--------|-------|----------|
| Normal | 400 | Body text |
| Medium | 500 | Slightly emphasized |
| Semibold | 600 | Buttons, labels |
| Bold | 700 | Headings, CTAs |

### Line Heights
| Name | Value | Use Case |
|------|-------|----------|
| Tight | 1.25 | Headings |
| Snug | 1.375 | Subheadings |
| Normal | 1.5 | Body text |
| Relaxed | 1.625 | Long-form reading |

---

## Spacing Scale

Based on 8px grid:

| Token | Size | Pixels | Common Use |
|-------|------|--------|------------|
| `space-1` | 0.5rem | 8px | Tight gaps |
| `space-2` | 1rem | 16px | Standard padding |
| `space-3` | 1.5rem | 24px | Section gaps |
| `space-4` | 2rem | 32px | Card padding |
| `space-5` | 2.5rem | 40px | Large sections |
| `space-6` | 3rem | 48px | Page sections |

**Tailwind equivalents:**
- `space-1` = `p-2`, `gap-2`, `m-2`
- `space-2` = `p-4`, `gap-4`, `m-4`
- etc.

---

## Neutral Colors

| Name | Hex | Tailwind | Use Case |
|------|-----|----------|----------|
| Gray 50 | `#F9FAFB` | `gray-50` | Light backgrounds |
| Gray 100 | `#F3F4F6` | `gray-100` | Card backgrounds |
| Gray 200 | `#E5E7EB` | `gray-200` | Borders |
| Gray 300 | `#D1D5DB` | `gray-300` | Disabled states |
| Gray 400 | `#9CA3AF` | `gray-400` | Placeholder text |
| Gray 500 | `#6B7280` | `gray-500` | Secondary text |
| Gray 600 | `#4B5563` | `gray-600` | Labels |
| Gray 700 | `#374151` | `gray-700` | Body text (dark) |
| Gray 800 | `#1F2937` | `gray-800` | Dark cards |
| Gray 900 | `#111827` | `gray-900` | Dark backgrounds |

---

## Border Radius

| Size | Tailwind | Use Case |
|------|----------|----------|
| Small | `rounded-sm` (2px) | Inputs, small elements |
| Default | `rounded` (4px) | Buttons |
| Medium | `rounded-md` (6px) | Cards |
| Large | `rounded-lg` (8px) | Modals |
| XL | `rounded-xl` (12px) | Feature cards |
| 2XL | `rounded-2xl` (16px) | Hero sections |
| Full | `rounded-full` | Pills, avatars |

---

## Shadows

| Name | Tailwind | Use Case |
|------|----------|----------|
| Subtle | `shadow-sm` | Raised buttons |
| Default | `shadow` | Cards |
| Medium | `shadow-md` | Dropdowns |
| Large | `shadow-lg` | Modals |
| XL | `shadow-xl` | Popovers |
| 2XL | `shadow-2xl` | Floating elements |

---

## Dark Mode

The app supports dark mode via `.dark` class. Use Tailwind's `dark:` prefix:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

### Key Dark Mode Values
| Element | Light | Dark |
|---------|-------|------|
| Background | `#FAFBFC` | `#111827` |
| Surface | `white` | `#1F2937` |
| Text Primary | `#1A1F36` | `#F9FAFB` |
| Text Secondary | `#6B7280` | `#9CA3AF` |
| Border | `#E5E7EB` | `#374151` |

---

## Common Patterns

### Primary Button
```tsx
<button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all">
```

### Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
```

### Mode Badge
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
```

### Gradient Text
```tsx
<span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
```

---

## Animation System (NEW)

### Branded Shimmer
Shimmer effect using brand purple-pink gradient for loading states:
```tsx
<div className="shimmer-brand h-8 w-32 rounded" />
```
- Light mode: `rgba(123, 63, 242, 0.03)` → `rgba(233, 30, 140, 0.06)`
- Dark mode: Higher opacity for visibility
- Animation: 2s ease-in-out infinite

### Section Reveal
Smooth entrance animation for page sections:
```tsx
<div className="animate-section-reveal stagger-index-1">
  Content appears with blur and translateY
</div>
```
Available stagger classes: `stagger-index-1` through `stagger-index-6`

### Card Glow
Hover effect with brand-colored glow:
```tsx
<div className="card-glow">
  Glows purple on hover with subtle lift
</div>
```

---

## Card Elevation System (NEW)

Consistent shadow hierarchy for visual depth:

| Class | Shadow | Use Case |
|-------|--------|----------|
| `card-level-1` | Subtle | Standard cards, list items |
| `card-level-2` | Medium | Modals, popovers, featured items |
| `card-level-3` | Strong | Floating elements, tooltips |

```tsx
// Standard card
<div className="card-level-1">...</div>

// Featured card with hover effect
<div className="card-level-2 card-glow">...</div>
```

---

## Background Patterns (NEW)

### Grid Pattern
Subtle brand-colored grid overlay:
```tsx
<div className="bg-grid-pattern">...</div>
```
Or inline for custom sizing:
```tsx
style={{
  backgroundImage: `
    linear-gradient(rgba(123, 63, 242, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(123, 63, 242, 0.02) 1px, transparent 1px)
  `,
  backgroundSize: '48px 48px',
}}
```

### Dot Pattern
Alternative decorative background:
```tsx
<div className="bg-dot-pattern">...</div>
```

---

## Illustration Components (NEW)

Located in `components/illustrations/`:

### Decorative Components
```tsx
import { BackgroundOrbs, GridPattern } from '@/components/illustrations'

// Floating gradient orbs
<BackgroundOrbs variant="dashboard" />

// Grid overlay
<GridPattern variant="dot" opacity="subtle" />
```

### Empty State Illustrations
```tsx
import { NoDocuments, NoFlashcards, NoActivity } from '@/components/illustrations'

<EmptyState
  illustration="documents"  // or "flashcards" or "activity"
  title="No documents yet"
  description="..."
/>
```

---

## Accessibility

### Reduced Motion
All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  .shimmer-brand, .animate-section-reveal, .card-glow {
    animation: none !important;
    transition: none !important;
  }
}
```

### Color Contrast
- Primary purple text: Use `#6B2FE2` (improved from `#7B3FF2`) for 5.2:1 contrast
- All semantic colors meet WCAG AA standards
