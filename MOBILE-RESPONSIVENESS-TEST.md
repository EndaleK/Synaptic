# Mobile Responsiveness Testing Guide

**Test Date**: _____________
**Tester Name**: _____________

---

## Overview

This guide helps you test Synaptic's mobile responsiveness across different devices and screen sizes. Test on both real devices and browser dev tools.

**Estimated Time**: 90 minutes
**Devices Needed**: iPhone, Android, iPad/tablet, small laptop

---

## Test Devices

### Record Your Test Devices

**Device 1** (iPhone/iOS):
- Model: _____________
- OS Version: _____________
- Screen Size: _____________
- Browser: Safari / Chrome

**Device 2** (Android):
- Model: _____________
- OS Version: _____________
- Screen Size: _____________
- Browser: Chrome / Firefox

**Device 3** (Tablet):
- Model: _____________
- OS Version: _____________
- Screen Size: _____________
- Browser: _____________

**Device 4** (Small Laptop):
- Model: _____________
- Screen Size: _____________
- Browser: _____________

---

## Responsive Breakpoints Used

The app uses these Tailwind breakpoints:
- **Mobile**: < 768px (base styles, no prefix)
- **Tablet**: ≥ 768px (`md:` prefix)
- **Desktop**: ≥ 1024px (`lg:` prefix)
- **Large Desktop**: ≥ 1280px (`xl:` prefix)
- **Extra Large**: ≥ 1536px (`2xl:` prefix)

---

## Part 1: Landing Page (`/`) - 15 minutes

### Test on Mobile (< 768px)

**Device**: _____________

#### Header/Navigation
- [ ] Logo displays correctly
- [ ] Menu collapses to hamburger icon
- [ ] Hamburger menu opens/closes smoothly
- [ ] Menu items readable and tappable
- [ ] Sign In / Sign Up buttons accessible

**Issues**:
```
___________________________________________
```

#### Hero Section
- [ ] Hero text readable (not too small)
- [ ] Hero text not cut off
- [ ] CTA buttons properly sized (min 44x44px touch target)
- [ ] Buttons don't overflow
- [ ] Spacing looks good

**Issues**:
```
___________________________________________
```

#### Features Section
- [ ] Feature cards stack vertically
- [ ] Icons display correctly
- [ ] Text readable
- [ ] No horizontal scroll

**Issues**:
```
___________________________________________
```

#### Pricing Cards
- [ ] Pricing cards stack vertically
- [ ] Price text readable
- [ ] Feature lists readable
- [ ] CTA buttons accessible

**Issues**:
```
___________________________________________
```

#### Footer
- [ ] Footer links accessible
- [ ] Social icons display
- [ ] Copyright text readable
- [ ] No content cut off

**Issues**:
```
___________________________________________
```

---

## Part 2: Authentication Pages - 10 minutes

### Sign Up Page (`/sign-up`)

**Test on All Devices**:

#### Mobile (< 768px)
- [ ] Form fields properly sized
- [ ] Labels readable (min 14px)
- [ ] Input fields min 44px height
- [ ] Keyboard doesn't cover inputs (iOS)
- [ ] Email keyboard shows on email field
- [ ] Password toggle button works
- [ ] Submit button accessible
- [ ] Error messages readable
- [ ] No horizontal scroll

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Tablet (≥ 768px)
- [ ] Form centered and reasonable width
- [ ] All elements visible
- [ ] Proper spacing

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Sign In Page (`/sign-in`)

- [ ] Same checks as Sign Up
- [ ] "Forgot Password" link accessible
- [ ] "Don't have an account" link visible

**Issues**:
```
___________________________________________
```

---

## Part 3: Dashboard Layout - 20 minutes

### Sidebar Navigation

#### Mobile (< 768px)
- [ ] Sidebar hidden by default
- [ ] Hamburger menu icon visible
- [ ] Sidebar slides in from left when opened
- [ ] Backdrop overlay blocks content behind
- [ ] Can close sidebar by tapping backdrop
- [ ] Can close sidebar by tapping X button
- [ ] Sidebar menu items tappable
- [ ] Icons and text readable

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Tablet (≥ 768px)
- [ ] Sidebar visible by default OR collapsible
- [ ] Proper sidebar width
- [ ] Content area adjusts when sidebar opens/closes
- [ ] No overlap with main content

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Desktop (≥ 1024px)
- [ ] Sidebar always visible
- [ ] Sidebar can collapse to icons only
- [ ] Smooth collapse animation
- [ ] Content area adapts properly

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 4: Dashboard Home - 15 minutes

### Welcome Banner

#### Mobile
- [ ] Welcome text readable (min 18px)
- [ ] User name displays correctly
- [ ] Date displays (may abbreviate on small screens)
- [ ] Gradient background visible
- [ ] No text overflow

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Study Tools Section

