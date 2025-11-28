---
name: frontend-design
description: Improve frontend design aesthetics (typography, colors, animations, backgrounds) while preserving functionality. Use when asked to improve UI/UX, update styling, redesign components, or make the app look better. NEVER modify state logic, event handlers, or API calls.
---

# Frontend Design Skill

Improve Synaptic's frontend design without breaking functionality. Style the APPEARANCE, never touch the BEHAVIOR.

## Core Principle

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

## Design Vectors

### Typography
Choose fonts that are beautiful, unique, and interesting.

**Never use**: Inter, Roboto, Open Sans, Lato, Arial, default system fonts

**Good choices**:
- Code aesthetic: JetBrains Mono, Fira Code, Space Grotesk
- Editorial: Playfair Display, Crimson Pro
- Technical: IBM Plex family, Source Sans 3
- Distinctive: Bricolage Grotesque, Newsreader

**Pairing principle**: High contrast = interesting. Display + monospace, serif + geometric sans.

**Use extremes**: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.

### Color & Theme
Commit to a cohesive aesthetic. Use CSS variables for consistency.

**Synaptic brand colors** (see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)):
- Primary: `#7B3FF2` (purple)
- Secondary: `#E91E8C` (hot pink)
- Blue: `#2D3E9F`
- Orange: `#FF6B35`

Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

### Motion
Use animations for effects and micro-interactions.

**Focus on high-impact moments**: One well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions.

**Tailwind utilities**: `transition-*`, `duration-*`, `ease-*`, `animate-*`

### Backgrounds
Create atmosphere and depth rather than defaulting to solid colors.

**Techniques**:
- Layer CSS gradients
- Use geometric patterns
- Add contextual effects matching the aesthetic
- Subtle blur effects (`backdrop-blur-*`)

## What to Avoid

- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design lacking context-specific character

**You still tend to converge on common choices** (Space Grotesk, for example) across generations. Think outside the box!

## Safety Rules

Before making ANY change, consult [SAFETY-GUIDELINES.md](SAFETY-GUIDELINES.md).

**Safe to change** (Green Light):
- Colors, gradients, shadows, opacity
- Typography (fonts, sizes, weights, spacing)
- Padding, margin, gap, border-radius
- Animations, transitions, transforms (visual only)
- Responsive breakpoints

**Never touch** (Red Light):
- `useState`, `useEffect`, `useCallback`, `useMemo`
- `onClick`, `onSubmit`, `onChange`, `onBlur`, `onFocus`
- API calls, data fetching, form validation
- Route definitions, authentication logic
- Props destructuring, conditional rendering logic

## Workflow

1. **Read the component** before making changes
2. **Identify safe changes** using SAFETY-GUIDELINES.md
3. **Apply design improvements** following this guide
4. **Verify functionality** using [CHECKLIST.md](CHECKLIST.md)
5. **Test responsively** (mobile, tablet, desktop)

## Quick Reference

| Want to change... | Safe? | How |
|-------------------|-------|-----|
| Button color | Yes | Modify Tailwind `bg-*` class |
| Button click action | NO | NEVER TOUCH |
| Card shadow | Yes | Add/modify `shadow-*` class |
| Modal open/close | NO | NEVER TOUCH |
| Font size | Yes | Modify `text-*` class |
| Form validation | NO | NEVER TOUCH |
| Spacing | Yes | Modify `gap-*`, `p-*`, `m-*` |
| API call | NO | NEVER TOUCH |
