# Synaptic™ Trademark Usage Guidelines

## Trademark Status

**Synaptic™** is a pending trademark of [Your Company Name].
**Trademark Symbol**: ™ (Common Law Trademark - pending USPTO registration)
**When registered**: Change to ® (Registered Trademark)

---

## When to Use the ™ Symbol

### ✅ **ALWAYS Use ™ Symbol:**

1. **First Prominent Mention** on each page/document
   - First time "Synaptic" appears in body text
   - Page titles and headings
   - Meta descriptions and SEO tags

2. **Legal and Official Documents**
   - Copyright notices: `© 2025 Synaptic™. All rights reserved.`
   - Terms of Service
   - Privacy Policy
   - Licensing agreements

3. **Marketing Materials**
   - Landing pages (hero section)
   - Email campaigns (subject lines, sender names)
   - Social media bios
   - Press releases
   - Advertisements

4. **Logo Files**
   - SVG logo text: `Synaptic™`
   - Image alt text: `Synaptic™`
   - Favicons and app icons (where text appears)

5. **Branded Communications**
   - Email sender names: `Synaptic™ <hello@synaptic.study>`
   - Email footers
   - Product packaging (if applicable)

### ⚠️ **Optional (Use Sparingly):**

1. **Body Text** - Only first mention, then plain "Synaptic"
2. **Internal Documentation** - Not required for README, code comments
3. **Informal Communication** - Blog posts, social media posts (after first use)

### ❌ **NEVER Use ™ Symbol:**

1. **Code and Technical**
   - Variable names: `const synaptic = ...`
   - Function names: `getSynapticData()`
   - API endpoints: `/api/synaptic/...`
   - Database table names
   - Package.json name field (must be lowercase)

2. **URLs and Domains**
   - Domain name: `synaptic.study` (not `synaptic™.study`)
   - Subdomain: `app.synaptic.study`
   - Email addresses: `hello@synaptic.study`

3. **File Names**
   - `synaptic-logo.svg` (not `synaptic™-logo.svg`)
   - `synaptic-app.tsx`

---

## Implementation Locations

### High Priority (User-Facing)

**✅ Logo SVG Files**:
- `/public/logo.svg` - Line 67: `Synaptic™`
- `/public/logo-dashboard.svg` - Line 57: `Synaptic™`

**✅ Metadata & SEO** ([app/layout.tsx](app/layout.tsx)):
- Line 23: Page title - `Synaptic™ - Learning That Adapts to You`
- Line 47-49: Authors, creator, publisher - `Synaptic™`
- Line 60: OpenGraph title - `Synaptic™`
- Line 63: OpenGraph siteName - `Synaptic™`
- Line 77: Twitter title - `Synaptic™ - Study Smarter, Not Harder`

**✅ Footer Copyright** ([app/(marketing)/layout.tsx](app/(marketing)/layout.tsx)):
- Line 177: `© 2025 Synaptic™. All rights reserved.`

**✅ Email Communications** ([lib/email/](lib/email/)):
- [client.ts](lib/email/client.ts) Line 23-24: Sender names
  - `Synaptic™ <hello@synaptic.study>`
  - `Synaptic™ Support <support@synaptic.study>`
- [send.ts](lib/email/send.ts) - Subject lines:
  - Line 26: `Welcome to Synaptic™`
  - Line 53: `Welcome to Synaptic™ Premium!`
  - Line 91: `Payment Receipt - Synaptic™ Subscription`
  - Line 129: `Payment Failed for Synaptic™ Subscription`

**✅ PWA Manifest** ([public/site.webmanifest](public/site.webmanifest)):
- Line 2: `"name": "Synaptic™ - Learning That Adapts to You"`
- Line 3: `"short_name": "Synaptic™"`

**✅ Landing Page** ([app/page.tsx](app/page.tsx)):
- Line 28: Logo alt text - `Synaptic™ - Study Smarter`
- Line 44: First prominent mention - `Synaptic™ adapting to your learning style`

---

## Proper Usage Examples

### ✅ Correct Usage

```markdown
# Page Title
Synaptic™ - Learning That Adapts to You

# First Paragraph
Welcome to Synaptic™! Our platform helps you study smarter with AI-powered tools.
Synaptic offers 8 intelligent learning modes...

# Copyright
© 2025 Synaptic™. All rights reserved.
```

