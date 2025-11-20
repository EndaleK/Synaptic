# 📱 Shareable Landing Pages - Quick Guide

## ✅ What's Been Created

Two shareable landing pages with company logo, all features, and working QR codes:

### 1. Desktop/Full Version
**URL**: https://synaptic.study/share (redirects to /share.html)
**Direct URL**: https://synaptic.study/share.html

**Features**:
- 🧠 Gradient header with brain emoji logo
- 8 learning modes in responsive feature grid
- Complete comparison table vs NotebookLM
- Pricing cards (Free $0, Premium $9.99, Student $4.99)
- Working QR code (200x200px, purple gradient)
- Share buttons: WhatsApp, Twitter, Facebook, Email, Copy Link
- Student testimonials
- Launch special offer (LAUNCH1000 code - 50% off)
- Fully responsive design for desktop, tablet, mobile

### 2. Mobile-Optimized Version
**URL**: https://synaptic.study/share/mobile (redirects to /share-mobile.html)
**Direct URL**: https://synaptic.study/share-mobile.html

**Features**:
- Card-based layout optimized for mobile scrolling
- Simplified feature presentation with icons
- Compact comparison table with checkmarks/crosses
- Smaller QR code (150x150px)
- 2x2 share button grid
- Touch-optimized interactions
- Purple gradient background (#667eea → #764ba2)

## 🎯 How to Access

### Production
Once deployed, access at:
- https://synaptic.study/share
- https://synaptic.study/share-mobile
- https://synaptic.study/share.html (direct)
- https://synaptic.study/share-mobile.html (direct)

### Development
```bash
npm run dev
```
Then visit:
- http://localhost:3000/share
- http://localhost:3000/share-mobile
- http://localhost:3000/share.html (direct)
- http://localhost:3000/share-mobile.html (direct)

## 📤 Sharing Options

Both pages include working share buttons:

**WhatsApp**: Pre-populated message highlighting Synaptic features
```
🧠 Found an amazing study app!

Synaptic turns PDFs into:
✅ Flashcards (offline)
✅ Podcasts
✅ Mind maps
✅ Practice exams

Better than NotebookLM!

Try free: https://synaptic.study

Use code LAUNCH1000 for 50% off
```

**Twitter**: Shareable tweet with features
**Facebook**: Share to Facebook feed
**Email**: Pre-populated email subject and body
**Copy Link**: Copies URL to clipboard

## 🗺️ QR Code Details

- **Library**: qrcodejs (1.0.0) from CDN
- **URL**: Points to https://synaptic.study?ref=qr
- **Color**: Purple (#667eea) on white background
- **Size**: 200x200 (desktop), 150x150 (mobile)
- **Error Correction**: High (Level H)
- **Auto-generated**: On page load via JavaScript

## 📂 File Structure

```
flashcard-generator/
├── app/
│   └── share/
│       ├── page.tsx          # Redirects /share → /share.html
│       └── mobile/
│           └── page.tsx      # Redirects /share/mobile → /share-mobile.html
├── public/
│   ├── share.html            # Full desktop/mobile responsive landing page
│   └── share-mobile.html     # Mobile-optimized variant
└── middleware.ts             # Updated to make /share(.*) public routes
```

## 🔒 Route Protection

The `/share` and `/share/mobile` routes are configured as **public routes** in [middleware.ts](middleware.ts):

```typescript
const isPublicRoute = createRouteMatcher([
  // ... other routes
  '/share(.*)', // Shareable landing pages
])
```

This means:
- ✅ No authentication required
- ✅ Accessible to anyone with the link
- ✅ Can be shared via SMS, WhatsApp, email, social media

## 🎨 Design Highlights

**Brand Colors**:
- Primary gradient: #667eea → #764ba2 (purple)
- Success: #28a745 (green checkmarks)
- Error: #dc3545 (red crosses)
- Background: #f8f9fa (light gray)

**Typography**:
- Font family: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- Headers: 2.5em (h1), 1.8em (h2)
- Body: 1em with 1.6 line-height

**Responsive Breakpoints**:
- Mobile: <768px (single column layout)
- Tablet/Desktop: ≥768px (grid layouts)

## 📊 Key Features Highlighted

1. **AI Tutor Chat** - Socratic method teaching
2. **Smart Flashcards** - Spaced repetition (SM-2 algorithm)
3. **AI Podcasts** - 5-min summaries + deep dives
4. **Mind Maps** - 3 types (Hierarchical, Radial, Concept)
5. **Practice Exams** - Auto-generated with analytics
6. **Writing Assistant** - Essay editor with citations
7. **Video Learning** - YouTube transcripts + flashcards
8. **Study Analytics** - Progress tracking, streaks

## 🆚 Comparison vs NotebookLM

Highlighted advantages:
- ✅ **Offline Mode** (Synaptic has, NotebookLM doesn't)
- ✅ **Flashcards** with spaced repetition
- ✅ **Mind Maps** (3 types)
- ✅ **Practice Exams** with analytics
- ✅ **Study Analytics** (comprehensive)
- ✅ **Writing Tools** (full editor vs basic notes)

## 💰 Pricing Display

- **Free**: $0/mo - 10 docs, 50 flashcards, 5 podcasts
- **Premium**: $9.99/mo - Unlimited everything
- **Student**: $4.99/mo - 50% off with .edu email

**Launch Special**: 50% off with code `LAUNCH1000`

## 📱 Mobile Experience

The mobile version includes:
- Card-based UI for easy scrolling
- Larger touch targets (48px minimum)
- Simplified content for small screens
- No horizontal scrolling
- Fast loading (15KB HTML file)

## 🚀 Deployment Notes

1. **Static Files**: Both HTML files are in `/public` directory
2. **Next.js Routes**: App router pages in `/app/share`
3. **Middleware**: Updated to allow public access
4. **No Build Required**: Static HTML works independently
5. **CDN Ready**: Can be served from CDN for faster loading

## 📈 Marketing Use Cases

**SMS/WhatsApp Sharing**:
- Copy share.html URL
- Send via messaging apps
- QR code scans directly to signup

**Social Media**:
- Twitter/Facebook share buttons built-in
- Open Graph meta tags for rich previews
- Shareable on LinkedIn, Reddit, etc.

**Email Campaigns**:
- Direct link in email footer
- QR code in PDF attachments
- Newsletter feature highlights

**Print Materials**:
- Print QR code on flyers, posters
- Include URL on business cards
- Add to presentation slides

## 🔧 Customization

To update content:

1. **Edit HTML files** in `/public` directory:
   - `share.html` - Desktop version
   - `share-mobile.html` - Mobile version

2. **No rebuild needed** - Changes appear immediately

3. **Update metadata** in `/app/share/page.tsx` for SEO

## ✅ Testing Checklist

- [x] QR code generates correctly
- [x] All share buttons work
- [x] Responsive on mobile, tablet, desktop
- [x] Public access (no auth required)
- [x] Fast loading (<2 seconds)
- [x] All features listed
- [x] Pricing information correct
- [x] Launch offer prominent
- [x] Copy link functionality works
- [x] Toast notifications display

## 📞 Support

For questions or issues with the share pages:
- Check browser console for JavaScript errors
- Verify QR code library loads from CDN
- Test share buttons on different devices
- Ensure public route is configured in middleware

---

**Last Updated**: November 19, 2025
**Version**: 1.0
**Status**: ✅ Production Ready