#### Mobile (< 768px)
- [ ] Tiles stack in 1-2 columns
- [ ] Icons display correctly (not too small)
- [ ] Text readable (min 14px)
- [ ] Tiles tappable (min 44x44px)
- [ ] Badges readable
- [ ] No horizontal scroll

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Tablet (≥ 768px)
- [ ] Tiles in 2-3 columns grid
- [ ] Proper spacing between tiles
- [ ] Text and icons balanced

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Desktop (≥ 1024px)
- [ ] Tiles in 5 columns (or as designed)
- [ ] Everything readable and balanced

**Issues**:
```
___________________________________________
```

### Learning Modes Section

- [ ] Same checks as Study Tools section
- [ ] Mode descriptions readable
- [ ] Premium badges visible
- [ ] Tiles properly sized

**Issues**:
```
___________________________________________
```

---

## Part 5: Document Upload - 10 minutes

### Upload Interface

#### Mobile
- [ ] "Upload" button accessible
- [ ] File picker opens correctly
- [ ] Upload progress visible
- [ ] Progress bar not too small
- [ ] Document list scrollable
- [ ] Document cards readable
- [ ] Action buttons (delete, download) tappable

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Tablet/Desktop
- [ ] Drag-and-drop area visible
- [ ] Proper size and clear boundaries
- [ ] Multiple file selection works

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 6: Flashcard Interface - 15 minutes

### Flashcard Display

#### Mobile (< 768px)
- [ ] Card fills screen width (with padding)
- [ ] Card height appropriate (not too tall)
- [ ] Question text readable (min 16px)
- [ ] Answer text readable
- [ ] Flip animation smooth
- [ ] No content cut off
- [ ] Can swipe to next card (if implemented)

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Navigation Controls

#### Mobile
- [ ] Previous/Next buttons accessible
- [ ] Buttons min 44x44px touch target
- [ ] Buttons don't overlap with card content
- [ ] Progress indicator visible
- [ ] Card counter readable

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Review Buttons (Again/Hard/Good/Easy)

#### Mobile
- [ ] All 4 buttons visible without scroll
- [ ] Buttons tappable (min 44x44px)
- [ ] Button labels readable
- [ ] Proper spacing between buttons
- [ ] No overlap

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 7: Mock Exam Interface - 15 minutes

### Exam Interface

#### Mobile
- [ ] Question text readable (min 14px)
- [ ] MCQ options clearly separated
- [ ] Radio buttons tappable (min 44x44px)
- [ ] Option text doesn't wrap awkwardly
- [ ] Timer always visible (sticky)
- [ ] Timer doesn't cover content
- [ ] Progress bar visible

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Question Navigator

#### Mobile
- [ ] Navigator accessible (may be collapsible)
- [ ] Question numbers tappable
- [ ] Status colors visible (answered/unanswered)
- [ ] Doesn't take up too much space

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Navigation Buttons

#### Mobile
- [ ] Previous/Next buttons accessible
- [ ] Submit button visible and accessible
- [ ] Buttons don't overlap with content
- [ ] Confirmation modal fits on screen
- [ ] Modal buttons tappable

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 8: Chat Interface - 10 minutes

### Chat Display

#### Mobile
- [ ] Message bubbles properly sized
- [ ] User messages right-aligned
- [ ] AI messages left-aligned
- [ ] Text readable (min 14px)
- [ ] Messages don't overflow
- [ ] Scroll works smoothly
- [ ] Auto-scroll to bottom works

**Device**: _____________
**Issues**:
```
___________________________________________
```

### Chat Input

#### Mobile
- [ ] Input field expands with text
- [ ] Send button always accessible
- [ ] Keyboard doesn't cover input
- [ ] Can see recent messages while typing
- [ ] Send button min 44x44px

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 9: Mind Map Viewer - 10 minutes

### Mind Map Display

#### Mobile
- [ ] Mind map renders correctly
- [ ] Can zoom with pinch gesture
- [ ] Can pan with touch drag
- [ ] Nodes tappable to expand/collapse
- [ ] Node text readable at default zoom
- [ ] Zoom controls accessible (if present)
- [ ] No performance issues

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Tablet/Desktop
- [ ] Mind map fills available space
- [ ] Mouse wheel zoom works
- [ ] Drag to pan works
- [ ] All controls accessible

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Part 10: Podcast Player - 5 minutes

### Podcast Interface

#### Mobile
- [ ] Audio player controls visible
- [ ] Play/pause button accessible (min 44x44px)
- [ ] Seek bar scrubbing works
- [ ] Time display readable
- [ ] Volume control accessible
- [ ] Transcript scrollable (if shown)
- [ ] Download button accessible

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Performance Testing

### Page Load Performance

Test on each device:

#### Mobile (4G connection)
- [ ] Landing page loads < 3 seconds
- [ ] Dashboard loads < 3 seconds
- [ ] Images load progressively
- [ ] No layout shifts (CLS < 0.1)

**Device**: _____________
**Load times**:
- Landing: _______ seconds
- Dashboard: _______ seconds

**Issues**:
```
___________________________________________
```