```html
<!-- Email Subject -->
Welcome to Synaptic™ - Your AI-Powered Learning Platform

<!-- Email Sender -->
From: Synaptic™ <hello@synaptic.study>

<!-- Logo Alt Text -->
<img src="/logo.svg" alt="Synaptic™ - Study Smarter" />
```

### ❌ Incorrect Usage

```markdown
# Wrong: Every mention
Welcome to Synaptic™! Synaptic™ helps you study. With Synaptic™, you can...

# Wrong: In code
const synaptic™Data = getSynaptic™Info()

# Wrong: In URLs
https://synaptic™.study
```

---

## Brand Voice & Messaging

When using "Synaptic™" in marketing copy:

### Core Messaging
- **Tagline**: "Learning That Adapts to You"
- **Value Proposition**: AI-powered personalized learning with 8 intelligent tools
- **Key Differentiators**:
  - Supports 500MB+ documents
  - 83% cheaper than competitors
  - Research-backed spaced repetition

### Tone Guidelines
- **Professional but approachable**: Not overly formal, not too casual
- **Empowering**: Focus on user success and learning outcomes
- **Innovative**: Emphasize AI and personalization
- **Educational**: Explain value, not just features

### Brand Adjectives
- Intelligent
- Adaptive
- Personalized
- Comprehensive
- Affordable
- Powerful

---

## Legal Disclaimers

### Required Notices

**On Website Footer**:
```
Synaptic™ and the Synaptic logo are pending trademarks of [Your Company Name].
All rights reserved.
```

**In Terms of Service**:
```
"Synaptic," the Synaptic logo, and other marks are trademarks of [Your Company Name].
You may not use these marks without our prior written permission.
```

### Third-Party Usage

If allowing partners/affiliates to use "Synaptic™":
- Must include ™ symbol
- Must link to https://synaptic.study
- Cannot modify logo or brand name
- Cannot imply endorsement without permission

---

## Trademark Symbol Reference

| Symbol | Meaning | When to Use |
|--------|---------|-------------|
| **™** | Trademark (Common Law) | Pending USPTO registration (CURRENT) |
| **®** | Registered Trademark | After USPTO approval (FUTURE) |
| **℠** | Service Mark | For services (alternative to ™) |

**Current Status**: Use **™** until trademark is registered
**Future**: Change all ™ to ® once USPTO grants registration

---

## File Checklist

Files updated with ™ symbol:

- [x] `/public/logo.svg`
- [x] `/public/logo-dashboard.svg`
- [x] `/components/Logo.tsx` (alt text)
- [x] `/app/layout.tsx` (metadata)
- [x] `/app/(marketing)/layout.tsx` (header, footer)
- [x] `/app/page.tsx` (landing page)
- [x] `/lib/email/client.ts` (sender names)
- [x] `/lib/email/send.ts` (subject lines)
- [x] `/public/site.webmanifest` (PWA)

Files that should NOT have ™:
- [x] `/package.json` (npm name must be lowercase)
- [x] Code files (variable names, functions)
- [x] API routes
- [x] Database schemas

---

## When Trademark is Registered

Once USPTO approves your trademark application:

### 1. **Global Find & Replace**
```bash
# Replace ™ with ® in all relevant files
find ./app ./lib ./public -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.json" -o -name "*.svg" \) -exec sed -i '' 's/Synaptic™/Synaptic®/g' {} +
```

### 2. **Update Legal Notices**
- Change "pending trademark" to "registered trademark"
- Add USPTO registration number
- Update Terms of Service and Privacy Policy

### 3. **Add Registration Details**
```
Synaptic® is a registered trademark of [Your Company Name].
U.S. Registration No. [NUMBER]
```

---

## Resources

- **USPTO Trademark Search**: https://tmsearch.uspto.gov/
- **Trademark Filing**: https://www.uspto.gov/trademarks
- **Brand Guidelines**: [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md)
- **Logo Assets**: `/public/` directory

---

## Questions?

For trademark usage questions, contact:
- **Legal**: legal@synaptic.study
- **Marketing**: hello@synaptic.study
- **Brand Guidelines**: See [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md)

---

**Last Updated**: 2025-01-16
**Next Review**: Upon USPTO trademark registration
