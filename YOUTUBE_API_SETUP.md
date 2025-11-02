# YouTube API Setup Guide

## ⚠️ Issue: "Requests to this API are blocked"

If you're seeing this error:
```
Error: Requests to this API youtube method youtube.api.v3.V3DataSearchService.List are blocked.
```

This means your YouTube API key needs proper configuration. Follow these steps:

---

## 🔧 Step-by-Step Setup

### 1. **Go to Google Cloud Console**
Visit: https://console.cloud.google.com/

### 2. **Select or Create a Project**
- Click the project dropdown at the top
- Either select an existing project or click "New Project"
- Give it a name like "Synapse Learning App"
- Click "Create"

### 3. **Enable YouTube Data API v3**

**Option A: Direct Link (Easiest)**
- Visit: https://console.cloud.google.com/apis/library/youtube.googleapis.com
- Make sure your project is selected
- Click **"ENABLE"**

**Option B: Manual Navigation**
1. Go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it
4. Click **"ENABLE"**

### 4. **Create API Credentials**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Your API key will be created and displayed
4. **IMPORTANT**: Copy this key immediately!

### 5. **Configure API Key (Optional but Recommended)**

Click "EDIT API KEY" or the key name to configure:

#### **Application Restrictions:**
- Select "HTTP referrers (websites)"
- Add these referrers:
  ```
  http://localhost:3000/*
  http://localhost:*/*
  https://yourdomain.com/*  (for production)
  ```

#### **API Restrictions:**
- Select "Restrict key"
- Check only: **YouTube Data API v3**
- Click "Save"

### 6. **Update Your Environment Variable**

Open your `.env.local` file and update:
```bash
YOUTUBE_API_KEY=YOUR_NEW_API_KEY_HERE
```

### 7. **Restart Your Development Server**

```bash
# Kill any running servers
pkill -9 -f "next dev"

# Start fresh
npm run dev
```

---

## 📊 Quota Information

**Free Tier Limits:**
- **10,000 units per day**
- Search request: **100 units** (allows ~100 searches/day)
- Video details: **1 unit** per video
- **No credit card required** for free tier

**Cost Estimates (if you exceed free tier):**
- $0 for first 10,000 units/day
- Additional quota: $0.20 per 1,000 units (very cheap!)

---

## 🧪 Test Your API Key

You can test if your API key works with this curl command:

```bash
# Replace YOUR_API_KEY with your actual key
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=YOUR_API_KEY"
```

**Expected Response:**
- ✅ Success: JSON with video results
- ❌ Error 403: API not enabled or key restricted
- ❌ Error 400: "API key not valid" - check your key

---

## 🔍 Troubleshooting

### Error: "API key not valid"
- **Solution**: Double-check you copied the entire key correctly
- Make sure there are no extra spaces
- The key should look like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Error: "YouTube Data API has not been used in project"
- **Solution**: Go back to step 3 and enable the YouTube Data API v3
- Make sure you're enabling it for the correct project

### Error: "The request is missing a valid API key"
- **Solution**: Check your `.env.local` file
- Make sure the variable is named exactly: `YOUTUBE_API_KEY`
- Restart your dev server after changing environment variables

### Error: "Requests to this API are blocked" (API Restrictions)
- **Solution**: Edit your API key restrictions
- Either:
  - Remove API restrictions temporarily for testing, OR
  - Make sure "YouTube Data API v3" is checked in the allowed APIs list

### Error: "Quota exceeded"
- **Solution**: You've hit the 10,000 units/day limit
- Wait until the next day (quota resets at midnight Pacific Time)
- Or enable billing in Google Cloud to get additional quota

---

## 🎯 Current API Key Status

**Your Current Key:** `AIzaSyCgvBE_48kXyInvQ4guNkiwijLBhGvQz70`

**Likely Issues:**
1. ❌ YouTube Data API v3 is not enabled for this project
2. ❌ API key has restrictions that block the search method
3. ❌ Project quota might be disabled

**Recommended Action:**
1. Check if API is enabled: https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. If not enabled, click "ENABLE"
3. Test again

---

## 📝 Alternative: Create a New API Key

If you're still having issues, create a fresh API key:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your existing key: `AIzaSyCgvBE_48kXyInvQ4guNkiwijLBhGvQz70`
3. Click the trash icon to delete it
4. Click **"+ CREATE CREDENTIALS"** → **"API key"**
5. Leave it unrestricted for now (you can add restrictions later)
6. Copy the new key
7. Update `.env.local`
8. Restart server

---

## ✅ Verification Checklist

Before using the Video feature, verify:

- [ ] Project created in Google Cloud Console
- [ ] YouTube Data API v3 is **ENABLED**
- [ ] API key created
- [ ] API key copied to `.env.local`
- [ ] Development server restarted
- [ ] Test curl command returns video results

---

## 💡 Pro Tips

1. **Use API Restrictions**: Once working, restrict your key to only YouTube Data API v3 for security
2. **Monitor Usage**: Check quota usage at https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
3. **Set Budget Alerts**: In Google Cloud Console → Billing → Budgets to avoid surprises
4. **Multiple Keys**: Create separate keys for development and production

---

## 🆘 Still Having Issues?

If you've followed all steps and still see errors:

1. Check Google Cloud Console status: https://status.cloud.google.com/
2. Verify your Google account has billing enabled (even if using free tier)
3. Try creating a completely new project
4. Contact Google Cloud Support (they're very helpful!)

---

## 📚 Official Documentation

- YouTube Data API v3: https://developers.google.com/youtube/v3
- API Console: https://console.cloud.google.com/
- Quota Costs: https://developers.google.com/youtube/v3/determine_quota_cost
