# Debugging Stuck PDF Files

## Symptoms
- Files upload successfully to Supabase Storage
- Status shows "Processing..." indefinitely
- Files never complete processing

## Root Cause (Most Likely)
The Inngest function had an invalid timeout configuration (900s) that exceeded Vercel's limit (300s). This caused the function to timeout mid-execution, leaving documents stuck in "processing" status.

## Quick Checks

### 1. Check if Inngest Dev Server is Running
```bash
curl http://localhost:8288
```
**Expected:** HTML response from Inngest dashboard
**If failed:** Inngest not running - start it with `npx inngest-cli@latest dev`

### 2. Check Inngest Dashboard
```bash
open http://localhost:8288
```
- Navigate to "Runs" tab
- Filter by function: "process-pdf-document"
- Look for:
  - ❌ **Failed** runs (red) - indicates processing errors
  - ⏱️ **Running** runs (blue, older than 5 minutes) - indicates stuck jobs
  - ⏰ **Timeout** errors - indicates function exceeded 5-minute limit

### 3. Query Database for Stuck Documents
Connect to your Supabase database and run:

```sql
SELECT
  id,
  file_name,
  file_size,
  processing_status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck
FROM documents
WHERE processing_status = 'processing'
ORDER BY created_at DESC;
```

**What to look for:**
- Documents stuck for >5 minutes
- Large files (>10MB) that never completed
- Check the `minutes_stuck` column

## Solutions

### A. Restart Services with Fixed Configuration
1. **Stop current dev server** (Ctrl+C in terminal running `npm run dev`)
2. **Restart Next.js dev server:**
   ```bash
   npm run dev
   ```
3. **Ensure Inngest is running** (in separate terminal):
   ```bash
   npx inngest-cli@latest dev
   ```
   Dashboard should open at: http://localhost:8288

### B. Test with New Upload
1. Upload a 19MB PDF through the UI
2. Watch the Inngest dashboard (http://localhost:8288) in real-time
3. Check "Runs" tab for the new "document/process" event
4. **Expected behavior:**
   - Status: "Running" (should complete within 2-5 minutes)
   - Steps visible: "update-status-processing" → "extract-pdf-text" → "rag-index" → "update-results"
   - Final status: "Completed" (green checkmark)

### C. Fix Stuck Documents (Manual Recovery)
If you have documents stuck in "processing" status, you can manually fix them:

**Option 1: Re-trigger Processing**
```sql
-- Reset status to 'pending' to allow re-processing
UPDATE documents
SET processing_status = 'pending',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{manual_reset_at}',
      to_jsonb(NOW()::text)
    )
WHERE processing_status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

Then call the `/api/documents/{id}/complete` endpoint again for each document.

**Option 2: Mark as Failed (Requires Re-upload)**
```sql
-- Mark stuck documents as failed
UPDATE documents
SET processing_status = 'failed',
    error_message = 'Processing timeout - please re-upload',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{marked_failed_at}',
      to_jsonb(NOW()::text)
    )
WHERE processing_status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

Users will need to delete and re-upload these files.

## Verification

### After Restart, Verify Configuration:
```bash
# Check that dev server is running
curl http://localhost:3000

# Check that Inngest is running
curl http://localhost:8288

# Check ChromaDB is running (required for large files)
curl http://localhost:8000/api/v1/heartbeat
```

### Test Processing Pipeline:
1. Upload a small PDF (<5MB) - should complete in ~5-30 seconds
2. Upload a medium PDF (19MB) - should complete in ~2-5 minutes
3. Monitor Inngest dashboard during processing
4. Check document status in UI

## Expected Processing Times (After Fix)

| File Size | Processing Time | Method |
|-----------|----------------|---------|
| <5MB | 5-30 seconds | Synchronous (immediate) |
| 5-20MB | 1-3 minutes | Async (Inngest) |
| 20-50MB | 2-5 minutes | Async (Inngest) |
| 50-100MB | 3-5 minutes | Async (Inngest) |
| >100MB | 5-10 minutes | Async (Inngest) with potential timeout |

**Note:** Files >50MB may still timeout on Vercel with the 5-minute limit. For production, you'll need either:
- Chained multi-step jobs (split processing into smaller chunks)
- Self-hosted Inngest with longer timeouts
- External processing service (Lambda, Cloud Run)

## Production Deployment Considerations

### For Vercel Deployment:
1. **Inngest Cloud** (required):
   - Sign up at https://www.inngest.com/
   - Free tier: 50,000 events/month
   - Update `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` in Vercel environment variables

2. **Hosted ChromaDB** (required for RAG):
   - Option A: Chroma Cloud (https://www.trychroma.com/)
   - Option B: Self-host on Railway, Render, or fly.io (~$5-15/month)
   - Update `CHROMA_URL` in Vercel environment variables

3. **Longer Timeout Strategy**:
   - Consider splitting 100MB+ files into multiple jobs
   - Each job processes a chunk (e.g., 100 pages at a time)
   - Final job combines results
   - This keeps each function under 5-minute limit

### Alternative: Self-Hosted Deployment
If you need to process very large files (>100MB) reliably:
- Deploy to AWS Lambda (15-minute limit) or Cloud Run (60-minute limit)
- Use self-hosted Inngest with `maxDuration: 1800` (30 minutes)
- No Vercel timeout constraints

## Common Issues

### Issue: "Job never appears in Inngest dashboard"
**Cause:** Inngest dev server not running or not connected
**Solution:**
```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Inngest (MUST be running)
npx inngest-cli@latest dev
```

### Issue: "Job fails with 'output_too_large' error"
**Cause:** Trying to return large text from Inngest step
**Solution:** Already fixed - text is now saved directly to database in step 2, not returned

### Issue: "Job times out at 5 minutes exactly"
**Cause:** Vercel function limit (maxDuration: 300s)
**Solution:** For 50-100MB files, this may still happen. Consider:
- Splitting extraction into page-based chunks
- Processing in multiple chained jobs
- Using external processing service

### Issue: "ChromaDB connection failed (non-fatal)"
**Cause:** ChromaDB not running
**Solution:**
```bash
docker run -d -p 8000:8000 --name chromadb chromadb/chroma
```
**Impact:** Non-fatal - document completes but without RAG indexing. Chat/flashcards may not work optimally.

## Next Steps

1. ✅ **Restart services** with fixed configuration
2. ✅ **Test with 19MB file** to verify processing completes
3. ✅ **Monitor Inngest dashboard** during processing
4. ⚠️ **Test with 50-100MB files** - may need additional optimization
5. 📚 **Plan production infrastructure** (Inngest Cloud, hosted ChromaDB)

## Questions?

If files are still getting stuck after these fixes:
1. Check Inngest dashboard for specific error messages
2. Check server logs for errors: `tail -f .next/server.log`
3. Share the specific error from Inngest "Runs" tab
