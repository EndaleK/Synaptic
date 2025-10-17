# Setup Checklist

## ✅ Completed Steps

1. **Supabase Setup**
   - ✅ Project created: `npwtmibmwvwhqcqhmbcf`
   - ✅ API keys added to `.env.local`
   - ⚠️ **NEXT STEP**: Run SQL schema in Supabase SQL Editor

2. **OpenAI API**
   - ✅ API key configured in `.env.local`

3. **Environment Variables**
   - ✅ `.env.local` file created with:
     - OpenAI API key
     - Supabase URL
     - Supabase anon key
     - App URL

## 🔴 Required Steps

### 1. Run Database Schema
**CRITICAL**: You must run this SQL in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/npwtmibmwvwhqcqhmbcf/sql/new
2. Copy the entire contents of `supabase/schema.sql`
3. Paste into the SQL Editor
4. Click "Run" to execute
5. Verify tables are created in the Table Editor

This will create:
- `user_profiles` table
- `learning_profiles` table
- `documents` table
- `flashcards` table
- `chat_history` table
- `podcasts` table
- `mindmaps` table
- `usage_tracking` table
- All RLS policies and triggers

### 2. Set Up Clerk Authentication
**REQUIRED FOR LOGIN**: Create a Clerk account and get API keys:

1. Go to: https://clerk.com
2. Create a new application
3. Choose "Next.js" as the framework
4. Copy your keys and add to `.env.local`:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
5. In Clerk Dashboard → Paths:
   - Sign in path: `/sign-in`
   - Sign up path: `/sign-up`
   - After sign in: `/dashboard`

### 3. Configure Clerk + Supabase Integration (Optional but Recommended)
For seamless user sync:

1. In Clerk Dashboard → JWT Templates
2. Create new template for "Supabase"
3. Add the template
4. Your JWKS endpoint will be shown in the screenshot you shared

## 🚀 Testing Checklist

After completing the above steps:

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Landing Page
- Visit: http://localhost:3000
- Should see: Beautiful landing page with hero section
- ✅ Check: All images and text load
- ✅ Check: "Get Started Free" button works

### 3. Test Authentication
- Click: "Get Started Free" or "Sign Up"
- Should redirect to: Clerk sign-up page
- ✅ Create test account
- ✅ Verify redirect to `/dashboard` after sign-up

### 4. Test Learning Style Quiz
- Navigate to: http://localhost:3000/dashboard/quiz
- ✅ Answer all 10 questions
- ✅ Submit quiz
- ✅ See AI analysis and results page
- ✅ Check Supabase for stored data in `learning_profiles` table

### 5. Test Dashboard Features
- Visit: http://localhost:3000/dashboard
- ✅ Upload a document
- ✅ Generate flashcards
- ✅ Chat with document
- ✅ Verify OpenAI responses

## 🐛 Troubleshooting

### Issue: "Missing environment variables"
**Solution**:
1. Ensure `.env.local` exists in project root
2. Restart dev server after adding new variables
3. Check no typos in variable names

### Issue: "Supabase RLS error" or "401 Unauthorized"
**Solution**:
1. Verify SQL schema was run successfully
2. Check that `clerk_user_id` matches in both systems
3. Ensure RLS policies are created (from schema.sql)

### Issue: "Clerk redirect loop"
**Solution**:
1. Verify environment variables are uncommented
2. Check paths are set correctly in Clerk Dashboard
3. Restart dev server

### Issue: "OpenAI API error"
**Solution**:
1. Verify API key is correct
2. Check you have available credits at https://platform.openai.com
3. Test with a simple text document first

### Issue: Tables not found in Supabase
**Solution**:
1. Go to Supabase SQL Editor
2. Run the entire `supabase/schema.sql` file
3. Check for any error messages in the SQL output
4. Verify tables appear in Table Editor

## 📚 What Each Service Does

- **Clerk**: Handles user authentication (sign up, sign in, session management)
- **Supabase**: Stores user data, quiz results, documents, flashcards
- **OpenAI**: Powers AI features (flashcard generation, chat, learning analysis)

## 🎯 Next Steps After Setup

Once everything works:

1. **Complete Phase 2C**: Adaptive dashboard layout
2. **Phase 3**: Add podcast generation and mind maps
3. **Deploy**: Push to Vercel for production
4. **Mobile**: Use Capacitor to create iOS/Android apps

## 💡 Pro Tips

1. **Supabase Table Editor**: Use it to view stored quiz results and user data
2. **Clerk Dashboard**: Monitor user sign-ups and sessions
3. **OpenAI Usage**: Track API usage to manage costs
4. **Git**: Commit your work regularly (don't commit `.env.local`!)

## 📞 Need Help?

- Check `CLAUDE.md` for architecture details
- Review `PHASE2_COMPLETE.md` for what's been built
- See `SETUP.md` for detailed setup instructions

---

**Current Status**:
- ✅ Code complete for Phase 1 & Phase 2A/2B
- 🔴 Database schema needs to be run
- 🔴 Clerk API keys need to be added
- ⚠️ Phase 2C pending (adaptive layout)
