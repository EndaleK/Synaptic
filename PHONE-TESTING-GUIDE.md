# 📱 How to Test the App on Your Phone

This guide covers all methods to test Synaptic™ on your mobile device, from quick local testing to production deployment.

---

## 🚀 Quick Start: Test Production App (Easiest)

**Time**: 2 minutes  
**Best for**: Testing the live app as users experience it

### Steps:

1. **On your phone**, open a browser:
   - **Android**: Chrome, Edge, or Samsung Internet
   - **iOS**: Safari (required for PWA features)

2. **Visit**: `https://synaptic.study`

3. **Test the app**:
   - Navigate through pages
   - Test touch interactions
   - Try uploading documents
   - Test all study tools

4. **Install as PWA** (optional):
   - **Android**: Tap "Install" banner when it appears
   - **iOS**: Tap Share → "Add to Home Screen"

**✅ Done!** You're testing the production app.

---

## 🏠 Method 1: Local Network Testing (Recommended for Development)

**Time**: 5 minutes  
**Best for**: Testing local changes on your phone before deploying

### Prerequisites:
- Your phone and computer on the **same WiFi network**
- Development server running on your computer

### Steps:

#### Step 1: Find Your Computer's IP Address

**On Mac:**
```bash
# Open Terminal and run:
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for something like: 192.168.1.100 or 10.0.0.4
```

**On Windows:**
```bash
# Open Command Prompt and run:
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

**On Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

#### Step 2: Start Dev Server on Network Interface

**Option A: Use Next.js directly (default port 3000)**
```bash
# Make sure Next.js binds to all interfaces (0.0.0.0)
npx next dev -H 0.0.0.0
```

**Option B: Use your custom start script**
```bash
# Edit start-dev.js to bind to 0.0.0.0, or use:
HOST=0.0.0.0 npm run dev
```

#### Step 3: Access from Your Phone

1. **On your phone**, open a browser
2. **Visit**: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`
   - Example: `http://10.0.0.4:3000`

3. **Test the app** - it should work just like localhost!

### Troubleshooting:

**"Can't connect" error:**
- ✅ Check both devices are on same WiFi
- ✅ Check firewall isn't blocking port 3000
- ✅ Verify IP address is correct
- ✅ Try disabling VPN on either device

**"Connection refused":**
- ✅ Make sure dev server is running
- ✅ Check server is bound to `0.0.0.0` not `127.0.0.1`
- ✅ Verify port number matches

**For HTTPS (required for some PWA features):**
```bash
# Install local-ssl-proxy
npm install -g local-ssl-proxy

# In one terminal, start your dev server:
npm run dev

# In another terminal, start SSL proxy:
local-ssl-proxy --source 3006 --target 3000

# On phone, visit: https://YOUR_IP:3006
# (You'll need to accept the self-signed certificate)
```

---

## 🌐 Method 2: ngrok Tunnel (Test from Anywhere)

**Time**: 10 minutes  
**Best for**: Testing on phone when not on same network, or sharing with others

### Steps:

#### Step 1: Install ngrok

```bash
# Install globally
npm install -g ngrok

# Or download from: https://ngrok.com/download
```

#### Step 2: Start Your Dev Server

```bash
npm run dev
# Server should be running on http://localhost:3000
```

#### Step 3: Create ngrok Tunnel

```bash
# In a new terminal:
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

#### Step 4: Access from Phone

1. **Copy the HTTPS URL** from ngrok (e.g., `https://abc123.ngrok.io`)
2. **On your phone**, open browser and visit that URL
3. **Test the app** - works from anywhere!

### Free ngrok Limitations:
- URL changes each time you restart ngrok
- 40 connections/minute limit
- Connection timeout after inactivity

### Paid ngrok Benefits:
- Custom domain
- No connection limits
- Reserved URLs

---

## 🔧 Method 3: Vercel Preview Deployment

**Time**: 15 minutes  
**Best for**: Testing production-like environment with HTTPS

### Steps:

#### Step 1: Push to GitHub

```bash
git add .
git commit -m "Test mobile features"
git push origin main
```

#### Step 2: Vercel Auto-Deploys

- Vercel automatically creates a preview URL
- Check your Vercel dashboard for the URL
- Or check GitHub PR for preview link

#### Step 3: Test on Phone

1. **On your phone**, visit the Vercel preview URL
2. **Test all features** - full production environment
3. **Install as PWA** if needed

**✅ Benefits:**
- Real HTTPS (required for PWA)
- Production-like performance
- Easy to share with team/testers

---

## 📲 Method 4: Install as PWA (Full App Experience)

**Time**: 5 minutes  
**Best for**: Testing the installed app experience

### Android (Chrome/Edge):

1. Visit `https://synaptic.study` (or your test URL)
2. Wait for "Install" banner to appear
3. Tap **"Install"**
4. App installs like a native app
5. Open from home screen icon

### iOS (Safari Only):

