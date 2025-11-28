# Safety Guidelines for Frontend Design

These rules ensure design changes don't break functionality.

---

## Safe Changes (Green Light)

These changes are purely visual with ZERO risk of breaking functionality:

### Colors & Gradients
- Background colors (`bg-*`, `background`, `background-color`)
- Text colors (`text-*`, `color`)
- Border colors (`border-*`)
- Gradient values (`from-*`, `to-*`, `via-*`, `linear-gradient`)
- Shadow colors (`shadow-*`)
- Opacity values (`opacity-*`, `/50`, etc.)

### Typography
- Font sizes (`text-xs`, `text-sm`, `text-base`, etc.)
- Font weights (`font-normal`, `font-bold`, etc.)
- Line heights (`leading-*`)
- Letter spacing (`tracking-*`)
- Text alignment (`text-left`, `text-center`, `text-right`)
- Text decoration (`underline`, `line-through`)

### Spacing & Layout (Visual Only)
- Padding (`p-*`, `px-*`, `py-*`, `pt-*`, etc.)
- Margin (`m-*`, `mx-*`, `my-*`, `mt-*`, etc.)
- Gap (`gap-*`)
- Border radius (`rounded-*`)
- Border width (`border`, `border-2`, etc.)

### Visual Effects
- Shadows (`shadow-sm`, `shadow-lg`, `shadow-xl`)
- Blur (`blur-*`, `backdrop-blur-*`)
- Brightness, contrast, saturation filters
- Transitions (`transition-*`, `duration-*`, `ease-*`)
- Animations (CSS keyframes, `animate-*`)
- Transforms for visual effect (`scale-*`, `rotate-*` on hover)

### Responsive Adjustments
- Breakpoint-specific styling (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Hidden/visible at breakpoints (`hidden md:block`)

### Icons & Images
- Icon sizes (`w-*`, `h-*` on icons)
- Icon colors
- Image styling (rounded corners, shadows)

---

## Caution Changes (Yellow Light)

These changes require careful testing after implementation:

### Layout Structure
- Flexbox direction changes (`flex-row` ↔ `flex-col`)
- Grid column/row changes
- Changing `items-*` or `justify-*` alignment
- Adding/removing wrapper divs (for styling purposes only)

### Component Sizing
- Width changes (`w-*`) - may affect responsive behavior
- Height changes (`h-*`) - may affect scrolling
- Max/min width/height

### Position Changes
- Changing `relative`/`absolute`/`fixed` positioning
- Z-index changes

### Visibility
- `hidden`/`block` changes
- Conditional visibility based on state

**After ANY yellow light change, verify:**
- [ ] Click all buttons on the component
- [ ] Test on mobile viewport
- [ ] Check that nothing overlaps incorrectly
- [ ] Ensure scrolling still works

---

## Forbidden Changes (Red Light)

**NEVER modify these - they control functionality:**

### State & Logic
- `useState`, `useEffect`, `useCallback`, `useMemo`
- Any variable declarations
- Conditional rendering logic (`{condition && ...}`)
- Map/filter/reduce operations
- Props destructuring

### Event Handlers
- `onClick`, `onSubmit`, `onChange`, `onBlur`, `onFocus`
- `onKeyDown`, `onKeyUp`, `onKeyPress`
- `onMouseEnter`, `onMouseLeave`
- Form handlers

### Data & API
- Fetch calls, API routes
- Data transformations
- Query parameters
- Response handling

### Navigation & Routing
- `useRouter`, `usePathname`
- `Link` component href values
- Redirect logic

### Authentication
- Clerk components and hooks
- Protected route logic
- User session handling

### Form Logic
- Form validation
- Input refs
- Controlled/uncontrolled input logic
- Submit handlers

### Third-Party Libraries
- Chart.js configurations
- PDF viewer settings
- TipTap editor config
- React Flow node/edge logic

---

## Best Practices

### 1. Work Incrementally
```
BAD:  Redesign entire page at once
GOOD: Change one component, test, repeat
```

### 2. Keep Original Structure
```tsx
// BAD - Don't restructure like this:
<div className="new-wrapper">
  <ComponentThatHandlesClick />
</div>

// GOOD - Style existing elements:
<ComponentThatHandlesClick className="new-styles-here" />
```

### 3. Use Existing Design Tokens
Reference `app/globals.css` and DESIGN-SYSTEM.md for:
- Brand colors: `--accent-primary`, `--accent-secondary`
- Mode colors: `--mode-flashcards`, `--mode-chat`, etc.
- Spacing: `--space-1` through `--space-6`

### 4. Preserve Accessibility
- Keep `aria-*` attributes unchanged
- Don't remove `role` attributes
- Maintain focus states
- Keep text readable (contrast ratios)

### 5. Test After Every Change
Run through CHECKLIST.md after each modification.
