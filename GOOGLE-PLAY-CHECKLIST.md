# Google Play Store Submission Checklist

## ✅ Quick Reference Guide for Publishing Synaptic™

**Total Time**: 2-3 hours
**Total Cost**: $25 one-time

---

## Pre-Launch Checklist (Before Starting)

### Required Assets

- [ ] **App deployed to production** - https://synaptic.study
- [ ] **App icon** (512x512 PNG) - ✅ Available at `/public/logo-brain.png`
- [ ] **Feature graphic** (1024x500 PNG) - Create in Canva
- [ ] **Screenshots**:
  - [ ] Phone (2-8 images, 1080x1920)
  - [ ] 7" tablet (2-8 images, 1024x600)
  - [ ] 10" tablet (2-8 images, 1280x800)
- [ ] **Privacy Policy URL** - Create at https://synaptic.study/privacy
- [ ] **$25 USD** for registration fee

---

## Phase 1: Google Play Console Setup (15 min)

- [ ] **1.1** Visit https://play.google.com/console/signup
- [ ] **1.2** Sign in with Google account
- [ ] **1.3** Accept Developer Distribution Agreement
- [ ] **1.4** Pay $25 registration fee
- [ ] **1.5** Wait for account verification (24-48 hours)
- [ ] **1.6** Create new app in Play Console
  - App name: Synaptic™ - Learning That Adapts to You
  - Language: English (US)
  - Type: App
  - Free or paid: Free

**Status**: Account created ✅

---

## Phase 2: Build Android App (45 min)

### Step 2.1: Initialize TWA Project

```bash
cd android-app
bubblewrap init --manifest https://synaptic.study/site.webmanifest
```

**Interactive prompts - answer as**:
- Install JDK: **Yes**
- Domain: **synaptic.study**
- App name: **Synaptic**
- Package: **study.synaptic.twa**
- Min API: **23**
- Status bar color: **#7B3FF2**
- Display: **standalone**
- Icon URL: **https://synaptic.study/logo-brain.png**
- Version: **1.0.0**

- [ ] **2.1** Bubblewrap initialized
- [ ] **2.2** `twa-manifest.json` created
- [ ] **2.3** Configuration verified

### Step 2.2: Build App Bundle

```bash
cd android-app
bubblewrap build
```

**First build will**:
- Generate signing keystore (set password!)
- Create `android.keystore` file (**BACKUP THIS!**)
- Build `app-release-bundle.aab`

- [ ] **2.4** Keystore generated
- [ ] **2.5** Keystore backed up to safe location
- [ ] **2.6** Password saved in password manager
- [ ] **2.7** `app-release-bundle.aab` created (2-5 MB)

**Backup command**:
```bash
cp android.keystore ~/Documents/Backups/synaptic-android.keystore
```

---

## Phase 3: Digital Asset Links (15 min)

### Step 3.1: Extract SHA-256 Fingerprint

```bash
cd android-app
keytool -list -v -keystore android.keystore -alias synaptic-key
```

**Copy** the SHA256 fingerprint (with colons):
```
SHA256: AB:CD:EF:12:34:...
```

- [ ] **3.1** SHA-256 fingerprint extracted
- [ ] **3.2** Fingerprint copied to clipboard

### Step 3.2: Update assetlinks.json

Edit `/public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "study.synaptic.twa",
      "sha256_cert_fingerprints": [
        "PASTE_YOUR_FINGERPRINT_HERE"
      ]
    }
  }
]
```

- [ ] **3.3** `assetlinks.json` updated with fingerprint
- [ ] **3.4** File committed to git
- [ ] **3.5** Deployed to production

**Deploy**:
```bash
git add public/.well-known/assetlinks.json
git commit -m "feat: Add Digital Asset Links for Android"
git push origin main
```

### Step 3.3: Verify Deployment

```bash
curl https://synaptic.study/.well-known/assetlinks.json
```

- [ ] **3.6** assetlinks.json accessible via HTTPS
- [ ] **3.7** Response contains correct fingerprint

**Verification tool**: https://developers.google.com/digital-asset-links/tools/generator

---

## Phase 4: Play Console Store Listing (30 min)

