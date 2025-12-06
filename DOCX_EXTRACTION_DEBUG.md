# DOCX Extraction Debugging Guide

## Issue
The "Parent Handbook.docx" file uploaded successfully but has no extracted text (`extraction_method: "none"`).

## Changes Made

### 1. Enhanced Logging in `/api/documents/[id]/complete/route.ts`
Added detailed step-by-step logging for DOCX extraction:
- `📝 Extracting text from DOCX: [filename] (type: [mime-type])`
- `📥 Downloading from storage: [path]`
- `✅ Downloaded [size] bytes` or `❌ Failed to download...`
- `🔍 Parsing DOCX with mammoth...`
- `✅ DOCX text extracted: [chars] characters` or `❌ DOCX parsing error: [error]`

### 2. Specific Failure Tracking
The `extraction_method` field now captures specific failure reasons:
- `mammoth` - Success ✅
- `failed_download` - Supabase storage download failed
- `failed_no_blob` - No blob returned from storage
- `failed_parse` - Mammoth parsing returned an error
- `failed_empty` - Extracted text was empty
- `failed_exception` - Exception during extraction
- `none` - Condition didn't match (shouldn't happen for DOCX)

### 3. Better Error Messages in `/api/generate-flashcards/route.ts`
Now provides specific guidance based on extraction status:
- Extraction failed: "Text extraction failed for this document. Please try re-uploading the file, or use a different document format."
- Word document: "Unable to extract text from this Word document. The file may be corrupted or password-protected. Please try re-uploading or use a PDF instead."
- Background processing: "Document is still being processed. Text extraction is happening in the background - please wait a few moments and try again."

## Testing Steps

### Step 1: Delete Existing Document
1. Open the mobile app
2. Go to Learn tab
3. Delete the "Parent Handbook.docx" document

### Step 2: Re-upload with Logging
1. Make sure your terminal running `npm run dev` is visible
2. Upload "Parent Handbook.docx" again
3. Watch the terminal for detailed extraction logs
4. Look for the `📝 Extracting text from DOCX:` message and subsequent steps

### Step 3: Check Results
After upload completes, check:
1. **Terminal logs** - Should show extraction steps
2. **Document metadata** - Check `extraction_method` field:
   - `mammoth` = Success ✅
   - `failed_*` = Specific failure reason
3. **Flashcard generation** - Try generating flashcards to see improved error message

## Expected Outcomes

### Success Case
Terminal logs:
```
📝 Extracting text from DOCX: Parent Handbook.docx (type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
📥 Downloading from storage: 2/[timestamp]-Parent_Handbook.docx
✅ Downloaded 326193 bytes
🔍 Parsing DOCX with mammoth...
✅ DOCX text extracted: [X] characters
```

Metadata:
```json
"metadata": {
  "extraction_method": "mammoth",
  "has_extracted_text": true,
  "text_length": [number]
}
```

### Failure Cases

**Download Failure:**
```
❌ Failed to download DOCX from storage: [error details]
```
→ `extraction_method: "failed_download"`

**Parsing Failure:**
```
❌ DOCX parsing error: [error details]
```
→ `extraction_method: "failed_parse"`

**Empty Text:**
```
❌ DOCX extracted empty text
```
→ `extraction_method: "failed_empty"`

## Common Issues & Solutions

### Issue: No logs appear
**Cause**: Route not being called
**Solution**: Check mobile app upload flow is calling `/api/documents/[id]/complete`

### Issue: Download fails (failed_download)
**Cause**: Supabase storage permissions or path issues
**Solution**: Check Supabase storage bucket permissions and verify `storage_path` is correct

### Issue: Parsing fails (failed_parse)
**Cause**: Corrupted DOCX, password protection, or mammoth compatibility
**Solution**: Try opening the file in Word and re-saving, or convert to PDF

### Issue: Empty text (failed_empty)
**Cause**: Document contains only images/tables, or encoding issues
**Solution**: Verify document has actual text content, try converting to PDF

## Next Steps

If extraction still fails after re-upload:
1. Share the terminal logs showing the extraction steps
2. Check the document metadata `extraction_method` field
3. Try the same document as PDF to verify it has text content
4. Check if the file is password-protected or corrupted

The enhanced logging will pinpoint exactly where the extraction is failing.
