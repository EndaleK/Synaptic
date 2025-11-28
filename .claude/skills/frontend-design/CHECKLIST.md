# Design Change Verification Checklist

Run through this checklist after making design changes to ensure nothing is broken.

---

## Quick Test (After Every Change)

### 1. Visual Check
- [ ] Page loads without errors (check browser console)
- [ ] No layout shifts or broken layouts
- [ ] Text is readable (sufficient contrast)
- [ ] No elements overlapping incorrectly

### 2. Interactive Elements
- [ ] All buttons are clickable
- [ ] All links navigate correctly
- [ ] Hover states work as expected
- [ ] Focus states are visible (tab through)

---

## Component-Specific Tests

### Navigation
- [ ] Logo links to home
- [ ] All nav links work
- [ ] Mobile menu opens/closes
- [ ] Current page indicator visible

### Forms
- [ ] Can type in all inputs
- [ ] Validation messages appear
- [ ] Submit button works
- [ ] Error states display correctly

### Modals/Dialogs
- [ ] Modal opens on trigger
- [ ] Modal closes on X button
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Escape key
- [ ] Content inside modal is accessible

### Cards & Lists
- [ ] All cards render completely
- [ ] Click actions on cards work
- [ ] Scroll works in scrollable areas
- [ ] Empty states display correctly

### Buttons
- [ ] Primary buttons stand out
- [ ] Disabled states look disabled
- [ ] Loading states show spinner
- [ ] Click handlers fire correctly

---

## Responsive Check

### Mobile (< 640px)
- [ ] No horizontal scrolling
- [ ] Touch targets are large enough (44x44px min)
- [ ] Text is readable without zooming
- [ ] Navigation is accessible

### Tablet (640px - 1024px)
- [ ] Layout adapts appropriately
- [ ] Sidebars collapse or adjust
- [ ] Images scale correctly

### Desktop (> 1024px)
- [ ] Full layout displays
- [ ] No stretched elements
- [ ] Proper use of whitespace

---

## Page-Specific Checklists

### Landing Page
- [ ] Hero section displays correctly
- [ ] Feature cards are visible
- [ ] CTA buttons work
- [ ] Pricing section renders
- [ ] Footer links work

### Dashboard
- [ ] Mode selector works
- [ ] Document list loads
- [ ] Active document displays
- [ ] Study Buddy opens
- [ ] All mode views render

### Flashcards Mode
- [ ] Cards flip on click
- [ ] Next/Previous navigation works
- [ ] Progress indicator updates
- [ ] Difficulty buttons work

### Chat Mode
- [ ] Messages display correctly
- [ ] Input field accepts text
- [ ] Send button works
- [ ] Streaming responses render

### Podcast Mode
- [ ] Audio player controls work
- [ ] Play/pause functions
- [ ] Progress bar updates
- [ ] Volume control works

### Mind Map Mode
- [ ] Nodes render correctly
- [ ] Zoom controls work
- [ ] Pan/drag works
- [ ] Node details show

---

## Dark Mode Check

If dark mode is supported:
- [ ] Toggle switches theme
- [ ] All text is readable in dark mode
- [ ] Backgrounds have sufficient contrast
- [ ] Images/icons are visible
- [ ] Form inputs are styled correctly
- [ ] Focus states are visible

---

## Accessibility Quick Check

- [ ] Color contrast passes (use browser devtools)
- [ ] All images have alt text (or are decorative)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] No focus traps
- [ ] Screen reader would understand structure

---

## Performance Check

- [ ] No console errors
- [ ] No console warnings about React keys
- [ ] Page doesn't feel sluggish
- [ ] Animations are smooth (60fps)
- [ ] Images are appropriately sized

---

## Before Committing

- [ ] Run `npm run build` - no errors
- [ ] Run `npm run lint` - no new errors
- [ ] Test in Chrome
- [ ] Test in Safari (if on Mac)
- [ ] Test on mobile device or emulator

---

## Rollback Plan

If something breaks:

1. **Identify the broken commit:**
   ```bash
   git log --oneline -10
   ```

2. **Revert the change:**
   ```bash
   git revert <commit-hash>
   ```

3. **Or reset to previous state:**
   ```bash
   git checkout <previous-commit> -- path/to/file
   ```

4. **Push the fix:**
   ```bash
   git push
   ```

---

## Common Issues & Fixes

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Button not clickable | Z-index or overlay | Check `z-index`, remove overlapping elements |
| Text invisible | Color matches background | Check `text-*` and `bg-*` contrast |
| Layout broken | Missing flex/grid class | Verify parent container classes |
| Scrolling broken | Fixed height + no overflow | Add `overflow-auto` or remove fixed height |
| Modal won't close | Event handler removed | Check onClick handlers still present |
| Form won't submit | Removed form element or handler | Verify `<form>` and `onSubmit` |
