# Synaptic Design System

Reference for all design tokens. Source: `app/globals.css`

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

### Hover States
| Base | Hover | Variable |
|------|-------|----------|
| `#7B3FF2` | `#6727E2` | `--accent-primary-hover` |
| `#E91E8C` | `#D5147C` | `--accent-secondary-hover` |

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