### Step 4.1: Upload App Bundle

- [ ] **4.1** Navigate to: Production → Create new release
- [ ] **4.2** Upload `android-app/app-release-bundle.aab`
- [ ] **4.3** Add release name: **1.0.0 (Initial Release)**
- [ ] **4.4** Add release notes (see GOOGLE-PLAY-SETUP.md)
- [ ] **4.5** Save release (don't submit yet)

### Step 4.2: Main Store Listing

- [ ] **4.6** App name: **Synaptic™ - Learning That Adapts to You**
- [ ] **4.7** Short description (80 chars):
  ```
  AI study tools: flashcards, mock exams, podcasts, mind maps. 83% cheaper.
  ```
- [ ] **4.8** Full description (see GOOGLE-PLAY-SETUP.md)
- [ ] **4.9** App icon uploaded (512x512)
- [ ] **4.10** Feature graphic uploaded (1024x500)
- [ ] **4.11** Screenshots uploaded:
  - [ ] Phone screenshots (4-6 images)
  - [ ] 7" tablet screenshots (4-6 images)
  - [ ] 10" tablet screenshots (4-6 images)
- [ ] **4.12** Category: **Education**
- [ ] **4.13** Tags: Study, Learning, Flashcards, AI, Education
- [ ] **4.14** Contact email: support@synaptic.study
- [ ] **4.15** Website: https://synaptic.study
- [ ] **4.16** Privacy policy: https://synaptic.study/privacy

### Step 4.3: Content Rating

- [ ] **4.17** Start IARC questionnaire
- [ ] **4.18** Answer all questions (no violence, ads, etc.)
- [ ] **4.19** Submit for rating
- [ ] **4.20** Verify rating: **Everyone** or **Teen**

### Step 4.4: Target Audience

- [ ] **4.21** Target age: **13+**
- [ ] **4.22** Appeals to children: **No**
- [ ] **4.23** Contains ads: **No**
- [ ] **4.24** In-app purchases: **Yes** (Premium/Pro subscriptions)

### Step 4.5: Data Safety

- [ ] **4.25** Complete data safety form
- [ ] **4.26** Data collected: Email, name, study progress
- [ ] **4.27** Data sharing: None
- [ ] **4.28** Encryption: In transit and at rest
- [ ] **4.29** User can delete data: Yes

### Step 4.6: App Access

- [ ] **4.30** App restricted: **No**
- [ ] **4.31** Special access: **None**

---

## Phase 5: Final Review & Submit (10 min)

### Pre-Submission Checklist

- [ ] **5.1** All Play Console sections have green checkmarks
- [ ] **5.2** App bundle uploaded
- [ ] **5.3** Store listing complete
- [ ] **5.4** Screenshots uploaded (all sizes)
- [ ] **5.5** Content rating completed
- [ ] **5.6** Privacy policy URL provided
- [ ] **5.7** Data safety completed
- [ ] **5.8** Digital Asset Links verified

### Submit for Review

- [ ] **5.9** Navigate to: Production → Review release
- [ ] **5.10** Review all information
- [ ] **5.11** Click "Start rollout to Production"
- [ ] **5.12** Confirm submission

**Submitted!** 🎉

---

## Phase 6: Post-Submission (1-7 days)

### Monitor Review Status

- [ ] **6.1** Check Play Console daily
- [ ] **6.2** Monitor email for review updates
- [ ] **6.3** Review status: **Pending** → **In Review** → **Published**

**Timeline**:
- Automated checks: 1-2 hours
- Manual review: 1-7 days
- Publication: Instant (once approved)

### If Rejected

- [ ] **6.4** Read rejection email carefully
- [ ] **6.5** Fix identified issues
- [ ] **6.6** Resubmit (no additional fee)

### If Approved

- [ ] **6.7** App live on Play Store! 🚀
- [ ] **6.8** Share link: https://play.google.com/store/apps/details?id=study.synaptic.twa
- [ ] **6.9** Add "Get it on Google Play" badge to website
- [ ] **6.10** Announce on social media

---

## Post-Launch Checklist (Week 1)

### Marketing

- [ ] **7.1** Share on Twitter with screenshot
- [ ] **7.2** Post on LinkedIn
- [ ] **7.3** Share in relevant Reddit communities (r/GetStudying, r/productivity)
- [ ] **7.4** Submit to Product Hunt
- [ ] **7.5** Email existing users about Android app

### Monitoring

- [ ] **7.6** Check crash reports daily
- [ ] **7.7** Respond to user reviews within 24 hours
- [ ] **7.8** Monitor install numbers
- [ ] **7.9** Track retention metrics (Day 1, Day 7, Day 30)
- [ ] **7.10** Fix critical bugs within 48 hours

### Success Metrics (Week 1)

- [ ] 10-50 installs
- [ ] 4.5+ star rating
- [ ] 0% crash rate
- [ ] 50%+ Day 1 retention

---

## Future Updates Checklist

When releasing version 1.1.0+:

- [ ] **Update** `twa-manifest.json` version numbers
- [ ] **Run** `bubblewrap update` (pulls latest manifest)
- [ ] **Build** new AAB: `bubblewrap build`
- [ ] **Upload** to Play Console
- [ ] **Add** release notes describing changes
- [ ] **Submit** for review (faster, 1-2 days)

**Users auto-update** within 24-48 hours.

---

## Common Issues & Solutions

### ❌ Issue: "Digital Asset Links verification failed"

**Solution**:
1. Verify assetlinks.json is accessible: `curl https://synaptic.study/.well-known/assetlinks.json`
2. Check SHA-256 matches keystore
3. Wait 24 hours for cache
4. Use verification tool: https://developers.google.com/digital-asset-links/tools/generator

### ❌ Issue: "Build failed - SDK not found"

**Solution**:
```bash
bubblewrap doctor
# Follow prompts to install missing dependencies
```

### ❌ Issue: "Keystore password incorrect"

**Solution**:
- Check password manager
- If lost, generate new keystore (existing users must uninstall first)
- **Never lose production keystore!**

### ❌ Issue: "App crashes on startup"

**Debug**:
1. Test Digital Asset Links are verified
2. Ensure PWA deployed and accessible
3. Check crash reports in Play Console
4. Test locally with Android Studio

---

## Quick Commands Reference

```bash
# Initialize TWA project
cd android-app
bubblewrap init --manifest https://synaptic.study/site.webmanifest

# Build app bundle
bubblewrap build

# Update after PWA changes
bubblewrap update
bubblewrap build

# Extract SHA-256 fingerprint
keytool -list -v -keystore android.keystore -alias synaptic-key

# Verify Digital Asset Links
curl https://synaptic.study/.well-known/assetlinks.json

# Check Bubblewrap installation
bubblewrap doctor

# Build script (if created)
./build-android.sh
```

---

## Files Created

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `android-app/twa-manifest.json` | TWA configuration | ❌ No (gitignored) |
| `android-app/android.keystore` | Signing key | ❌ **NEVER** (backup securely!) |
| `android-app/app-release-bundle.aab` | Upload to Play Store | ❌ No (gitignored) |
| `public/.well-known/assetlinks.json` | Digital Asset Links | ✅ **Yes** (required for verification) |
| `build-android.sh` | Build automation | ✅ Yes |

---

## Resources

- **Full guide**: [GOOGLE-PLAY-SETUP.md](GOOGLE-PLAY-SETUP.md)
- **Bubblewrap docs**: https://github.com/GoogleChromeLabs/bubblewrap
- **Play Console**: https://play.google.com/console
- **Digital Asset Links**: https://developers.google.com/digital-asset-links
- **Verification tool**: https://developers.google.com/digital-asset-links/tools/generator

---

## Progress Tracking

**Started**: __________
**Google Account Created**: __________
**Registration Fee Paid**: __________
**App Bundle Built**: __________
**Submitted for Review**: __________
**Published**: __________

**App Link**: https://play.google.com/store/apps/details?id=study.synaptic.twa

---

**Status**: Ready to start
**Estimated completion**: 2-3 hours
**Next step**: Create Google Play Developer account

**Let's get Synaptic™ on Google Play! 📱**