#### Tablet (WiFi)
- [ ] All pages load < 2 seconds
- [ ] Smooth scrolling
- [ ] No lag in animations

**Load times**:
- Landing: _______ seconds
- Dashboard: _______ seconds

**Issues**:
```
___________________________________________
```

### Animation Performance

Test on each device:

- [ ] Card flip animation smooth (60fps)
- [ ] Sidebar slide animation smooth
- [ ] Modal open/close smooth
- [ ] No jank or stuttering
- [ ] Transitions feel responsive

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Accessibility Testing

### Touch Targets

#### Minimum Size Check (44x44px)
- [ ] All buttons meet minimum size
- [ ] Links have enough padding
- [ ] Radio buttons/checkboxes large enough
- [ ] Form inputs tall enough

**Violations Found**:
```
___________________________________________
```

### Text Readability

#### Minimum Font Size (14px body, 12px small)
- [ ] Body text ≥ 14px
- [ ] Headings properly sized
- [ ] Small text (captions) ≥ 12px
- [ ] No text too small to read

**Violations Found**:
```
___________________________________________
```

### Color Contrast

- [ ] Text has sufficient contrast
- [ ] Light mode contrast good
- [ ] Dark mode contrast good
- [ ] Interactive elements visible

**Violations Found**:
```
___________________________________________
```

---

## Cross-Browser Testing

### Mobile Browsers

#### Safari (iOS)
- [ ] All features work
- [ ] No CSS issues
- [ ] Touch events work
- [ ] Form inputs work properly

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Chrome (Android)
- [ ] All features work
- [ ] No CSS issues
- [ ] Touch events work
- [ ] No performance issues

**Device**: _____________
**Issues**:
```
___________________________________________
```

#### Firefox (Mobile)
- [ ] All features work
- [ ] Layout correct
- [ ] No major issues

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Orientation Testing

### Portrait Mode
- [ ] All pages display correctly
- [ ] Navigation works
- [ ] No horizontal scroll
- [ ] Touch targets accessible

### Landscape Mode
- [ ] Layout adapts properly
- [ ] Content not cut off
- [ ] Navigation still accessible
- [ ] Touch targets still accessible

**Device**: _____________
**Issues**:
```
___________________________________________
```

---

## Common Issues Checklist

### Layout Issues
- [ ] No horizontal scrolling
- [ ] No overlapping elements
- [ ] Proper spacing throughout
- [ ] Content not cut off at edges
- [ ] No awkward text wrapping

### Touch/Interaction Issues
- [ ] All buttons tappable
- [ ] No accidental taps (elements too close)
- [ ] Swipe gestures work (if implemented)
- [ ] Pinch zoom works where needed
- [ ] Long press doesn't trigger unwanted actions

### Performance Issues
- [ ] Pages load quickly
- [ ] Animations smooth
- [ ] Scrolling smooth
- [ ] No lag or freezing
- [ ] Memory usage reasonable

### Typography Issues
- [ ] Text readable on all screens
- [ ] Line length appropriate (not too long)
- [ ] Line height sufficient
- [ ] No text overflow

---

## Browser DevTools Testing

### Chrome DevTools Responsive Mode

Test these preset devices:
1. [ ] iPhone SE (375x667)
2. [ ] iPhone 12 Pro (390x844)
3. [ ] iPhone 14 Pro Max (430x932)
4. [ ] Samsung Galaxy S20 (360x800)
5. [ ] iPad Mini (768x1024)
6. [ ] iPad Pro (1024x1366)
7. [ ] Surface Duo (540x720)

**Screenshot Key Screens**:
- Landing page
- Dashboard home
- Flashcard interface
- Exam interface
- Chat interface

---

## Test Summary

### Overall Results

**Devices Tested**: _______
**Total Issues Found**: _______
- Critical: _______
- High: _______
- Medium: _______
- Low: _______

### Critical Issues (Blockers)
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### High Priority Issues
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Medium Priority Issues
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Low Priority / Polish
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

---

## Device-Specific Issues

### iOS Issues
```
___________________________________________
___________________________________________
```

### Android Issues
```
___________________________________________
___________________________________________
```

### Tablet Issues
```
___________________________________________
___________________________________________
```

---

## Recommendations

### Must Fix Before Launch:
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Should Fix Soon:
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Future Improvements:
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

---

## Sign-Off

**Tested By**: _____________________
**Date**: _____________________
**Mobile Ready**: [ ] Yes [ ] No [ ] With Fixes

**Comments**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Additional Resources

### Testing Tools:
- Chrome DevTools Device Mode
- BrowserStack (real device testing)
- Responsively App (multi-device preview)
- Mobile-Friendly Test (Google)
- Lighthouse Mobile Report

### Design Guidelines:
- Minimum touch target: 44x44px (Apple), 48x48dp (Android)
- Minimum font size: 16px for inputs (prevents zoom on iOS)
- Maximum content width: 100vw (no horizontal scroll)
- Recommended line length: 50-75 characters

---

**Version**: 1.0
**Last Updated**: November 9, 2025
