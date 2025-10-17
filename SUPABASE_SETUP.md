# Supabase Database Setup Instructions

This guide will help you set up the Supabase database schema required for the document management system.

## Prerequisites

- Supabase project already created (URL and keys in `.env.local`)
- Access to Supabase Dashboard

## Setup Steps

### 1. Create Documents Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/001_create_documents_schema.sql`
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. You should see: **Success. No rows returned**

### 2. Create Storage Bucket

1. In Supabase Dashboard, click on **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: **OFF** (keep it private)
   - Click **Save**

### 3. Set Up Storage Policies

After creating the bucket, you need to add policies for user access:

1. Click on the `documents` bucket
2. Click on **Policies** tab
3. Click **New Policy**

#### Policy 1: Upload Documents
- **Policy Name**: `Users can upload their own documents`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'documents'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 2: Read Documents
- **Policy Name**: `Users can read their own documents`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'documents'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 3: Delete Documents
- **Policy Name**: `Users can delete their own documents`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'documents'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

### 4. Verify Database Schema

Run this query in the SQL Editor to verify the table was created:

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'documents';
```

You should see one row with the `documents` table.

### 5. Test the Connection

1. Start your development server: `npm run dev`
2. Navigate to `/dashboard/documents` in your browser
3. You should see "No documents yet" instead of an error
4. Try uploading a document through the Flashcard or Chat mode
5. The document should appear in the Documents page

## Troubleshooting

### Error: "Failed to fetch documents"

**Possible causes:**
1. Database table not created
2. RLS policies preventing access
3. Incorrect Supabase credentials

**Solution:**
1. Check that the `documents` table exists in Supabase Dashboard
2. Verify RLS policies are set up correctly
3. Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: "Failed to upload file"

**Possible causes:**
1. Storage bucket not created
2. Missing storage policies
3. File size limits

**Solution:**
1. Verify `documents` bucket exists in Storage
2. Check all three storage policies are created
3. Check file size limits in Supabase project settings

### Error: "column documents.user_id does not exist"

**Solution:**
Run the migration SQL again - the table wasn't created properly

## Database Schema

The `documents` table structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Clerk user ID from JWT |
| file_name | TEXT | Original filename |
| file_type | TEXT | MIME type (e.g., application/pdf) |
| file_size | BIGINT | File size in bytes |
| extracted_text | TEXT | Extracted text content |
| document_summary | TEXT | Optional AI summary |
| storage_path | TEXT | Path in Supabase Storage |
| processing_status | TEXT | pending/processing/completed/failed |
| error_message | TEXT | Error message if failed |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Next Steps

After setup is complete:
1. Upload a document via Chat or Flashcard mode
2. Visit `/dashboard/documents` to see your documents
3. Click on a document to select a learning mode
4. Documents persist across sessions

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Check browser console for errors
3. Check server logs (terminal running `npm run dev`)
4. Verify all environment variables are set correctly
