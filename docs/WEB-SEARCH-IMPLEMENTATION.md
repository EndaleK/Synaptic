# Study Buddy Web Search Implementation

## Overview

Study Buddy can now search the web to answer questions about current events, recent research, and real-time information. The feature uses the **Tavily AI API** for optimized search results and includes intelligent detection of when to search.

## What Was Implemented

### 1. Core Web Search Module (`lib/web-search.ts`)

**Functions:**
- `searchWeb()` - Calls Tavily API to search the web
- `formatSearchResultsForAI()` - Formats results for AI context injection
- `shouldSearchWeb()` - Detects if a query needs web search using heuristics
- `extractCitations()` - Creates citation strings for sources

**Features:**
- Automatic detection of current event queries (keywords: "latest", "recent", "2025", etc.)
- Excludes document-specific questions from web search
- Returns top 5 results with title, URL, content, and relevance score
- Cost-effective: Basic search depth ($0.01 per search)

### 2. Backend Integration (`app/api/study-buddy/chat/route.ts`)

**Changes:**
- Added web search logic before AI provider call
- Injects search results into system prompt
- Appends source citations to AI response
- Graceful degradation if search fails
- Feature flag: Only runs if `TAVILY_API_KEY` is set

**Flow:**
1. Check if user message needs web search
2. Call Tavily API if needed
3. Format results and inject into system prompt
4. AI generates response using search context
5. Append source citations to response

### 3. UI Enhancements (`components/StudyBuddy/StudyBuddyInterface.tsx`)

**Visual Feedback:**
- **Loading Indicator**: Shows "🔍 Searching the web..." when web search is detected
- **Globe Icon**: Animated pulse icon during search
- **Source Citations**: Automatically displayed at end of assistant messages

**User Experience:**
- Seamless integration - no extra buttons or manual triggers
- Automatic detection based on question type
- Citations formatted as markdown links

## How to Test

### Step 1: Get Tavily API Key

1. Go to https://tavily.com
2. Sign up for a free account (1,000 searches/month)
3. Create an API key from the dashboard
4. Copy the API key

### Step 2: Configure Environment

Add to your `.env.local` file:

```bash
TAVILY_API_KEY=your_api_key_here
```

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test Web Search

Navigate to **Dashboard → Study Buddy** and try these queries:

**Current Events:**
- "What are the latest developments in AI?"
- "What's happening with climate change this year?"
- "Recent research on quantum computing"
- "What happened in the news today?"

**Specific Searches:**
- "Who won the latest Nobel Prize in Physics?"
- "What is the current Bitcoin price?"
- "Latest NASA discoveries"

**Should NOT Trigger Search** (document-specific):
- "Explain this document"
- "What does the PDF say about..."
- "In this chapter, what is..."

## Expected Behavior

### When Web Search Triggers

1. **Loading State**: You'll see "🔍 Searching the web..." with a pulsing globe icon
2. **AI Response**: Study Buddy will answer using current web data
3. **Citations**: At the end of the response, you'll see:
   ```
   ---

   **Sources:**
   [1] Article Title - https://example.com/article
   [2] Another Source - https://example.com/source
   [3] Third Source - https://example.com/third
   ```

### When Web Search Does NOT Trigger

- **Loading State**: Normal "Thinking..." with spinner
- **AI Response**: Uses Study Buddy's knowledge base (no web search)
- **No Citations**: Response based on training data

## Costs

**Tavily API Pricing:**
- Free Tier: **1,000 searches/month**
- Paid: **$0.01 per search** (100 searches = $1)

**Estimated Monthly Cost:**
- Light usage (100 searches): **FREE**
- Medium usage (500 searches): **FREE**
- Heavy usage (2,000 searches): **$10/month**

## Feature Flags

The web search feature is **optional** and controlled by environment variable:

- **Enabled**: Set `TAVILY_API_KEY` in `.env.local`
- **Disabled**: Omit or remove `TAVILY_API_KEY`

**Graceful Degradation:**
- If API key is missing → No web search, normal Study Buddy behavior
- If search fails → Logs error, continues without search results
- No user-facing errors, seamless fallback

## Technical Details

### Web Search Detection Heuristics

**Triggers search when query contains:**
- **Current Event Keywords**: "latest", "recent", "current", "today", "this week", "this month", "this year", "now", "currently", "2025", "2024", "new research", "breaking", "update"
- **Search Indicators**: "search", "look up", "find", "what is happening", "news about", "who won", "what happened", "when did", "where is"
- **Capability Questions** (demonstrates by searching): "can you search", "can you look up", "can you find", "do you have search", "are you able to search", "can you access the internet", "can you browse", "do you have internet access"

**Excludes search when query contains:**
- "document", "pdf", "in this", "explain this"

### Citation Format

Citations are automatically appended as:
```markdown
---

**Sources:**
[1] Title - URL
[2] Title - URL
[3] Title - URL
```

The AI will reference sources using `[1]`, `[2]`, etc. in its response.

## Troubleshooting

### Web Search Not Working

1. **Check API Key**: Verify `TAVILY_API_KEY` is in `.env.local`
2. **Restart Server**: Environment changes require server restart
3. **Check Logs**: Look for "Study Buddy performing web search" in terminal
4. **Test Query**: Use explicit keywords like "What are the latest..."

### Citations Not Appearing

- Citations only appear if web search is triggered
- Check loading indicator - should show "🔍 Searching the web..."
- Try more explicit current event queries

### Rate Limit Errors

- Free tier: 1,000 searches/month
- Upgrade to paid plan if needed
- Monitor usage in Tavily dashboard

## Future Enhancements

**Potential Improvements:**
- Custom search depth (advanced vs basic)
- Image search for visual questions
- Multi-turn search refinement
- User-controlled search toggle
- Search result caching to reduce API calls
- Search history tracking

## Files Modified

1. `lib/web-search.ts` - **NEW** (150 lines)
2. `.env.example` - Added TAVILY_API_KEY documentation
3. `app/api/study-buddy/chat/route.ts` - Added web search integration
4. `components/StudyBuddy/StudyBuddyInterface.tsx` - Added search indicator UI

## Summary

Study Buddy now intelligently searches the web when you ask about current events, recent research, or real-time information. The feature is optional, cost-effective, and includes visual feedback and source citations. It seamlessly integrates with existing functionality and degrades gracefully if the API is unavailable.

**Setup Time**: ~5 minutes (sign up + API key + env config)
**Cost**: Free for up to 1,000 searches/month
**User Experience**: Automatic, no manual triggers needed
