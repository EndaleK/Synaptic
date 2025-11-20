# How to Clear PWA Cache and See New Transparent Icons

## ✅ Icons Are Transparent - It's Just a Cache Issue!

All icons have been verified as transparent:
- icon-192x192.png: 72.44% transparent pixels
- icon-512x512.png: 71.07% transparent pixels
- apple-touch-icon.png: 71.44% transparent pixels
- favicon-16x16.png: 100% transparent
- favicon-32x32.png: 93.36% transparent

**The white backgrounds you see on production are from cached old icons.**

---

## 🔄 Clear Cache on Desktop (Chrome/Edge/Brave)

### Method 1: Hard Refresh
1. Visit `synaptic.study`
2. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Or: Open DevTools → Right-click refresh → "Empty Cache and Hard Reload"

### Method 2: Clear Service Worker (Recommended)
1. Visit `synaptic.study`
2. Open DevTools (F12)
3. Go to **Application** tab
4. Click **Service Workers** in sidebar
5. Click **Unregister** next to the service worker
6. Click **Storage** in sidebar
7. Check all boxes and click **Clear site data**
8. Close DevTools and refresh the page
9. **New transparent icons will load!**

### Method 3: Clear Browser Cache
1. Chrome: `Settings` → `Privacy and security` → `Clear browsing data`
2. Select `Cached images and files`
3. Clear data
4. Revisit `synaptic.study`

---

## 📱 Clear Cache on Mobile

### Android (Chrome/Edge)
1. Go to `chrome://settings/siteData`
2. Search for `synaptic.study`
3. Tap the trash icon
4. Revisit the site

Or:
1. Long-press the Synaptic app icon
2. Tap "App info"
3. Tap "Storage"
4. Tap "Clear cache" and "Clear data"
5. Uninstall and reinstall the PWA

### iOS (Safari)
1. Go to `Settings` → `Safari`
2. Tap "Clear History and Website Data"
3. Or: Uninstall PWA from home screen
4. Revisit `synaptic.study` in Safari
5. Reinstall via "Add to Home Screen"

---

## ⏰ Automatic Update (For Users)

Users don't need to do anything! The service worker will auto-update within **24 hours**:

1. Service worker version bumped: `v1` → `v2`
2. Manifest cache-busted: `?v=2` parameter added
3. Old caches auto-cleared on next visit
4. New transparent icons loaded automatically

**Most users will see the new icons within 1-2 days without any action.**

---

## 🧪 Verify Icons Are Working

After clearing cache:

1. Visit `synaptic.study`
2. Look at browser tab icon (should be transparent)
3. If PWA installed: Check home screen icon
4. Enable dark mode - no white box should appear!

---

## 🛠️ For Developers

Verify transparency locally:
```bash
node scripts/verify-transparent-icons.js
```

Check deployed icons:
```bash
curl -I https://synaptic.study/icon-192x192.png
# Should return 200 OK with updated file
```

---

## ❓ Why Does This Happen?

PWAs aggressively cache icons and manifests for performance:
- Browser caches icons for 7-30 days
- Service workers cache assets indefinitely
- iOS Safari caches icons permanently until PWA reinstalled

**This is normal PWA behavior!** The trade-off for offline functionality.

---

## ✅ Summary

**The icons ARE transparent** - verified at 72-100% transparency.

**On production**, they'll update:
- **Immediately** after clearing cache
- **Within 24 hours** automatically for most users
- **Eventually** for all users as browsers refresh cache

**After Vercel deployment completes**, new users will see transparent icons immediately!