1. Visit `https://synaptic.study` in **Safari** (not Chrome!)
2. Tap **Share button** (□↑ icon)
3. Scroll down → Tap **"Add to Home Screen"**
4. Edit name if desired
5. Tap **"Add"**
6. App icon appears on home screen

### Testing Installed PWA:

- ✅ Opens in full-screen (no browser UI)
- ✅ Works offline (cached content)
- ✅ Faster loading
- ✅ Appears in app switcher

---

## 🧪 Method 5: Browser DevTools (Quick UI Check)

**Time**: 2 minutes  
**Best for**: Quick responsive design check (not full testing)

### Steps:

1. **Open Chrome DevTools** (F12)
2. **Click device toggle** (📱 icon) or press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. **Select device** from dropdown (iPhone, Pixel, etc.)
4. **Test responsive layout**

**⚠️ Limitations:**
- Doesn't test touch gestures accurately
- Doesn't test PWA installation
- Doesn't test real network conditions
- Use for quick checks only

---

## 📋 Testing Checklist

When testing on your phone, verify:

### Basic Functionality:
- [ ] App loads without errors
- [ ] Navigation works (taps, swipes)
- [ ] Forms are usable (keyboard appears correctly)
- [ ] Text is readable (no tiny fonts)
- [ ] Buttons are tappable (not too small)
- [ ] Scrolling is smooth

### PWA Features:
- [ ] Install prompt appears (if not installed)
- [ ] App installs successfully
- [ ] Installed app opens in standalone mode
- [ ] Offline mode works (after first load)
- [ ] Icons display correctly

### Study Tools:
- [ ] Flashcard creation works
- [ ] Document upload works
- [ ] AI generation works
- [ ] Study sessions are usable
- [ ] Statistics display correctly

### Performance:
- [ ] Pages load in < 3 seconds
- [ ] No lag when scrolling
- [ ] Images load properly
- [ ] No memory leaks (app doesn't slow down over time)

---

## 🔍 Debugging on Mobile

### View Console Logs:

**Android (Chrome):**
1. Connect phone via USB
2. Enable USB debugging in phone settings
3. Open Chrome → `chrome://inspect`
4. Click "Inspect" next to your device
5. View console logs in DevTools

**iOS (Safari):**
1. On iPhone: Settings → Safari → Advanced → Web Inspector (ON)
2. Connect iPhone to Mac via USB
3. On Mac: Safari → Develop → [Your iPhone] → [Your Tab]
4. View console logs in Safari DevTools

### Network Debugging:

**Android:**
- Use Chrome DevTools Network tab (via USB debugging)
- Or use `chrome://inspect` → Network tab

**iOS:**
- Use Safari Web Inspector → Network tab
- Or use Charles Proxy / Proxyman

### Common Mobile Issues:

**"White screen" or blank page:**
- Check console for JavaScript errors
- Verify HTTPS is working (required for PWA)
- Clear browser cache

**"Install button doesn't appear":**
- Must be on HTTPS (not HTTP)
- Must meet PWA installability criteria
- Check manifest file is valid

**"Slow performance":**
- Check network tab for large files
- Verify images are optimized
- Check for memory leaks in console

---

## 🎯 Recommended Testing Workflow

### For Quick Testing:
1. **Use Method 1** (Local Network) - fastest for development
2. Test basic functionality
3. Fix issues
4. Repeat

### For Pre-Launch Testing:
1. **Use Method 3** (Vercel Preview) - production-like
2. Test on multiple devices (Android + iOS)
3. Test PWA installation
4. Test offline functionality
5. Get feedback from beta testers

### For Production Verification:
1. **Use Quick Start** (Production URL)
2. Test on real user devices
3. Monitor Sentry for errors
4. Check analytics for issues

---

## 🆘 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Can't connect via local network | Check WiFi, firewall, IP address |
| PWA won't install | Must use HTTPS, check manifest |
| App is slow | Check network tab, optimize images |
| White screen | Check console for errors |
| Touch not working | Test on real device, not emulator |
| Offline not working | Verify service worker is active |

---

## 📚 Related Documentation

- **[HOW-TO-INSTALL-PWA.md](HOW-TO-INSTALL-PWA.md)** - Detailed PWA installation guide
- **[PWA-SETUP.md](PWA-SETUP.md)** - PWA configuration and testing
- **[MOBILE-DISTRIBUTION-STRATEGY.md](MOBILE-DISTRIBUTION-STRATEGY.md)** - Mobile app strategy
- **[ANDROID-QUICK-START.md](ANDROID-QUICK-START.md)** - Building Android app

---

## ✅ Quick Command Reference

```bash
# Start dev server accessible on network
HOST=0.0.0.0 npm run dev

# Or with Next.js directly
npx next dev -H 0.0.0.0

# Find your IP address (Mac/Linux)
ifconfig | grep "inet " | grep -v 127.0.0.1

# Find your IP address (Windows)
ipconfig

# Start ngrok tunnel
ngrok http 3000

# Build for production testing
npm run build && npm start
```

---

**Ready to test?** Start with **Method 1** (Local Network) for the fastest development workflow! 🚀

