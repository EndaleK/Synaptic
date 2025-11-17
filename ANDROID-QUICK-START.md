# Android App - Quick Start Guide

## 🚀 Get Synaptic™ on Google Play in 2-3 Hours

**What you're building**: A native Android app that wraps your PWA using Trusted Web Activity (TWA)
**Cost**: $25 one-time registration
**Result**: Listed on Google Play Store

---

## ⚡ Fast Track (Step-by-Step)

### Step 1: Pay Google $25 (5 minutes)

1. Visit: https://play.google.com/console/signup
2. Sign in, pay $25, wait for verification (24-48 hours)

**Done?** ✅ Move to Step 2

---

### Step 2: Initialize Android App (10 minutes)

```bash
# Navigate to android-app directory
cd android-app

# Initialize TWA project
bubblewrap init --manifest https://synaptic.study/site.webmanifest
```

**Answer prompts**:
- Install JDK: `Yes`
- Domain: `synaptic.study`
- Package: `study.synaptic.twa`
- All other settings: Accept defaults

**Done?** ✅ You now have `twa-manifest.json`

---

### Step 3: Build App Bundle (15 minutes)

```bash
# Still in android-app directory
bubblewrap build
```

**This will**:
1. Generate signing keystore (create password!)
2. Build `app-release-bundle.aab` (the file you'll upload)

**IMPORTANT**: Back up `android.keystore`!
```bash
cp android.keystore ~/Documents/Backups/synaptic-android.keystore
```

**Done?** ✅ You have `app-release-bundle.aab` (~2-5 MB)

---

### Step 4: Setup Digital Asset Links (10 minutes)

```bash
# Extract SHA-256 fingerprint
cd android-app
keytool -list -v -keystore android.keystore -alias synaptic-key
```

**Copy** the SHA256 line (looks like `AB:CD:EF:12:...`)

**Edit** `/public/.well-known/assetlinks.json`:
- Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT_FROM_KEYSTORE`
- With your copied fingerprint

**Deploy**:
```bash
git add public/.well-known/assetlinks.json
git commit -m "feat: Add Digital Asset Links for Android"
git push origin main
```

**Verify** (wait 2 mins for deployment):
```bash
curl https://synaptic.study/.well-known/assetlinks.json
```

**Done?** ✅ Returns JSON with your fingerprint

---

### Step 5: Create Play Store Listing (30 minutes)

**Assets needed**:
- App icon (512x512) - ✅ You have `/public/logo-brain.png`
- Feature graphic (1024x500) - Create in Canva
- Screenshots (phone + tablets) - Use Chrome DevTools

**In Play Console**:

1. **Production** → Create release → Upload `app-release-bundle.aab`
2. **Main store listing**:
   - Name: Synaptic™ - Learning That Adapts to You
   - Short: AI study tools: flashcards, mock exams, podcasts
   - Full description: (see GOOGLE-PLAY-SETUP.md)
   - Upload icon, graphic, screenshots
3. **Content rating**: Start IARC → Answer questions → Submit
4. **Target audience**: Age 13+, No ads
5. **Data safety**: Email, name, study progress collected

**Done?** ✅ All sections have green checkmarks

---

### Step 6: Submit for Review (5 minutes)

1. **Production** → Review release
2. Verify all green checkmarks
3. **Start rollout to Production**
4. Confirm submission

**Done!** 🎉

**What happens next**:
- Automated checks: 1-2 hours
- Manual review: 1-7 days
- Publication: Instant once approved

---

## 📱 Monitoring After Submission

**Check status**: https://play.google.com/console → Publishing overview

**When approved**:
- App goes live immediately
- Share link: `https://play.google.com/store/apps/details?id=study.synaptic.twa`
- Add Google Play badge to website

**If rejected**:
- Fix issues mentioned in email
- Resubmit (no additional fee)

---

## 🔄 Updating Your App (Future Releases)

When you update your PWA and want to release v1.1.0:

```bash
cd android-app

# Update twa-manifest.json version
# "appVersionName": "1.1.0"
# "appVersionCode": 2

bubblewrap update  # Pulls latest manifest from web
bubblewrap build   # Builds new AAB

# Upload to Play Console → Submit
```

Users auto-update within 24-48 hours. ✅

---

## 📚 Complete Documentation

- **Full guide**: [GOOGLE-PLAY-SETUP.md](GOOGLE-PLAY-SETUP.md) - Comprehensive 50-page guide
- **Checklist**: [GOOGLE-PLAY-CHECKLIST.md](GOOGLE-PLAY-CHECKLIST.md) - Task-by-task checklist

---

## 🆘 Common Issues

### "Digital Asset Links verification failed"

**Fix**:
```bash
curl https://synaptic.study/.well-known/assetlinks.json
# Should return JSON with fingerprint
```

If not working:
1. Verify file committed and deployed
2. Check SHA-256 matches keystore
3. Wait 24 hours for Google's cache

### "Build failed - SDK not found"

**Fix**:
```bash
bubblewrap doctor
# Follow prompts to install dependencies
```

### "Lost keystore password"

**Bad news**: Can't recover
**Solution**: Generate new keystore (but existing users must uninstall first)
**Prevention**: Save in password manager NOW!

---

## ✅ Success Checklist

- [x] Bubblewrap installed
- [ ] Google Play account created ($25 paid)
- [ ] TWA project initialized
- [ ] App bundle built (AAB file)
- [ ] Keystore backed up securely
- [ ] Digital Asset Links deployed
- [ ] Screenshots created
- [ ] Play Console listing completed
- [ ] Submitted for review
- [ ] App published! 🎉

---

## 💰 Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| Google Play registration | $25 | One-time, lifetime |
| Bubblewrap CLI | Free | Open source |
| App hosting | $0 | Uses your existing PWA |
| Annual fees | $0 | No yearly cost |
| **Total** | **$25** | One-time only |

---

## 🎯 Next Steps

1. **Right now**: Create Google Play account → Pay $25
2. **Tomorrow** (after verification): Initialize TWA → Build AAB
3. **Day 3**: Upload to Play Console → Submit
4. **Week 2**: App approved → Goes live! 🚀

---

**Questions?** See [GOOGLE-PLAY-SETUP.md](GOOGLE-PLAY-SETUP.md) for detailed instructions.

**Ready to start?** Run:
```bash
cd android-app
bubblewrap init --manifest https://synaptic.study/site.webmanifest
```

**Let's get Synaptic™ on Android! 📱**
