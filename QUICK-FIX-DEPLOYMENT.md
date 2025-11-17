# ⚡ Quick Fix for Deployment Issues

## 🎯 Most Common Problem: Missing `NEXT_PUBLIC_APP_URL`

Your AI features are likely failing because internal API calls don't know the correct URL on deployment.

---

## ✅ 5-Minute Fix

### Step 1: Add Environment Variable to Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Click **Settings** → **Environment Variables**
4. Add this variable:

```
Variable Name:  NEXT_PUBLIC_APP_URL
Value:          https://your-actual-domain.vercel.app
```

**IMPORTANT**: Replace `your-actual-domain.vercel.app` with your real Vercel URL

**For all environments**: Check ✅ Production, ✅ Preview, ✅ Development

5. Click **"Save"**

---

### Step 2: Verify Other Critical Variables

While you're there, verify these exist (expand each to check):

#### AI Services
- ✅ `OPENAI_API_KEY` = `sk-proj-...` (starts with sk-proj or sk-)
- ✅ `YOUTUBE_API_KEY` = `AIza...`

#### Database
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://....supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = `eyJh...`

#### Authentication
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...` (NOT pk_test_!)
- ✅ `CLERK_SECRET_KEY` = `sk_live_...` (NOT sk_test_!)

**Missing any?** Add them now with the same steps as Step 1.

---

### Step 3: Redeploy

**CRITICAL**: Environment variables only take effect after redeployment!

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**
5. Confirm with **"Redeploy"** button

**Wait 2-3 minutes** for the build to complete.

---

### Step 4: Test AI Features

After redeployment completes:

1. **Test Video Transcription**:
   - Go to your deployed app → Video Learning
   - Search for any YouTube video
   - Click "Analyze Video"
   - **Expected**: Should extract transcript and generate summary

2. **Test Flashcard Generation**:
   - Upload a document
   - Click "Generate Flashcards"
   - **Expected**: Should create flashcards in 30-60 seconds

3. **Test Podcast Generation**:
   - Select a document
   - Click "Generate Podcast"
   - **Expected**: Should generate audio in 1-3 minutes

---

## 🐛 Still Not Working?

### Check Environment Variables on Deployment

Visit this debug URL (while signed in):
```
https://your-app.vercel.app/api/debug/env-check
```

**Look for**:
- ✅ All `exists: true`
- ✅ `warnings: ["✅ All critical environment variables are configured correctly!"]`

**If you see warnings**: Fix the missing variables in Vercel and redeploy again.

---

### Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** → Latest deployment
3. Click **"View Function Logs"**
4. Try using an AI feature on your app
5. Watch logs for errors in real-time

**Common errors**:
```
❌ "API key not found" → Missing OPENAI_API_KEY or YOUTUBE_API_KEY
❌ "fetch failed localhost:3000" → Missing NEXT_PUBLIC_APP_URL
❌ "Timeout" or "Task timed out" → Already fixed with maxDuration = 300
```

---

## 📊 Expected Timeline

| Action | Time |
|--------|------|
| Add environment variables | 2 minutes |
| Redeploy on Vercel | 2-3 minutes |
| Test features | 2 minutes |
| **Total** | **~7 minutes** |

---

## 🎉 Success Checklist

After the fix, verify:

- ✅ Video transcription extracts captions from YouTube
- ✅ Flashcard generation creates cards from documents
- ✅ Podcast generation produces audio files
- ✅ Mind map generation creates concept maps
- ✅ AI chat responds to questions

---

## 🔗 Next Steps

Once everything works:

1. **Delete debug route** (security):
   ```bash
   rm app/api/debug/env-check/route.ts
   ```

2. **Review full diagnosis**: See `DEPLOYMENT-DIAGNOSIS.md` for detailed analysis

3. **Monitor usage**: Set up alerts for API rate limits

---

## 📞 Need More Help?

If AI features still don't work after this fix:

1. Check `DEPLOYMENT-DIAGNOSIS.md` for advanced debugging
2. Review Vercel function logs for specific error messages
3. Verify your Vercel plan supports `maxDuration = 300` (requires Pro plan)
4. Check OpenAI/YouTube API quotas haven't been exceeded

---

**Remember**: After ANY environment variable change, you MUST redeploy for it to take effect! 🚀
